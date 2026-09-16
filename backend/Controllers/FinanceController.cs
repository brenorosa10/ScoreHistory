using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ScoreHistory.Api.Auth;
using ScoreHistory.Api.Data;
using ScoreHistory.Api.Models;

namespace ScoreHistory.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/finance")]
public sealed class FinanceController(AppDbContext db) : ControllerBase
{
    public sealed record RacketPriceRequest(Guid Id, decimal? PurchasePrice);

    public sealed record BallCanRequest(Guid? Id, string? Name, decimal? CanPrice, DateTime? LastOpenedAt);

    public sealed record FinanceRequest(
        decimal? LessonPrice,
        decimal? ClubPrice,
        decimal? BallCanPrice,
        decimal? StringPrice,
        decimal? OvergripPrice,
        decimal? CushionGripPrice,
        string? BallName,
        DateTime? LastBallCanOpenedAt,
        IReadOnlyList<BallCanRequest>? Balls,
        IReadOnlyList<RacketPriceRequest>? Rackets);

    public sealed record RacketPriceResponse(Guid Id, string Name, decimal? PurchasePrice);

    public sealed record BallCanResponse(Guid Id, string? Name, decimal? CanPrice, DateTime? LastOpenedAt);

    public sealed record FinanceResponse(
        decimal? LessonPrice,
        decimal? ClubPrice,
        decimal? BallCanPrice,
        decimal? StringPrice,
        decimal? OvergripPrice,
        decimal? CushionGripPrice,
        string? BallName,
        DateTime? LastBallCanOpenedAt,
        IReadOnlyList<BallCanResponse> Balls,
        IReadOnlyList<RacketPriceResponse> Rackets);

    [HttpGet]
    public async Task<ActionResult<FinanceResponse>> Get(CancellationToken cancellationToken)
    {
        var userId = CurrentUser.GetId(User);
        if (userId is null)
        {
            return Unauthorized();
        }

        var finance = await db.UserFinances.AsNoTracking()
            .FirstOrDefaultAsync(item => item.UserId == userId, cancellationToken);

        return Ok(await ToResponseAsync(userId.Value, finance, cancellationToken));
    }

    [HttpPut]
    public async Task<ActionResult<FinanceResponse>> Upsert(
        [FromBody] FinanceRequest request,
        CancellationToken cancellationToken)
    {
        var userId = CurrentUser.GetId(User);
        if (userId is null)
        {
            return Unauthorized();
        }

        if (!TryNormalizePrice(request.LessonPrice, out var lessonPrice, out var error)
            || !TryNormalizePrice(request.ClubPrice, out var clubPrice, out error)
            || !TryNormalizePrice(request.StringPrice, out var stringPrice, out error)
            || !TryNormalizePrice(request.OvergripPrice, out var overgripPrice, out error)
            || !TryNormalizePrice(request.CushionGripPrice, out var cushionGripPrice, out error))
        {
            return BadRequest(new { message = error });
        }

        var finance = await db.UserFinances
            .FirstOrDefaultAsync(item => item.UserId == userId, cancellationToken);
        if (finance is null)
        {
            finance = new UserFinance { UserId = userId.Value };
            db.UserFinances.Add(finance);
        }

        finance.LessonPrice = lessonPrice;
        finance.ClubPrice = clubPrice;
        finance.StringPrice = stringPrice;
        finance.OvergripPrice = overgripPrice;
        finance.CushionGripPrice = cushionGripPrice;

        await using var transaction = await db.Database.BeginTransactionAsync(cancellationToken);

        if (request.Balls is not null)
        {
            if (request.Balls.Count > 20)
            {
                return BadRequest(new { message = "Cadastre no máximo 20 bolinhas." });
            }

            var existing = await db.BallCans
                .Where(ball => ball.UserId == userId)
                .ToListAsync(cancellationToken);
            var incomingIds = request.Balls
                .Where(item => item.Id is not null)
                .Select(item => item.Id!.Value)
                .ToHashSet();

            db.BallCans.RemoveRange(existing.Where(ball => !incomingIds.Contains(ball.Id)));

            for (var index = 0; index < request.Balls.Count; index++)
            {
                var item = request.Balls[index];
                if (!TryNormalizePrice(item.CanPrice, out var canPrice, out error))
                {
                    return BadRequest(new { message = error });
                }

                BallCan ball;
                if (item.Id is Guid id)
                {
                    ball = existing.FirstOrDefault(candidate => candidate.Id == id);
                    if (ball is null)
                    {
                        return NotFound(new { message = "Bolinha não encontrada." });
                    }
                }
                else
                {
                    ball = new BallCan { UserId = userId.Value };
                    db.BallCans.Add(ball);
                }

                ball.Name = TrimToNull(item.Name);
                ball.CanPrice = canPrice;
                ball.LastOpenedAt = item.LastOpenedAt?.ToUniversalTime();
                ball.SortOrder = index;
            }
        }

        if (request.Rackets is not null)
        {
            foreach (var item in request.Rackets)
            {
                if (!TryNormalizePrice(item.PurchasePrice, out var purchasePrice, out error))
                {
                    return BadRequest(new { message = error });
                }

                var updated = await db.Rackets
                    .Where(racket => racket.Id == item.Id && racket.UserId == userId)
                    .ExecuteUpdateAsync(
                        setters => setters.SetProperty(racket => racket.PurchasePrice, purchasePrice),
                        cancellationToken);
                if (updated == 0)
                {
                    return NotFound(new { message = "Raquete não encontrada." });
                }
            }
        }

        await db.SaveChangesAsync(cancellationToken);

        var balls = await db.BallCans
            .Where(ball => ball.UserId == userId)
            .OrderBy(ball => ball.SortOrder)
            .ThenBy(ball => ball.Name)
            .ToListAsync(cancellationToken);
        ApplyLegacyBallFields(finance, balls);
        await db.SaveChangesAsync(cancellationToken);
        await transaction.CommitAsync(cancellationToken);
        return Ok(ToResponse(finance, balls, await LoadRacketsAsync(userId.Value, cancellationToken)));
    }

