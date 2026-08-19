using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ScoreHistory.Api.Auth;
using ScoreHistory.Api.Data;
using ScoreHistory.Api.Models;

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
        string? Notes);

    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<OpponentResponse>>> List(CancellationToken cancellationToken)
    {
        var userId = CurrentUser.GetId(User);
        if (userId is null)
        {
            return Unauthorized();
        }

        var opponents = await db.Opponents
            .Where(opponent => opponent.UserId == userId)
            .OrderBy(opponent => opponent.Name)
            .Select(opponent => ToResponse(opponent))
            .ToListAsync(cancellationToken);

        return Ok(opponents);
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

    private static OpponentResponse ToResponse(Opponent opponent) =>
        new(opponent.Id, opponent.Name, opponent.Handedness, opponent.Strengths, opponent.Weaknesses, opponent.Notes);

    private static string? TrimToNull(string? value) =>
        string.IsNullOrWhiteSpace(value) ? null : value.Trim();
}
