using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ScoreHistory.Api.Auth;
using ScoreHistory.Api.Data;
using ScoreHistory.Api.Models;
using ScoreHistory.Api.Services;

namespace ScoreHistory.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/dashboard")]
public sealed class DashboardController(AppDbContext db) : ControllerBase
{
    public sealed record LatestMatchResponse(
        Guid Id,
        string OpponentName,
        DateTime PlayedAt,
        string CourtType,
        string Score,
        bool? Won,
        string Sport);

    public sealed record SportSummary(string Sport, int Matches, int Wins, int Losses, int Draws, int WinRate);

    public sealed record DashboardSummaryResponse(
        int Matches,
        int Wins,
        int Losses,
        int Draws,
        int WinRate,
        int Opponents,
        int? StreakCount,
        bool? StreakWon,
        LatestMatchResponse? LatestMatch,
        IReadOnlyList<SportSummary> BySport);

    public sealed record SportHeadToHead(string Sport, int Played, int Wins, int Losses, int Draws);

    public sealed record HeadToHeadResponse(
        Guid OpponentId,
        string Name,
        int Played,
        int Wins,
        int Losses,
        int Draws,
        string LastScore,
        string Sport,
        IReadOnlyList<SportHeadToHead> BySport);

    public sealed record DashboardTipsResponse(IReadOnlyList<string> Tips);

    [HttpGet("summary")]
    public async Task<ActionResult<DashboardSummaryResponse>> Summary(
        [FromQuery] string? sport = null,
        CancellationToken cancellationToken = default)
    {
        var userId = CurrentUser.GetId(User);
        if (userId is null)
        {
            return Unauthorized();
        }

        var sportFilter = Sports.Normalize(sport);
        if (!string.IsNullOrWhiteSpace(sport) && sportFilter is null)
        {
            return BadRequest(new { message = "Esporte inválido." });
        }

        var allMatches = await db.Matches
            .Include(match => match.Opponent)
            .Where(match => match.UserId == userId)
            .OrderByDescending(match => match.PlayedAt)
            .ToListAsync(cancellationToken);
        var matches = sportFilter is null
            ? allMatches
            : allMatches.Where(match => match.Sport == sportFilter).ToList();

        var opponents = await db.Opponents.CountAsync(opponent => opponent.UserId == userId, cancellationToken);
        var wins = matches.Count(match => match.Won == true);
        var losses = matches.Count(match => match.Won == false);
        var draws = matches.Count(match => match.Won == null);
        var decided = wins + losses;
        var winRate = decided == 0 ? 0 : (int)Math.Round(wins * 100d / decided, MidpointRounding.AwayFromZero);
        var streak = BuildStreak(matches);
        var latest = matches.Count == 0 ? null : ToLatest(matches[0]);

        return Ok(new DashboardSummaryResponse(
            matches.Count,
            wins,
            losses,
            draws,
            winRate,
            opponents,
            streak?.Count,
            streak?.Won,
            latest,
            BuildSportSummaries(allMatches)));
    }

    [HttpGet("head-to-head")]
    public async Task<ActionResult<IReadOnlyList<HeadToHeadResponse>>> HeadToHead(
        [FromQuery] string? sport = null,
        CancellationToken cancellationToken = default)
    {
        var userId = CurrentUser.GetId(User);
        if (userId is null)
        {
            return Unauthorized();
        }

        var sportFilter = Sports.Normalize(sport);
        if (!string.IsNullOrWhiteSpace(sport) && sportFilter is null)
        {
            return BadRequest(new { message = "Esporte inválido." });
        }

        var matches = await LoadMatchesAsync(userId.Value, cancellationToken);
        if (sportFilter is not null)
        {
            matches = matches.Where(match => match.Sport == sportFilter).ToList();
        }

        return Ok(BuildHeadToHead(matches));
    }