    private async Task<FinanceResponse> ToResponseAsync(
        Guid userId,
        UserFinance? finance,
        CancellationToken cancellationToken)
    {
        var balls = await db.BallCans.AsNoTracking()
            .Where(ball => ball.UserId == userId)
            .OrderBy(ball => ball.SortOrder)
            .ThenBy(ball => ball.Name)
            .ToListAsync(cancellationToken);

        return ToResponse(finance, balls, await LoadRacketsAsync(userId, cancellationToken));
    }

    private async Task<List<RacketPriceResponse>> LoadRacketsAsync(Guid userId, CancellationToken cancellationToken) =>
        await db.Rackets.AsNoTracking()
            .Where(racket => racket.UserId == userId)
            .OrderBy(racket => racket.Name)
            .Select(racket => new RacketPriceResponse(racket.Id, racket.Name, racket.PurchasePrice))
            .ToListAsync(cancellationToken);

    private static FinanceResponse ToResponse(
        UserFinance? finance,
        IReadOnlyList<BallCan> balls,
        IReadOnlyList<RacketPriceResponse> rackets)
    {
        var latest = balls
            .OrderByDescending(ball => ball.LastOpenedAt ?? DateTime.MinValue)
            .ThenBy(ball => ball.SortOrder)
            .FirstOrDefault();

        return new FinanceResponse(
            finance?.LessonPrice,
            finance?.ClubPrice,
            latest?.CanPrice ?? finance?.BallCanPrice,
            finance?.StringPrice,
            finance?.OvergripPrice,
            finance?.CushionGripPrice,
            latest?.Name ?? finance?.BallName,
            latest?.LastOpenedAt ?? finance?.LastBallCanOpenedAt,
            balls.Select(ball => new BallCanResponse(ball.Id, ball.Name, ball.CanPrice, ball.LastOpenedAt)).ToList(),
            rackets);
    }

    private static void ApplyLegacyBallFields(UserFinance finance, IReadOnlyList<BallCan> balls)
    {
        var latest = balls
            .OrderByDescending(ball => ball.LastOpenedAt ?? DateTime.MinValue)
            .ThenBy(ball => ball.SortOrder)
            .FirstOrDefault();

        finance.BallName = latest?.Name;
        finance.BallCanPrice = latest?.CanPrice;
        finance.LastBallCanOpenedAt = latest?.LastOpenedAt;
    }

    private static bool TryNormalizePrice(decimal? value, out decimal? normalized, out string? error)
    {
        normalized = null;
        error = null;

        if (value is null)
        {
            return true;
        }

        if (value < 0)
        {
            error = "Informe um valor maior ou igual a zero.";
            return false;
        }

        normalized = decimal.Round(value.Value, 2, MidpointRounding.AwayFromZero);
        return true;
    }

    private static string? TrimToNull(string? value) =>
        string.IsNullOrWhiteSpace(value) ? null : value.Trim();
}
