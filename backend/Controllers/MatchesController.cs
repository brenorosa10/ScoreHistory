using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ScoreHistory.Api.Auth;
using ScoreHistory.Api.Data;
using ScoreHistory.Api.Models;
using ScoreHistory.Api.Paging;
using ScoreHistory.Api.Services;

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
        bool? Won,
        string? CourtType,
        DateTime? PlayedAt,
        string? Notes,
        string? Strengths,
        string? Weaknesses,
        string? OpponentStrengths,
        string? OpponentWeaknesses,
        string? Sport,
        string? PartnerName,
        string? SecondOpponentName);

    public sealed record MatchResponse(
        Guid Id,
        Guid OpponentId,
        string OpponentName,
        string OpponentHandedness,
        string? OpponentClass,
        DateTime PlayedAt,
        string Score,
        bool? Won,
        string CourtType,
        string? Notes,
        string? Strengths,
        string? Weaknesses,
        string? OpponentStrengths,
        string? OpponentWeaknesses,
        string Sport,
        string? PartnerName,
        string? SecondOpponentName,
        IReadOnlyList<string> OpponentSports);

    [HttpGet]
    public async Task<ActionResult<PagedResult<MatchResponse>>> List(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = PageQuery.DefaultPageSize,
        [FromQuery] string? filter = null,
        [FromQuery] Guid? opponentId = null,
        [FromQuery] string? sport = null,
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

        if (opponentId is not null)
        {
            query = query.Where(match => match.OpponentId == opponentId);
        }

        var sportFilter = Sports.Normalize(sport);
        if (!string.IsNullOrWhiteSpace(sport) && sportFilter is null)
        {
            return BadRequest(new { message = "Esporte inválido." });
        }

        if (sportFilter is not null)
        {
            query = query.Where(match => match.Sport == sportFilter);
        }

        if (string.Equals(filter, "wins", StringComparison.OrdinalIgnoreCase))
        {
            query = query.Where(match => match.Won == true);
        }
        else if (string.Equals(filter, "losses", StringComparison.OrdinalIgnoreCase))
        {
            query = query.Where(match => match.Won == false);
        }
        else if (string.Equals(filter, "draws", StringComparison.OrdinalIgnoreCase))
        {
            query = query.Where(match => match.Won == null);
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

        var prepared = await PrepareAsync(userId.Value, request, cancellationToken);
        if (prepared.Error is not null)
        {
            return BadRequest(new { message = prepared.Error });
        }

        var opponent = prepared.Opponent!;
        var match = new Match
        {
            UserId = userId.Value,
            OpponentId = opponent.Id,
            Opponent = opponent,
            Score = request.Score.Trim(),
            Won = request.Won,
            CourtType = prepared.CourtType!,
            Sport = prepared.Sport!,
            PartnerName = prepared.PartnerName,
            SecondOpponentName = prepared.SecondOpponentName,
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

        var prepared = await PrepareAsync(userId.Value, request, cancellationToken);
        if (prepared.Error is not null)
        {
            return BadRequest(new { message = prepared.Error });
        }

        var opponent = prepared.Opponent!;
        match.OpponentId = opponent.Id;
        match.Opponent = opponent;
        match.Score = request.Score.Trim();
        match.Won = request.Won;
        match.CourtType = prepared.CourtType!;
        match.Sport = prepared.Sport!;
        match.PartnerName = prepared.PartnerName;
        match.SecondOpponentName = prepared.SecondOpponentName;
        match.PlayedAt = request.PlayedAt?.ToUniversalTime() ?? match.PlayedAt;
        match.Notes = TrimToNull(request.Notes);
        match.Strengths = TrimToNull(request.Strengths);
        match.Weaknesses = TrimToNull(request.Weaknesses);
        match.OpponentStrengths = TrimToNull(request.OpponentStrengths);
        match.OpponentWeaknesses = TrimToNull(request.OpponentWeaknesses);

        await db.SaveChangesAsync(cancellationToken);
        return Ok(ToResponse(match));
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken cancellationToken)
    {
        var userId = CurrentUser.GetId(User);
        if (userId is null)
        {
            return Unauthorized();
        }

        var match = await db.Matches.FirstOrDefaultAsync(
            item => item.Id == id && item.UserId == userId,
            cancellationToken);
        if (match is null)
        {
            return NotFound(new { message = "Partida não encontrada." });
        }

        db.Matches.Remove(match);
        await db.SaveChangesAsync(cancellationToken);
        return NoContent();
    }

    private async Task<(Opponent? Opponent, string? Sport, string? CourtType, string? PartnerName, string? SecondOpponentName, string? Error)> PrepareAsync(
        Guid userId,
        MatchRequest request,
        CancellationToken cancellationToken)
    {
        var sport = string.IsNullOrWhiteSpace(request.Sport) ? Sports.Tennis : Sports.Normalize(request.Sport);
        if (sport is null)
        {
            return (null, null, null, null, null, "Esporte inválido.");
        }

        var user = await db.Users.FirstOrDefaultAsync(item => item.Id == userId, cancellationToken);
        if (user is not null && !Sports.Contains(user.Sports, sport))
        {
            return (null, null, null, null, null, "Esse esporte não está no seu perfil.");
        }

        var scoreError = ScoreRules.Validate(request.Score, request.Won, sport);
        if (scoreError is not null)
        {
            return (null, null, null, null, null, scoreError);
        }

        string courtType;
        if (Sports.CourtApplies(sport))
        {
            if (request.CourtType is null || !CourtTypes.Contains(request.CourtType))
            {
                return (null, null, null, null, null, "Tipo de quadra inválido.");
            }

            courtType = request.CourtType;
        }
        else
        {
            courtType = "";
        }

        var opponent = await db.Opponents.FirstOrDefaultAsync(
            item => item.Id == request.OpponentId && item.UserId == userId,
            cancellationToken);
        if (opponent is null)
        {
            return (null, null, null, null, null, "Adversário não encontrado.");
        }

        if (!Sports.Contains(opponent.Sports, sport))
        {
            opponent.Sports = Sports.Add(opponent.Sports, sport);
        }

        var partner = Sports.IsDoublesSport(sport) ? TrimToNull(request.PartnerName) : null;
        var second = Sports.IsDoublesSport(sport) ? TrimToNull(request.SecondOpponentName) : null;
        return (opponent, sport, courtType, partner, second, null);
    }

    private static MatchResponse ToResponse(Match match) =>
        new(
            match.Id,
            match.OpponentId,
            match.Opponent?.Name ?? "Adversário",
            match.Opponent?.Handedness ?? "Destro",
            match.Opponent?.Class,
            match.PlayedAt,
            match.Score,
            match.Won,
            match.CourtType,
            match.Notes,
            match.Strengths,
            match.Weaknesses,
            match.OpponentStrengths,
            match.OpponentWeaknesses,
            string.IsNullOrWhiteSpace(match.Sport) ? Sports.Tennis : match.Sport,
            match.PartnerName,
            match.SecondOpponentName,
            Sports.Parse(match.Opponent?.Sports));

    private static string? TrimToNull(string? value) =>
        string.IsNullOrWhiteSpace(value) ? null : value.Trim();
}
