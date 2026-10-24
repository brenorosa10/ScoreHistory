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
[Route("api/opponents")]
public sealed class OpponentsController(AppDbContext db) : ControllerBase
{
    private static readonly HashSet<string> Classes =
    [
        "1ª classe",
        "2ª classe",
        "3ª classe",
        "4ª classe",
        "5ª classe",
        "6ª classe",
        "40B",
        "40A",
        "50A",
        "50B"
    ];

    public sealed record SportStat(string Sport, int Played, int Wins, int Losses, int Draws);

    public sealed record OpponentRequest(
        string Name,
        string Handedness,
        string? Class,
        string? Strengths,
        string? Weaknesses,
        string? Notes,
        IReadOnlyList<string>? Sports);

    public sealed record OpponentResponse(
        Guid Id,
        string Name,
        string Handedness,
        string? Class,
        string? Strengths,
        string? Weaknesses,
        string? Notes,
        int Played,
        int Wins,
        int Losses,
        int Draws,
        IReadOnlyList<string> Sports,
        IReadOnlyList<SportStat> SportStats);

    [HttpGet]
    public async Task<ActionResult<PagedResult<OpponentResponse>>> List(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = PageQuery.DefaultPageSize,
        [FromQuery] string? search = null,
        [FromQuery] string? sport = null,
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

        var sportFilter = Sports.Normalize(sport);
        if (!string.IsNullOrWhiteSpace(sport) && sportFilter is null)
        {
            return BadRequest(new { message = "Esporte inválido." });
        }

        if (!string.IsNullOrWhiteSpace(search))
        {
            var term = search.Trim().ToLower();
            query = query.Where(opponent => opponent.Name.ToLower().Contains(term));
        }

        if (sportFilter is not null)
        {
            var token = "," + sportFilter + ",";
            query = query.Where(opponent => opponent.Sports.Contains(token));
        }

        query = query.OrderBy(opponent => opponent.Name);
        var totalCount = await query.CountAsync(cancellationToken);
        var rows = await query
            .Skip((resolvedPage - 1) * resolvedPageSize)
            .Take(resolvedPageSize)
            .Select(opponent => new
            {
                opponent.Id,
                opponent.Name,
                opponent.Handedness,
                opponent.Class,
                opponent.Strengths,
                opponent.Weaknesses,
                opponent.Notes,
                opponent.Sports,
                Played = db.Matches.Count(match => match.OpponentId == opponent.Id && match.UserId == userIdValue && (sportFilter == null || match.Sport == sportFilter)),
                Wins = db.Matches.Count(match => match.OpponentId == opponent.Id && match.UserId == userIdValue && match.Won == true && (sportFilter == null || match.Sport == sportFilter)),
                Losses = db.Matches.Count(match => match.OpponentId == opponent.Id && match.UserId == userIdValue && match.Won == false && (sportFilter == null || match.Sport == sportFilter)),
                Draws = db.Matches.Count(match => match.OpponentId == opponent.Id && match.UserId == userIdValue && match.Won == null && (sportFilter == null || match.Sport == sportFilter))
            })
            .ToListAsync(cancellationToken);
        var opponents = rows.Select(opponent => new OpponentResponse(
            opponent.Id,
            opponent.Name,
            opponent.Handedness,
            opponent.Class,
            opponent.Strengths,
            opponent.Weaknesses,
            opponent.Notes,
            opponent.Played,
            opponent.Wins,
            opponent.Losses,
            opponent.Draws,
            Sports.Parse(opponent.Sports),
            [])).ToList();

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

        var userIdValue = userId.Value;
        var played = await db.Matches.CountAsync(
            match => match.OpponentId == opponent.Id && match.UserId == userIdValue,
            cancellationToken);
        var wins = await db.Matches.CountAsync(
            match => match.OpponentId == opponent.Id && match.UserId == userIdValue && match.Won == true,
            cancellationToken);
        var losses = await db.Matches.CountAsync(
            match => match.OpponentId == opponent.Id && match.UserId == userIdValue && match.Won == false,
            cancellationToken);
        var draws = await db.Matches.CountAsync(
            match => match.OpponentId == opponent.Id && match.UserId == userIdValue && match.Won == null,
            cancellationToken);

        var stats = await SportStatsAsync(userIdValue, opponent.Id, cancellationToken);
        return Ok(ToResponse(opponent, played, wins, losses, draws, stats));
    }

