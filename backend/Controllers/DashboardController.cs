using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ScoreHistory.Api.Auth;
using ScoreHistory.Api.Data;
using ScoreHistory.Api.Models;

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
        bool Won);

    public sealed record DashboardSummaryResponse(
        int Matches,
        int Wins,
        int Losses,
        int WinRate,
        int Opponents,
        int? StreakCount,
        bool? StreakWon,
        LatestMatchResponse? LatestMatch);

    public sealed record HeadToHeadResponse(
        Guid OpponentId,
        string Name,
        int Played,
        int Wins,
        int Losses,
        string LastScore);

    public sealed record DashboardTipsResponse(IReadOnlyList<string> Tips);

    [HttpGet("summary")]
    public async Task<ActionResult<DashboardSummaryResponse>> Summary(CancellationToken cancellationToken)
    {
        var userId = CurrentUser.GetId(User);
        if (userId is null)
        {
            return Unauthorized();
        }

        var matches = await db.Matches
            .Include(match => match.Opponent)
            .Where(match => match.UserId == userId)
            .OrderByDescending(match => match.PlayedAt)
            .ToListAsync(cancellationToken);

        var opponents = await db.Opponents.CountAsync(opponent => opponent.UserId == userId, cancellationToken);
        var wins = matches.Count(match => match.Won);
        var losses = matches.Count - wins;
        var winRate = matches.Count == 0 ? 0 : (int)Math.Round(wins * 100d / matches.Count);
        var streak = BuildStreak(matches);
        var latest = matches.Count == 0 ? null : ToLatest(matches[0]);

        return Ok(new DashboardSummaryResponse(
            matches.Count,
            wins,
            losses,
            winRate,
            opponents,
            streak?.Count,
            streak?.Won,
            latest));
    }

    [HttpGet("head-to-head")]
    public async Task<ActionResult<IReadOnlyList<HeadToHeadResponse>>> HeadToHead(
        CancellationToken cancellationToken)
    {
        var userId = CurrentUser.GetId(User);
        if (userId is null)
        {
            return Unauthorized();
        }

        var matches = await LoadMatchesAsync(userId.Value, cancellationToken);
        return Ok(BuildHeadToHead(matches));
    }

    [HttpGet("head-to-head/{opponentId:guid}")]
    public async Task<ActionResult<HeadToHeadResponse>> HeadToHeadByOpponent(
        Guid opponentId,
        CancellationToken cancellationToken)
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

            return Ok(new HeadToHeadResponse(opponent.Id, opponent.Name, 0, 0, 0, string.Empty));
        }

        var first = matches[0];
        var wins = matches.Count(match => match.Won);
        return Ok(new HeadToHeadResponse(
            first.OpponentId,
            first.Opponent?.Name ?? "Adversário",
            matches.Count,
            wins,
            matches.Count - wins,
            first.Score));
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
            match.Won);

    private static (bool Won, int Count)? BuildStreak(IReadOnlyList<Match> matches)
    {
        if (matches.Count == 0)
        {
            return null;
        }

        var won = matches[0].Won;
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
        var map = new Dictionary<Guid, HeadToHeadResponse>();

        foreach (var match in matches)
        {
            if (!map.TryGetValue(match.OpponentId, out var current))
            {
                current = new HeadToHeadResponse(
                    match.OpponentId,
                    match.Opponent?.Name ?? "Adversário",
                    0,
                    0,
                    0,
                    match.Score);
            }

            map[match.OpponentId] = current with
            {
                Played = current.Played + 1,
                Wins = current.Wins + (match.Won ? 1 : 0),
                Losses = current.Losses + (match.Won ? 0 : 1)
            };
        }

        return map.Values.OrderByDescending(item => item.Played).ToList();
    }

    private static IReadOnlyList<string> BuildTips(IReadOnlyList<Match> matches)
    {
        var tips = new List<string>();
        var losses = matches.Where(match => !match.Won).ToList();
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