    [HttpGet("head-to-head/{opponentId:guid}")]
    public async Task<ActionResult<HeadToHeadResponse>> HeadToHeadByOpponent(
        Guid opponentId,
        [FromQuery] string? sport = null,
        CancellationToken cancellationToken = default)
    {
        var userId = CurrentUser.GetId(User);
        if (userId is null)
        {
            return Unauthorized();
        }

        var matches = await db.Matches
            .Include(match => match.Opponent)
            .Where(match => match.UserId == userId && match.OpponentId == opponentId)
            .OrderByDescending(match => match.PlayedAt)
            .ToListAsync(cancellationToken);

        if (matches.Count == 0)
        {
            var opponent = await db.Opponents.FirstOrDefaultAsync(
                item => item.Id == opponentId && item.UserId == userId,
                cancellationToken);
            if (opponent is null)
            {
                return NotFound(new { message = "Adversário não encontrado." });
            }

            return Ok(new HeadToHeadResponse(opponent.Id, opponent.Name, 0, 0, 0, 0, string.Empty, Sports.Tennis, []));
        }

        var sportFilter = Sports.Normalize(sport);
        if (!string.IsNullOrWhiteSpace(sport) && sportFilter is null)
        {
            return BadRequest(new { message = "Esporte inválido." });
        }

        var bySport = BuildSportHeadToHead(matches);
        var scoped = sportFilter is null ? matches : matches.Where(match => match.Sport == sportFilter).ToList();
        if (scoped.Count == 0)
        {
            return Ok(new HeadToHeadResponse(
                opponentId,
                matches[0].Opponent?.Name ?? "Adversário",
                0,
                0,
                0,
                0,
                string.Empty,
                sportFilter ?? Sports.Tennis,
                bySport));
        }

        var first = scoped[0];
        var wins = scoped.Count(match => match.Won == true);
        var losses = scoped.Count(match => match.Won == false);
        var draws = scoped.Count(match => match.Won == null);
        return Ok(new HeadToHeadResponse(
            first.OpponentId,
            first.Opponent?.Name ?? "Adversário",
            scoped.Count,
            wins,
            losses,
            draws,
            first.Score,
            sportFilter ?? first.Sport,
            bySport));
    }

    [HttpGet("tips")]
    public async Task<ActionResult<DashboardTipsResponse>> Tips(CancellationToken cancellationToken)
    {
        var userId = CurrentUser.GetId(User);
        if (userId is null)
        {
            return Unauthorized();
        }

        var matches = await LoadMatchesAsync(userId.Value, cancellationToken);
        return Ok(new DashboardTipsResponse(BuildTips(matches)));
    }

    private Task<List<Match>> LoadMatchesAsync(Guid userId, CancellationToken cancellationToken) =>
        db.Matches
            .Include(match => match.Opponent)
            .Where(match => match.UserId == userId)
            .OrderByDescending(match => match.PlayedAt)
            .ToListAsync(cancellationToken);

    private static LatestMatchResponse ToLatest(Match match) =>
        new(
            match.Id,
            match.Opponent?.Name ?? "Adversário",
            match.PlayedAt,
            match.CourtType,
            match.Score,
            match.Won,
            string.IsNullOrWhiteSpace(match.Sport) ? Sports.Tennis : match.Sport);

    private static (bool Won, int Count)? BuildStreak(IReadOnlyList<Match> matches)
    {
        var first = matches.FirstOrDefault(match => match.Won != null);
        if (first is null)
        {
            return null;
        }

        var won = first.Won!.Value;
        var count = 0;
        foreach (var match in matches)
        {
            if (match.Won != won)
            {
                break;
            }

            count += 1;
        }

        return count >= 2 ? (won, count) : null;
    }