    [HttpGet("lookup")]
    public async Task<ActionResult<OpponentResponse>> Lookup(
        [FromQuery] string? name,
        [FromQuery] Guid? exceptId,
        CancellationToken cancellationToken)
    {
        var userId = CurrentUser.GetId(User);
        if (userId is null)
        {
            return Unauthorized();
        }

        var normalized = NormalizeName(name);
        if (normalized.Length == 0)
        {
            return NoContent();
        }

        var userIdValue = userId.Value;
        var opponents = await db.Opponents
            .Where(opponent => opponent.UserId == userIdValue)
            .ToListAsync(cancellationToken);
        var duplicate = opponents.FirstOrDefault(opponent =>
            opponent.Id != exceptId && NormalizeName(opponent.Name) == normalized);
        if (duplicate is null)
        {
            return NoContent();
        }

        return Ok(ToResponse(duplicate));
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

        if (!IsValidClass(request.Class))
        {
            return BadRequest(new { message = "Informe a classe do adversário." });
        }

        var sports = await ResolveSportsAsync(userId.Value, request.Sports, cancellationToken);
        if (sports.Error is not null)
        {
            return BadRequest(new { message = sports.Error });
        }

        var opponent = new Opponent
        {
            UserId = userId.Value,
            Name = request.Name.Trim(),
            Handedness = request.Handedness,
            Class = request.Class!.Trim(),
            Strengths = TrimToNull(request.Strengths),
            Weaknesses = TrimToNull(request.Weaknesses),
            Notes = TrimToNull(request.Notes),
            Sports = sports.Stored!
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

        if (!IsValidClass(request.Class))
        {
            return BadRequest(new { message = "Informe a classe do adversário." });
        }

        opponent.Name = request.Name.Trim();
        opponent.Handedness = request.Handedness;
        opponent.Class = request.Class!.Trim();
        opponent.Strengths = TrimToNull(request.Strengths);
        opponent.Weaknesses = TrimToNull(request.Weaknesses);
        opponent.Notes = TrimToNull(request.Notes);
        var sports = ResolveExplicitSports(request.Sports);
        if (sports.Error is not null)
        {
            return BadRequest(new { message = sports.Error });
        }

        if (sports.Stored is not null)
        {
            opponent.Sports = sports.Stored;
        }

        await db.SaveChangesAsync(cancellationToken);
        return Ok(ToResponse(opponent));
    }

    private async Task<(string? Stored, string? Error)> ResolveSportsAsync(
        Guid userId,
        IReadOnlyList<string>? requested,
        CancellationToken cancellationToken)
    {
        if (requested is null)
        {
            var user = await db.Users.FirstOrDefaultAsync(item => item.Id == userId, cancellationToken);
            var fallback = user is null ? [Sports.Tennis] : Sports.Parse(user.Sports);
            return (Sports.Format(fallback), null);
        }

        return ResolveExplicitSports(requested);
    }

    private static (string? Stored, string? Error) ResolveExplicitSports(IReadOnlyList<string>? requested)
    {
        if (requested is null)
        {
            return (null, null);
        }

        var sports = Sports.Parse(requested);
        if (sports.Count == 0 || sports.Count != requested.Count)
        {
            return (null, sports.Count == 0 ? "Escolha pelo menos um esporte." : "Esporte inválido.");
        }

        return (Sports.Format(sports), null);
    }

    private async Task<IReadOnlyList<SportStat>> SportStatsAsync(
        Guid userId,
        Guid opponentId,
        CancellationToken cancellationToken)
    {
        var matches = await db.Matches
            .Where(match => match.UserId == userId && match.OpponentId == opponentId)
            .GroupBy(match => match.Sport)
            .Select(group => new SportStat(
                group.Key,
                group.Count(),
                group.Count(match => match.Won == true),
                group.Count(match => match.Won == false),
                group.Count(match => match.Won == null)))
            .ToListAsync(cancellationToken);
        return matches;
    }

    private static OpponentResponse ToResponse(
        Opponent opponent,
        int played = 0,
        int wins = 0,
        int losses = 0,
        int draws = 0,
        IReadOnlyList<SportStat>? sportStats = null) =>
        new(
            opponent.Id,
            opponent.Name,
            opponent.Handedness,
            opponent.Class,
            opponent.Strengths,
            opponent.Weaknesses,
            opponent.Notes,
            played,
            wins,
            losses,
            draws,
            Sports.Parse(opponent.Sports),
            sportStats ?? []);

    private static string NormalizeName(string? name)
    {
        if (string.IsNullOrWhiteSpace(name))
        {
            return "";
        }

        var parts = name.Trim().Split((char[]?)null, StringSplitOptions.RemoveEmptyEntries);
        return string.Join(' ', parts).ToLowerInvariant();
    }

    private static bool IsValidClass(string? value) =>
        !string.IsNullOrWhiteSpace(value) && Classes.Contains(value.Trim());

    private static string? TrimToNull(string? value) =>
        string.IsNullOrWhiteSpace(value) ? null : value.Trim();
}
