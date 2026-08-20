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
[Route("api/matches")]
public sealed class MatchesController(AppDbContext db) : ControllerBase
{
    private static readonly HashSet<string> CourtTypes =
    [
        "Saibro",
        "Rápida",
        "Grama"
    ];

    public sealed record MatchRequest(
        Guid OpponentId,
        string Score,
        bool Won,
        string CourtType,
        DateTime? PlayedAt,
        string? Notes,
        string? Strengths,
        string? Weaknesses,
        string? OpponentStrengths,
        string? OpponentWeaknesses);

    public sealed record MatchResponse(
        Guid Id,
        Guid OpponentId,
        string OpponentName,
        string OpponentHandedness,
        DateTime PlayedAt,
        string Score,
        bool Won,
        string CourtType,
        string? Notes,
        string? Strengths,
        string? Weaknesses,
        string? OpponentStrengths,
        string? OpponentWeaknesses);

    [HttpGet]
    public async Task<ActionResult<PagedResult<MatchResponse>>> List(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = PageQuery.DefaultPageSize,
        [FromQuery] string? filter = null,
        CancellationToken cancellationToken = default)
    {
        var userId = CurrentUser.GetId(User);
        if (userId is null)
        {
            return Unauthorized();
        }

        var (resolvedPage, resolvedPageSize) = PageQuery.Normalize(page, pageSize);
        var query = db.Matches
            .Include(match => match.Opponent)
            .Where(match => match.UserId == userId);

        if (string.Equals(filter, "wins", StringComparison.OrdinalIgnoreCase))
        {
            query = query.Where(match => match.Won);
        }
        else if (string.Equals(filter, "losses", StringComparison.OrdinalIgnoreCase))
        {
            query = query.Where(match => !match.Won);
        }

        query = query.OrderByDescending(match => match.PlayedAt);
        var totalCount = await query.CountAsync(cancellationToken);
        var matches = await query
            .Skip((resolvedPage - 1) * resolvedPageSize)
            .Take(resolvedPageSize)
            .ToListAsync(cancellationToken);

        return Ok(new PagedResult<MatchResponse>(
            matches.Select(ToResponse).ToList(),
            resolvedPage,
            resolvedPageSize,
            totalCount));
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<MatchResponse>> Get(Guid id, CancellationToken cancellationToken)
    {
        var userId = CurrentUser.GetId(User);
        if (userId is null)
        {
            return Unauthorized();
        }

        var match = await db.Matches
            .Include(item => item.Opponent)
            .FirstOrDefaultAsync(item => item.Id == id && item.UserId == userId, cancellationToken);
        if (match is null)
        {
            return NotFound(new { message = "Partida não encontrada." });
        }

        return Ok(ToResponse(match));
    }

    [HttpPost]
    public async Task<ActionResult<MatchResponse>> Create(
        [FromBody] MatchRequest request,
        CancellationToken cancellationToken)
    {
        var userId = CurrentUser.GetId(User);
        if (userId is null)
        {
            return Unauthorized();
        }

        if (string.IsNullOrWhiteSpace(request.Score))
        {
            return BadRequest(new { message = "Informe o placar." });
        }

        if (!CourtTypes.Contains(request.CourtType))
        {
            return BadRequest(new { message = "Tipo de quadra inválido." });
        }

        var opponent = await db.Opponents.FirstOrDefaultAsync(
            item => item.Id == request.OpponentId && item.UserId == userId,
            cancellationToken);
        if (opponent is null)
        {
            return BadRequest(new { message = "Adversário não encontrado." });
        }

        var match = new Match
        {
            UserId = userId.Value,
            OpponentId = opponent.Id,
            Opponent = opponent,
            Score = request.Score.Trim(),
            Won = request.Won,
            CourtType = request.CourtType,
            PlayedAt = request.PlayedAt?.ToUniversalTime() ?? DateTime.UtcNow,
            Notes = TrimToNull(request.Notes),
            Strengths = TrimToNull(request.Strengths),
            Weaknesses = TrimToNull(request.Weaknesses),
            OpponentStrengths = TrimToNull(request.OpponentStrengths),
            OpponentWeaknesses = TrimToNull(request.OpponentWeaknesses)
        };

        db.Matches.Add(match);
        await db.SaveChangesAsync(cancellationToken);
        return Created($"/api/matches/{match.Id}", ToResponse(match));
    }

    [HttpPut("{id:guid}")]
    public async Task<ActionResult<MatchResponse>> Update(
        Guid id,
        [FromBody] MatchRequest request,
        CancellationToken cancellationToken)
    {
        var userId = CurrentUser.GetId(User);
        if (userId is null)
        {
            return Unauthorized();
        }

        var match = await db.Matches
            .Include(item => item.Opponent)
            .FirstOrDefaultAsync(item => item.Id == id && item.UserId == userId, cancellationToken);
        if (match is null)
        {
            return NotFound(new { message = "Partida não encontrada." });
        }

        if (string.IsNullOrWhiteSpace(request.Score))
        {
            return BadRequest(new { message = "Informe o placar." });
        }

        if (!CourtTypes.Contains(request.CourtType))
        {
            return BadRequest(new { message = "Tipo de quadra inválido." });
        }

        var opponent = await db.Opponents.FirstOrDefaultAsync(
            item => item.Id == request.OpponentId && item.UserId == userId,
            cancellationToken);
        if (opponent is null)
        {
            return BadRequest(new { message = "Adversário não encontrado." });
        }

        match.OpponentId = opponent.Id;
        match.Opponent = opponent;
        match.Score = request.Score.Trim();
        match.Won = request.Won;
        match.CourtType = request.CourtType;
        match.PlayedAt = request.PlayedAt?.ToUniversalTime() ?? match.PlayedAt;
        match.Notes = TrimToNull(request.Notes);
        match.Strengths = TrimToNull(request.Strengths);
        match.Weaknesses = TrimToNull(request.Weaknesses);
        match.OpponentStrengths = TrimToNull(request.OpponentStrengths);
        match.OpponentWeaknesses = TrimToNull(request.OpponentWeaknesses);

        await db.SaveChangesAsync(cancellationToken);
        return Ok(ToResponse(match));
    }

    private static MatchResponse ToResponse(Match match) =>
        new(
            match.Id,
            match.OpponentId,
            match.Opponent?.Name ?? "Adversário",
            match.Opponent?.Handedness ?? "Destro",
            match.PlayedAt,
            match.Score,
            match.Won,
            match.CourtType,
            match.Notes,
            match.Strengths,
            match.Weaknesses,
            match.OpponentStrengths,
            match.OpponentWeaknesses);

    private static string? TrimToNull(string? value) =>
        string.IsNullOrWhiteSpace(value) ? null : value.Trim();
}