    private static IReadOnlyList<HeadToHeadResponse> BuildHeadToHead(IReadOnlyList<Match> matches)
    {
        var map = new Dictionary<string, HeadToHeadResponse>();

        foreach (var match in matches)
        {
            var sport = string.IsNullOrWhiteSpace(match.Sport) ? Sports.Tennis : match.Sport;
            var key = match.OpponentId + ":" + sport;
            if (!map.TryGetValue(key, out var current))
            {
                current = new HeadToHeadResponse(
                    match.OpponentId,
                    match.Opponent?.Name ?? "Adversário",
                    0,
                    0,
                    0,
                    0,
                    match.Score,
                    sport,
                    []);
            }

            map[key] = current with
            {
                Played = current.Played + 1,
                Wins = current.Wins + (match.Won == true ? 1 : 0),
                Losses = current.Losses + (match.Won == false ? 1 : 0),
                Draws = current.Draws + (match.Won == null ? 1 : 0)
            };
        }

        return map.Values.OrderByDescending(item => item.Played).ToList();
    }

    private static IReadOnlyList<SportSummary> BuildSportSummaries(IReadOnlyList<Match> matches)
    {
        return matches
            .GroupBy(match => string.IsNullOrWhiteSpace(match.Sport) ? Sports.Tennis : match.Sport)
            .Select(group =>
            {
                var wins = group.Count(match => match.Won == true);
                var losses = group.Count(match => match.Won == false);
                var draws = group.Count(match => match.Won == null);
                var decided = wins + losses;
                var winRate = decided == 0 ? 0 : (int)Math.Round(wins * 100d / decided, MidpointRounding.AwayFromZero);
                return new SportSummary(group.Key, group.Count(), wins, losses, draws, winRate);
            })
            .OrderBy(item => item.Sport)
            .ToList();
    }

    private static IReadOnlyList<SportHeadToHead> BuildSportHeadToHead(IReadOnlyList<Match> matches) =>
        matches
            .GroupBy(match => string.IsNullOrWhiteSpace(match.Sport) ? Sports.Tennis : match.Sport)
            .Select(group => new SportHeadToHead(
                group.Key,
                group.Count(),
                group.Count(match => match.Won == true),
                group.Count(match => match.Won == false),
                group.Count(match => match.Won == null)))
            .OrderBy(item => item.Sport)
            .ToList();

    private static IReadOnlyList<string> BuildTips(IReadOnlyList<Match> matches)
    {
        var tips = new List<string>();
        var losses = matches.Where(match => match.Won == false).ToList();
        if (matches.Count >= 3 && losses.Count / (double)matches.Count >= 0.6)
        {
            tips.Add(
                "Aproveitamento baixo nas últimas partidas. Revise o plano de jogo antes do próximo confronto.");
        }

        if (losses.Count(match => match.CourtType == "Saibro") >= 2)
        {
            tips.Add("Várias derrotas no saibro. Trabalhe consistência e pontos longos nessa superfície.");
        }

        if (losses.Count(match => match.Opponent?.Handedness == "Canhoto") >= 2)
        {
            tips.Add("Dificuldade contra canhotos. Treine devolução no lado invertido e o cruzado no backhand.");
        }

        var weaknessText = string.Join(
                " ",
                matches.Select(match => match.Weaknesses).Where(value => !string.IsNullOrWhiteSpace(value)))
            .ToLowerInvariant();
        if (weaknessText.Contains("saque"))
        {
            tips.Add("O saque aparece nos pontos fracos. Priorize % de primeiro saque e variação de direção.");
        }

        if (weaknessText.Contains("backhand"))
        {
            tips.Add("O backhand vem sendo explorado. Reforce a profundidade e o cruzado de defesa.");
        }

        if (weaknessText.Contains("rede") || weaknessText.Contains("voleio"))
        {
            tips.Add("Jogo na rede em alerta. Treine aproximação e voleio de contenção.");
        }

        if (tips.Count == 0 && losses.Count > 0)
        {
            tips.Add("Nas derrotas, anote um ponto fraco objetivo para transformar o histórico em treino.");
        }

        return tips.Take(4).ToList();
    }
}
