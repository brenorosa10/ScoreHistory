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

    public sealed record BallOpeningResponse(Guid Id, Guid BallCanId, DateTime OpenedAt);

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
        IReadOnlyList<RacketPriceResponse> Rackets,
        IReadOnlyList<BallOpeningResponse> Openings);

    public static readonly string[] Categories =
        ["Aula", "Clube", "Corda", "Overgrip", "Grip", "Bolinhas", "Raquete", "Torneio", "Outro"];

    public sealed record ExpenseRequest(
        DateTime OccurredAt,
        string Category,
        decimal Amount,
        Guid? RacketId,
        Guid? BallCanId,
        string? Note);

    public sealed record ExpenseResponse(
        Guid Id,
        DateTime OccurredAt,
        string Category,
        decimal Amount,
        Guid? RacketId,
        Guid? BallCanId,
        Guid? RacketServiceId,
        Guid? BallOpeningId,
        string? Note);

    public sealed record ReplacementRequest(
        string Kind,
        DateTime OccurredAt,
        decimal? Amount,
        Guid? RacketId,
        Guid? BallCanId,
        decimal? TensionLb,
        string? Detail,
        string? Note,
        string? Category);

    public sealed record FeesRequest(
        int Year,
        int Month,
        decimal? LessonAmount,
        decimal? ClubAmount);

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
                    ball = existing.FirstOrDefault(candidate => candidate.Id == id)!;
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

                var previousOpened = ball.LastOpenedAt;
                ball.Name = TrimToNull(item.Name);
                ball.CanPrice = canPrice;
                ball.LastOpenedAt = item.LastOpenedAt?.ToUniversalTime();
                ball.SortOrder = index;
                if (ball.LastOpenedAt is DateTime opened
                    && (previousOpened is null || CivilDay(previousOpened.Value) != CivilDay(opened)))
                {
                    await AddOpeningIfMissingAsync(userId.Value, ball, opened, cancellationToken);
                }
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
        return Ok(await ToResponseAsync(userId.Value, finance, cancellationToken));
    }

    [HttpGet("expenses")]
    public async Task<ActionResult<IReadOnlyList<ExpenseResponse>>> ListExpenses(CancellationToken cancellationToken)
    {
        var userId = CurrentUser.GetId(User);
        if (userId is null)
        {
            return Unauthorized();
        }

        var expenses = await db.Expenses.AsNoTracking()
            .Where(expense => expense.UserId == userId)
            .OrderByDescending(expense => expense.OccurredAt)
            .ThenByDescending(expense => expense.Id)
            .ToListAsync(cancellationToken);
        return Ok(expenses.Select(ToExpense).ToList());
    }

    [HttpPost("expenses")]
    public async Task<ActionResult<ExpenseResponse>> CreateExpense(
        [FromBody] ExpenseRequest request,
        CancellationToken cancellationToken)
    {
        var userId = CurrentUser.GetId(User);
        if (userId is null)
        {
            return Unauthorized();
        }

        var built = await TryBuildExpenseAsync(userId.Value, request, null, cancellationToken);
        if (built.Error is not null || built.Expense is null)
        {
            return built.Status == 404
                ? NotFound(new { message = built.Error })
                : BadRequest(new { message = built.Error ?? "Não foi possível lançar o gasto." });
        }

        db.Expenses.Add(built.Expense!);
        await db.SaveChangesAsync(cancellationToken);
        return Ok(ToExpense(built.Expense!));
    }

    [HttpPut("expenses/{id:guid}")]
    public async Task<ActionResult<ExpenseResponse>> UpdateExpense(
        Guid id,
        [FromBody] ExpenseRequest request,
        CancellationToken cancellationToken)
    {
        var userId = CurrentUser.GetId(User);
        if (userId is null)
        {
            return Unauthorized();
        }

        var expense = await db.Expenses
            .FirstOrDefaultAsync(item => item.Id == id && item.UserId == userId, cancellationToken);
        if (expense is null)
        {
            return NotFound(new { message = "Gasto não encontrado." });
        }

        var built = await TryBuildExpenseAsync(userId.Value, request, expense, cancellationToken);
        if (built.Error is not null)
        {
            return built.Status == 404
                ? NotFound(new { message = built.Error })
                : BadRequest(new { message = built.Error });
        }

        if (expense.RacketServiceId is Guid serviceId)
        {
            await db.RacketServices
                .Where(service => service.Id == serviceId)
                .ExecuteUpdateAsync(
                    setters => setters.SetProperty(service => service.ChangedAt, expense.OccurredAt),
                    cancellationToken);
        }

        if (expense.BallOpeningId is Guid openingId)
        {
            await db.BallOpenings
                .Where(opening => opening.Id == openingId)
                .ExecuteUpdateAsync(
                    setters => setters.SetProperty(opening => opening.OpenedAt, expense.OccurredAt),
                    cancellationToken);
            if (expense.BallCanId is Guid ballId)
            {
                await RefreshLastOpenedAsync(ballId, cancellationToken);
            }
        }

        await db.SaveChangesAsync(cancellationToken);
        return Ok(ToExpense(expense));
    }

    [HttpDelete("expenses/{id:guid}")]
    public async Task<IActionResult> DeleteExpense(Guid id, CancellationToken cancellationToken)
    {
        var userId = CurrentUser.GetId(User);
        if (userId is null)
        {
            return Unauthorized();
        }

        var expense = await db.Expenses
            .FirstOrDefaultAsync(item => item.Id == id && item.UserId == userId, cancellationToken);
        if (expense is null)
        {
            return NotFound(new { message = "Gasto não encontrado." });
        }

        var serviceId = expense.RacketServiceId;
        var openingId = expense.BallOpeningId;
        var ballId = expense.BallCanId;
        db.Expenses.Remove(expense);
        await db.SaveChangesAsync(cancellationToken);

        if (serviceId is Guid linkedService)
        {
            await db.RacketServices.Where(service => service.Id == linkedService).ExecuteDeleteAsync(cancellationToken);
        }

        if (openingId is Guid linkedOpening)
        {
            await db.BallOpenings.Where(opening => opening.Id == linkedOpening).ExecuteDeleteAsync(cancellationToken);
            if (ballId is Guid linkedBall)
            {
                await RefreshLastOpenedAsync(linkedBall, cancellationToken);
            }
        }

        return NoContent();
    }

    [HttpPost("replacements")]
    public async Task<ActionResult<ExpenseResponse>> CreateReplacement(
        [FromBody] ReplacementRequest request,
        CancellationToken cancellationToken)
    {
        var userId = CurrentUser.GetId(User);
        if (userId is null)
        {
            return Unauthorized();
        }

        var kind = request.Kind?.Trim() ?? "";
        var category = kind switch
        {
            "Corda" => "Corda",
            "Overgrip" => "Overgrip",
            "Grip" => "Grip",
            "Bolinhas" => "Bolinhas",
            "Outro" => string.IsNullOrWhiteSpace(request.Category) ? "Outro" : request.Category.Trim(),
            _ => null
        };
        if (category is null || !Categories.Contains(category))
        {
            return BadRequest(new { message = "Tipo de lançamento inválido." });
        }

        if (!TryNormalizePrice(request.Amount, out var amount, out var error) || amount is null)
        {
            return BadRequest(new { message = error ?? "Informe o valor." });
        }

        var occurredAt = request.OccurredAt.ToUniversalTime();
        Expense expense;

        if (kind is "Corda" or "Overgrip" or "Grip")
        {
            if (request.RacketId is not Guid racketId)
            {
                return BadRequest(new { message = "Escolha a raquete." });
            }

            var owned = await db.Rackets.AsNoTracking()
                .Where(racket => racket.Id == racketId && racket.UserId == userId)
                .Select(racket => racket.Sport)
                .FirstOrDefaultAsync(cancellationToken);
            if (owned is null)
            {
                return NotFound(new { message = "Raquete não encontrada." });
            }

            var sport = string.IsNullOrWhiteSpace(owned) ? "Tênis" : owned;
            if (sport != "Tênis" && (kind == "Corda" || request.TensionLb is not null))
            {
                return BadRequest(new { message = "Raquetes de padel e beach tennis não usam corda." });
            }

            var service = new RacketService
            {
                RacketId = racketId,
                Kind = kind,
                ChangedAt = occurredAt,
                Detail = TrimToNull(request.Detail),
                TensionLb = request.TensionLb
            };
            db.RacketServices.Add(service);
            expense = new Expense
            {
                UserId = userId.Value,
                OccurredAt = occurredAt,
                Category = category,
                Amount = amount.Value,
                RacketId = racketId,
                RacketServiceId = service.Id,
                Note = TrimToNull(request.Note) ?? TrimToNull(request.Detail)
            };
        }
        else if (kind == "Bolinhas")
        {
            if (request.BallCanId is not Guid ballId)
            {
                return BadRequest(new { message = "Escolha a bolinha." });
            }

            var ball = await db.BallCans
                .FirstOrDefaultAsync(item => item.Id == ballId && item.UserId == userId, cancellationToken);
            if (ball is null)
            {
                return NotFound(new { message = "Bolinha não encontrada." });
            }

            var opening = new BallOpening
            {
                UserId = userId.Value,
                BallCanId = ball.Id,
                OpenedAt = occurredAt
            };
            db.BallOpenings.Add(opening);
            if (ball.LastOpenedAt is null || ball.LastOpenedAt < occurredAt)
            {
                ball.LastOpenedAt = occurredAt;
            }

            var finance = await db.UserFinances
                .FirstOrDefaultAsync(item => item.UserId == userId, cancellationToken);
            if (finance is not null)
            {
                var balls = await db.BallCans.Where(item => item.UserId == userId).ToListAsync(cancellationToken);
                ApplyLegacyBallFields(finance, balls);
            }

            expense = new Expense
            {
                UserId = userId.Value,
                OccurredAt = occurredAt,
                Category = "Bolinhas",
                Amount = amount.Value,
                BallCanId = ball.Id,
                BallOpeningId = opening.Id,
                Note = TrimToNull(request.Note) ?? ball.Name
            };
        }
        else
        {
            if (request.RacketId is Guid racketId)
            {
                var owned = await db.Rackets.AsNoTracking()
                    .AnyAsync(racket => racket.Id == racketId && racket.UserId == userId, cancellationToken);
                if (!owned)
                {
                    return NotFound(new { message = "Raquete não encontrada." });
                }
            }

            expense = new Expense
            {
                UserId = userId.Value,
                OccurredAt = occurredAt,
                Category = category,
                Amount = amount.Value,
                RacketId = request.RacketId,
                Note = TrimToNull(request.Note)
            };
        }

        db.Expenses.Add(expense);
        await db.SaveChangesAsync(cancellationToken);
        return Ok(ToExpense(expense));
    }

    [HttpPost("fees")]
    public async Task<ActionResult<IReadOnlyList<ExpenseResponse>>> LaunchFees(
        [FromBody] FeesRequest request,
        CancellationToken cancellationToken)
    {
        var userId = CurrentUser.GetId(User);
        if (userId is null)
        {
            return Unauthorized();
        }

        if (request.Month is < 1 or > 12 || request.Year is < 2000 or > 2100)
        {
            return BadRequest(new { message = "Mês inválido." });
        }

        if (!TryNormalizePrice(request.LessonAmount, out var lesson, out var error)
            || !TryNormalizePrice(request.ClubAmount, out var club, out error))
        {
            return BadRequest(new { message = error });
        }

        var existing = await db.Expenses
            .Where(expense => expense.UserId == userId && (expense.Category == "Aula" || expense.Category == "Clube"))
            .ToListAsync(cancellationToken);

        var created = new List<Expense>();
        if (lesson is not null && existing.All(expense => expense.Category != "Aula" || !InCivilMonth(expense.OccurredAt, request.Year, request.Month)))
        {
            created.Add(new Expense
            {
                UserId = userId.Value,
                OccurredAt = CivilNoon(request.Year, request.Month, 1),
                Category = "Aula",
                Amount = lesson.Value,
                Note = "Mensalidade"
            });
        }

        if (club is not null && existing.All(expense => expense.Category != "Clube" || !InCivilMonth(expense.OccurredAt, request.Year, request.Month)))
        {
            created.Add(new Expense
            {
                UserId = userId.Value,
                OccurredAt = CivilNoon(request.Year, request.Month, 1),
                Category = "Clube",
                Amount = club.Value,
                Note = "Mensalidade"
            });
        }

        if (created.Count == 0)
        {
            return Ok(Array.Empty<ExpenseResponse>());
        }

        db.Expenses.AddRange(created);
        await db.SaveChangesAsync(cancellationToken);
        return Ok(created.Select(ToExpense).ToList());
    }

    [HttpPost("balls/{ballId:guid}/openings")]
    public async Task<ActionResult<ExpenseResponse>> OpenBall(
        Guid ballId,
        [FromBody] ReplacementRequest request,
        CancellationToken cancellationToken)
    {
        request = request with { Kind = "Bolinhas", BallCanId = ballId };
        return await CreateReplacement(request, cancellationToken);
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
        var openings = await db.BallOpenings.AsNoTracking()
            .Where(opening => opening.UserId == userId)
            .OrderByDescending(opening => opening.OpenedAt)
            .Select(opening => new BallOpeningResponse(opening.Id, opening.BallCanId, opening.OpenedAt))
            .ToListAsync(cancellationToken);

        return ToResponse(finance, balls, await LoadRacketsAsync(userId, cancellationToken), openings);
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
        IReadOnlyList<RacketPriceResponse> rackets,
        IReadOnlyList<BallOpeningResponse> openings)
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
            rackets,
            openings);
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

    private async Task AddOpeningIfMissingAsync(
        Guid userId,
        BallCan ball,
        DateTime openedAt,
        CancellationToken cancellationToken)
    {
        var day = CivilDay(openedAt);
        var openings = await db.BallOpenings
            .Where(opening => opening.BallCanId == ball.Id)
            .Select(opening => opening.OpenedAt)
            .ToListAsync(cancellationToken);
        if (openings.Any(opened => CivilDay(opened) == day))
        {
            return;
        }

        var opening = new BallOpening
        {
            UserId = userId,
            BallCanId = ball.Id,
            OpenedAt = openedAt
        };
        db.BallOpenings.Add(opening);
        db.Expenses.Add(new Expense
        {
            UserId = userId,
            OccurredAt = openedAt,
            Category = "Bolinhas",
            Amount = ball.CanPrice ?? 0,
            BallCanId = ball.Id,
            BallOpeningId = opening.Id,
            Note = ball.Name
        });
    }

    private async Task RefreshLastOpenedAsync(Guid ballId, CancellationToken cancellationToken)
    {
        var latest = await db.BallOpenings.AsNoTracking()
            .Where(opening => opening.BallCanId == ballId)
            .OrderByDescending(opening => opening.OpenedAt)
            .Select(opening => (DateTime?)opening.OpenedAt)
            .FirstOrDefaultAsync(cancellationToken);
        await db.BallCans
            .Where(ball => ball.Id == ballId)
            .ExecuteUpdateAsync(setters => setters.SetProperty(ball => ball.LastOpenedAt, latest), cancellationToken);
        var ball = await db.BallCans.AsNoTracking().FirstOrDefaultAsync(item => item.Id == ballId, cancellationToken);
        if (ball is null)
        {
            return;
        }

        var finance = await db.UserFinances.FirstOrDefaultAsync(item => item.UserId == ball.UserId, cancellationToken);
        if (finance is null)
        {
            return;
        }

        var balls = await db.BallCans.Where(item => item.UserId == ball.UserId).ToListAsync(cancellationToken);
        ApplyLegacyBallFields(finance, balls);
        await db.SaveChangesAsync(cancellationToken);
    }

    private sealed record ExpenseBuild(Expense? Expense, string? Error, int Status);

    private async Task<ExpenseBuild> TryBuildExpenseAsync(
        Guid userId,
        ExpenseRequest request,
        Expense? expense,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(request.Category) || !Categories.Contains(request.Category))
        {
            return new ExpenseBuild(null, "Categoria inválida.", 400);
        }

        if (!TryNormalizePrice(request.Amount, out var amount, out var error) || amount is null)
        {
            return new ExpenseBuild(null, error ?? "Informe o valor.", 400);
        }

        if (request.RacketId is Guid racketId)
        {
            var owned = await db.Rackets.AsNoTracking()
                .AnyAsync(racket => racket.Id == racketId && racket.UserId == userId, cancellationToken);
            if (!owned)
            {
                return new ExpenseBuild(null, "Raquete não encontrada.", 404);
            }
        }

        if (request.BallCanId is Guid ballId)
        {
            var owned = await db.BallCans.AsNoTracking()
                .AnyAsync(ball => ball.Id == ballId && ball.UserId == userId, cancellationToken);
            if (!owned)
            {
                return new ExpenseBuild(null, "Bolinha não encontrada.", 404);
            }
        }

        expense ??= new Expense { UserId = userId, Category = request.Category };
        expense.OccurredAt = request.OccurredAt.ToUniversalTime();
        expense.Category = request.Category;
        expense.Amount = amount.Value;
        expense.RacketId = request.RacketId;
        expense.BallCanId = request.BallCanId;
        expense.Note = TrimToNull(request.Note);
        return new ExpenseBuild(expense, null, 200);
    }

    private static ExpenseResponse ToExpense(Expense expense) =>
        new(
            expense.Id,
            expense.OccurredAt,
            expense.Category,
            expense.Amount,
            expense.RacketId,
            expense.BallCanId,
            expense.RacketServiceId,
            expense.BallOpeningId,
            expense.Note);

    private static DateOnly CivilDay(DateTime value)
    {
        var utc = value.Kind == DateTimeKind.Utc ? value : value.ToUniversalTime();
        return DateOnly.FromDateTime(utc.AddHours(-3));
    }

    private static bool InCivilMonth(DateTime value, int year, int month)
    {
        var day = CivilDay(value);
        return day.Year == year && day.Month == month;
    }

    private static DateTime CivilNoon(int year, int month, int day) =>
        new DateTime(year, month, day, 15, 0, 0, DateTimeKind.Utc);

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
