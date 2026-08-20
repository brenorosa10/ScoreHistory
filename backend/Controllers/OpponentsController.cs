using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ScoreHistory.Api.Auth;
using ScoreHistory.Api.Data;
using ScoreHistory.Api.Models;
using ScoreHistory.Api.Paging;

namespace ScoreHistory.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/opponents")]
public sealed class OpponentsController(AppDbContext db) : ControllerBase
{
    public sealed record OpponentRequest(
        string Name,
        string Handedness,
        string? Strengths,
        string? Weaknesses,
        string? Notes);

    public sealed record OpponentResponse(
        Guid Id,
        string Name,
        string Handedness,
        string? Strengths,
        string? Weaknesses,
        string? Notes,
        int Played,
        int Wins);

    [HttpGet]
    public async Task<ActionResult<PagedResult<OpponentResponse>>> List(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = PageQuery.DefaultPageSize,
        [FromQuery] string? search = null,
        CancellationToken cancellationToken = default)
    {
        var userId = CurrentUser.GetId(User);
        if (userId is null)
        {
            return Unauthorized();
        }

        var userIdValue = userId.Value;
        var (resolvedPage, resolvedPageSize) = PageQuery.Normalize(page, pageSize);
        var query = db.Opponents.Where(opponent => opponent.UserId == userIdValue);

        if (!string.IsNullOrWhiteSpace(search))
        {
            var term = search.Trim().ToLower();
            query = query.Where(opponent => opponent.Name.ToLower().Contains(term));
        }

        query = query.OrderBy(opponent => opponent.Name);
        var totalCount = await query.CountAsync(cancellationToken);
        var opponents = await query
            .Skip((resolvedPage - 1) * resolvedPageSize)
            .Take(resolvedPageSize)
            .Select(opponent => new OpponentResponse(
                opponent.Id,
                opponent.Name,
                opponent.Handedness,
                opponent.Strengths,
                opponent.Weaknesses,
                opponent.Notes,
                db.Matches.Count(match => match.OpponentId == opponent.Id && match.UserId == userIdValue),
                db.Matches.Count(match => match.OpponentId == opponent.Id && match.UserId == userIdValue && match.Won)))
            .ToListAsync(cancellationToken);

        return Ok(new PagedResult<OpponentResponse>(opponents, resolvedPage, resolvedPageSize, totalCount));
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<OpponentResponse>> Get(Guid id, CancellationToken cancellationToken)
    {
        var userId = CurrentUser.GetId(User);
        if (userId is null)
        {
            return Unauthorized();
        }

        var opponent = await db.Opponents.FirstOrDefaultAsync(
            item => item.Id == id && item.UserId == userId,
            cancellationToken);
        if (opponent is null)
        {
            return NotFound(new { message = "Adversário não encontrado." });
        }

        return Ok(ToResponse(opponent));
    }

    [HttpPost]
    public async Task<ActionResult<OpponentResponse>> Create(
        [FromBody] OpponentRequest request,
        CancellationToken cancellationToken)
    {
        var userId = CurrentUser.GetId(User);
        if (userId is null)
        {
            return Unauthorized();
        }

        if (string.IsNullOrWhiteSpace(request.Name))
        {
            return BadRequest(new { message = "O nome é obrigatório." });
        }

        if (request.Handedness is not ("Destro" or "Canhoto"))
        {
            return BadRequest(new { message = "Informe se o adversário é canhoto ou destro." });
        }

        var opponent = new Opponent
        {
            UserId = userId.Value,
            Name = request.Name.Trim(),
            Handedness = request.Handedness,
            Strengths = TrimToNull(request.Strengths),
            Weaknesses = TrimToNull(request.Weaknesses),
            Notes = TrimToNull(request.Notes)
        };

        db.Opponents.Add(opponent);
        await db.SaveChangesAsync(cancellationToken);
        return Created($"/api/opponents/{opponent.Id}", ToResponse(opponent));
    }

    [HttpPut("{id:guid}")]
    public async Task<ActionResult<OpponentResponse>> Update(
        Guid id,
        [FromBody] OpponentRequest request,
        CancellationToken cancellationToken)
    {
        var userId = CurrentUser.GetId(User);
        if (userId is null)
        {
            return Unauthorized();
        }

        var opponent = await db.Opponents.FirstOrDefaultAsync(
            item => item.Id == id && item.UserId == userId,
            cancellationToken);
        if (opponent is null)
        {
            return NotFound(new { message = "Adversário não encontrado." });
        }

        if (string.IsNullOrWhiteSpace(request.Name))
        {
            return BadRequest(new { message = "O nome é obrigatório." });
        }

        if (request.Handedness is not ("Destro" or "Canhoto"))
        {
            return BadRequest(new { message = "Informe se o adversário é canhoto ou destro." });
        }

        opponent.Name = request.Name.Trim();
        opponent.Handedness = request.Handedness;
        opponent.Strengths = TrimToNull(request.Strengths);
        opponent.Weaknesses = TrimToNull(request.Weaknesses);
        opponent.Notes = TrimToNull(request.Notes);

        await db.SaveChangesAsync(cancellationToken);
        return Ok(ToResponse(opponent));
    }

    private static OpponentResponse ToResponse(Opponent opponent, int played = 0, int wins = 0) =>
        new(opponent.Id, opponent.Name, opponent.Handedness, opponent.Strengths, opponent.Weaknesses, opponent.Notes, played, wins);

    private static string? TrimToNull(string? value) =>
        string.IsNullOrWhiteSpace(value) ? null : value.Trim();
}
