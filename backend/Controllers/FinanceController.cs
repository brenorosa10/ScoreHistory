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

    public sealed record FinanceRequest(
        decimal? LessonPrice,
        decimal? ClubPrice,
        decimal? BallCanPrice,
        decimal? StringPrice,
        decimal? OvergripPrice,
        decimal? CushionGripPrice,
        string? BallName,
        DateTime? LastBallCanOpenedAt,
        IReadOnlyList<RacketPriceRequest>? Rackets);

    public sealed record RacketPriceResponse(Guid Id, string Name, decimal? PurchasePrice);

    public sealed record FinanceResponse(
        decimal? LessonPrice,
        decimal? ClubPrice,
        decimal? BallCanPrice,
        decimal? StringPrice,
        decimal? OvergripPrice,
        decimal? CushionGripPrice,
        string? BallName,
        DateTime? LastBallCanOpenedAt,
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
            || !TryNormalizePrice(request.BallCanPrice, out var ballCanPrice, out error)
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
        finance.BallCanPrice = ballCanPrice;
        finance.StringPrice = stringPrice;
        finance.OvergripPrice = overgripPrice;
        finance.CushionGripPrice = cushionGripPrice;
        finance.BallName = TrimToNull(request.BallName);
        finance.LastBallCanOpenedAt = request.LastBallCanOpenedAt?.ToUniversalTime();

        await using var transaction = await db.Database.BeginTransactionAsync(cancellationToken);

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
        await transaction.CommitAsync(cancellationToken);
        return Ok(await ToResponseAsync(userId.Value, finance, cancellationToken));
    }

    private async Task<FinanceResponse> ToResponseAsync(
        Guid userId,
        UserFinance? finance,
        CancellationToken cancellationToken)
    {
        var rackets = await db.Rackets.AsNoTracking()
            .Where(racket => racket.UserId == userId)
            .OrderBy(racket => racket.Name)
            .Select(racket => new RacketPriceResponse(racket.Id, racket.Name, racket.PurchasePrice))
            .ToListAsync(cancellationToken);

        return new FinanceResponse(
            finance?.LessonPrice,
            finance?.ClubPrice,
            finance?.BallCanPrice,
            finance?.StringPrice,
            finance?.OvergripPrice,
            finance?.CushionGripPrice,
            finance?.BallName,
            finance?.LastBallCanOpenedAt,
            rackets);
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
