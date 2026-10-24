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
[Route("api/rackets")]
public sealed class RacketsController(AppDbContext db) : ControllerBase
{
    private static readonly HashSet<string> ServiceKinds = ["Corda", "Overgrip", "Grip", "Outro"];
    private static readonly HashSet<string> Sports = ["Tênis", "Padel", "Beach tennis"];

    public sealed record RacketServiceRequest(
        Guid? Id,
        string Kind,
        DateTime ChangedAt,
        string? Detail,
        decimal? TensionLb);

    public sealed record RacketRequest(
        string Name,
        string? Sport,
        string? StringName,
        decimal? TensionLb,
        string? Grip,
        decimal? PurchasePrice,
        string? Notes,
        string? FrameColor,
        string? StringColor,
        string? GripColor,
        IReadOnlyList<RacketServiceRequest>? Services);

    public sealed record RacketServiceResponse(
        Guid Id,
        string Kind,
        DateTime ChangedAt,
        string? Detail,
        decimal? TensionLb);

    public sealed record RacketResponse(
        Guid Id,
        string Name,
        string Sport,
        string? StringName,
        decimal? TensionLb,
        string? Grip,
        decimal? PurchasePrice,
        string? Notes,
        string FrameColor,
        string StringColor,
        string GripColor,
        IReadOnlyList<RacketServiceResponse> Services);

    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<RacketResponse>>> List(CancellationToken cancellationToken)
    {
        var userId = CurrentUser.GetId(User);
        if (userId is null)
        {
            return Unauthorized();
        }

        var rackets = await db.Rackets
            .Include(racket => racket.Services)
            .Where(racket => racket.UserId == userId)
            .OrderBy(racket => racket.Name)
            .ToListAsync(cancellationToken);

        return Ok(rackets.Select(ToResponse).ToList());
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<RacketResponse>> Get(Guid id, CancellationToken cancellationToken)
    {
        var userId = CurrentUser.GetId(User);
        if (userId is null)
        {
            return Unauthorized();
        }

        var racket = await FindOwnedAsync(id, userId.Value, cancellationToken);
        if (racket is null)
        {
            return NotFound(new { message = "Raquete não encontrada." });
        }

        return Ok(ToResponse(racket));
    }

    [HttpPost]
    public async Task<ActionResult<RacketResponse>> Create(
        [FromBody] RacketRequest request,
        CancellationToken cancellationToken)
    {
        var userId = CurrentUser.GetId(User);
        if (userId is null)
        {
            return Unauthorized();
        }

        if (string.IsNullOrWhiteSpace(request.Name))
        {
            return BadRequest(new { message = "Informe o nome da raquete." });
        }

        if (!TryNormalizeSport(request.Sport, out var sport, out var sportError))
        {
            return BadRequest(new { message = sportError });
        }

        if (!TryMapServices(request.Services, sport, out var services, out var error))
        {
            return BadRequest(new { message = error });
        }

        if (!AllowsStrings(sport) && (request.TensionLb is not null || !string.IsNullOrWhiteSpace(request.StringName)))
        {
            return BadRequest(new { message = "Raquetes de padel e beach tennis não usam corda." });
        }

        if (request.PurchasePrice is < 0)
        {
            return BadRequest(new { message = "Informe um valor maior ou igual a zero." });
        }

        var racket = new Racket
        {
            UserId = userId.Value,
            Name = request.Name.Trim(),
            Sport = sport,
            StringName = AllowsStrings(sport) ? TrimToNull(request.StringName) : null,
            TensionLb = AllowsStrings(sport) ? request.TensionLb : null,
            Grip = TrimToNull(request.Grip),
            PurchasePrice = request.PurchasePrice,
            Notes = TrimToNull(request.Notes),
            FrameColor = NormalizeColor(request.FrameColor, "#1f2937"),
            StringColor = NormalizeColor(request.StringColor, "#e5e7eb"),
            GripColor = NormalizeColor(request.GripColor, "#44403c"),
            Services = services
        };

        db.Rackets.Add(racket);
        await db.SaveChangesAsync(cancellationToken);
        return Created($"/api/rackets/{racket.Id}", ToResponse(racket));
    }

    [HttpPut("{id:guid}")]
    public async Task<ActionResult<RacketResponse>> Update(
        Guid id,
        [FromBody] RacketRequest request,
        CancellationToken cancellationToken)
    {
        var userId = CurrentUser.GetId(User);
        if (userId is null)
        {
            return Unauthorized();
        }

        if (string.IsNullOrWhiteSpace(request.Name))
        {
            return BadRequest(new { message = "Informe o nome da raquete." });
        }

        if (!TryNormalizeSport(request.Sport, out var sport, out var sportError))
        {
            return BadRequest(new { message = sportError });
        }

        if (!TryMapServices(request.Services, sport, out var services, out var error))
        {
            return BadRequest(new { message = error });
        }

        if (!AllowsStrings(sport) && (request.TensionLb is not null || !string.IsNullOrWhiteSpace(request.StringName)))
        {
            return BadRequest(new { message = "Raquetes de padel e beach tennis não usam corda." });
        }

        if (request.PurchasePrice is < 0)
        {
            return BadRequest(new { message = "Informe um valor maior ou igual a zero." });
        }

        var owned = await db.Rackets.AsNoTracking()
            .AnyAsync(racket => racket.Id == id && racket.UserId == userId, cancellationToken);
        if (!owned)
        {
            return NotFound(new { message = "Raquete não encontrada." });
        }

        var frameColor = NormalizeColor(request.FrameColor, "#1f2937");
        var stringColor = NormalizeColor(request.StringColor, "#e5e7eb");
        var gripColor = NormalizeColor(request.GripColor, "#44403c");
        var name = request.Name.Trim();
        var stringName = AllowsStrings(sport) ? TrimToNull(request.StringName) : null;
        var tensionLb = AllowsStrings(sport) ? request.TensionLb : null;
        var grip = TrimToNull(request.Grip);
        var notes = TrimToNull(request.Notes);

        await using var transaction = await db.Database.BeginTransactionAsync(cancellationToken);

        if (request.Services is not null)
        {
            var existingServices = await db.RacketServices
                .Where(service => service.RacketId == id)
                .ToListAsync(cancellationToken);
            var plan = ServiceIdSync.Plan(
                existingServices.Select(service => service.Id),
                services.Select(service => (Guid?)service.Id));

            foreach (var service in services)
            {
                var current = existingServices.FirstOrDefault(item => item.Id == service.Id);
                if (current is null)
                {
                    service.RacketId = id;
                    db.RacketServices.Add(service);
                    continue;
                }

                current.Kind = service.Kind;
                current.ChangedAt = service.ChangedAt;
                current.Detail = service.Detail;
                current.TensionLb = service.TensionLb;
            }

            if (plan.RemovedIds.Count > 0)
            {
                var linkedExpenses = await db.Expenses
                    .Where(expense => expense.RacketServiceId != null && plan.RemovedIds.Contains(expense.RacketServiceId.Value))
                    .ToListAsync(cancellationToken);
                db.Expenses.RemoveRange(linkedExpenses);
                db.RacketServices.RemoveRange(existingServices.Where(service => plan.RemovedIds.Contains(service.Id)));
            }
        }

        await db.Rackets
            .Where(racket => racket.Id == id && racket.UserId == userId)
            .ExecuteUpdateAsync(
                setters => setters
                    .SetProperty(racket => racket.Name, name)
                    .SetProperty(racket => racket.Sport, sport)
                    .SetProperty(racket => racket.StringName, stringName)
                    .SetProperty(racket => racket.TensionLb, tensionLb)
                    .SetProperty(racket => racket.Grip, grip)
                    .SetProperty(racket => racket.PurchasePrice, request.PurchasePrice)
                    .SetProperty(racket => racket.Notes, notes)
                    .SetProperty(racket => racket.FrameColor, frameColor)
                    .SetProperty(racket => racket.StringColor, stringColor)
                    .SetProperty(racket => racket.GripColor, gripColor),
                cancellationToken);

        await db.SaveChangesAsync(cancellationToken);
        await transaction.CommitAsync(cancellationToken);

        var racket = await FindOwnedAsync(id, userId.Value, cancellationToken);
        return Ok(ToResponse(racket!));
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken cancellationToken)
    {
        var userId = CurrentUser.GetId(User);
        if (userId is null)
        {
            return Unauthorized();
        }

        var racket = await FindOwnedAsync(id, userId.Value, cancellationToken);
        if (racket is null)
        {
            return NotFound(new { message = "Raquete não encontrada." });
        }

        db.Rackets.Remove(racket);
        await db.SaveChangesAsync(cancellationToken);
        return NoContent();
    }

    [HttpPost("{id:guid}/services")]
    public async Task<ActionResult<RacketServiceResponse>> AddService(
        Guid id,
        [FromBody] RacketServiceRequest request,
        CancellationToken cancellationToken)
    {
        var userId = CurrentUser.GetId(User);
        if (userId is null)
        {
            return Unauthorized();
        }

        var sport = await db.Rackets.AsNoTracking()
            .Where(racket => racket.Id == id && racket.UserId == userId)
            .Select(racket => racket.Sport)
            .FirstOrDefaultAsync(cancellationToken);
        if (sport is null)
        {
            return NotFound(new { message = "Raquete não encontrada." });
        }

        if (!TryMapServices([request], string.IsNullOrWhiteSpace(sport) ? "Tênis" : sport, out var services, out var error))
        {
            return BadRequest(new { message = error });
        }

        var service = services[0];
        service.RacketId = id;
        db.RacketServices.Add(service);
        await db.SaveChangesAsync(cancellationToken);
        return Ok(new RacketServiceResponse(service.Id, service.Kind, service.ChangedAt, service.Detail, service.TensionLb));
    }

    [HttpDelete("{id:guid}/services/{serviceId:guid}")]
    public async Task<IActionResult> DeleteService(Guid id, Guid serviceId, CancellationToken cancellationToken)
    {
        var userId = CurrentUser.GetId(User);
        if (userId is null)
        {
            return Unauthorized();
        }

        var service = await db.RacketServices
            .FirstOrDefaultAsync(item => item.Id == serviceId && item.RacketId == id, cancellationToken);
        if (service is null)
        {
            return NotFound(new { message = "Troca não encontrada." });
        }

        var owned = await db.Rackets.AsNoTracking()
            .AnyAsync(racket => racket.Id == id && racket.UserId == userId, cancellationToken);
        if (!owned)
        {
            return NotFound(new { message = "Raquete não encontrada." });
        }

        var linkedExpenses = await db.Expenses
            .Where(expense => expense.RacketServiceId == serviceId)
            .ToListAsync(cancellationToken);
        db.Expenses.RemoveRange(linkedExpenses);
        db.RacketServices.Remove(service);
        await db.SaveChangesAsync(cancellationToken);
        return NoContent();
    }

    private Task<Racket?> FindOwnedAsync(Guid id, Guid userId, CancellationToken cancellationToken) =>
        db.Rackets
            .Include(racket => racket.Services)
            .FirstOrDefaultAsync(racket => racket.Id == id && racket.UserId == userId, cancellationToken);

    private static bool TryMapServices(
        IReadOnlyList<RacketServiceRequest>? requests,
        string sport,
        out List<RacketService> services,
        out string? error)
    {
        services = [];
        error = null;

        if (requests is null)
        {
            return true;
        }

        foreach (var item in requests)
        {
            if (!ServiceKinds.Contains(item.Kind))
            {
                error = "Tipo de troca inválido.";
                return false;
            }

            if (!AllowsStrings(sport) && (item.Kind == "Corda" || item.TensionLb is not null))
            {
                error = "Raquetes de padel e beach tennis não usam corda.";
                return false;
            }

            services.Add(new RacketService
            {
                Id = item.Id ?? Guid.NewGuid(),
                Kind = item.Kind,
                ChangedAt = item.ChangedAt.ToUniversalTime(),
                Detail = TrimToNull(item.Detail),
                TensionLb = AllowsStrings(sport) ? item.TensionLb : null
            });
        }

        return true;
    }

    private static bool TryNormalizeSport(string? value, out string sport, out string? error)
    {
        sport = string.IsNullOrWhiteSpace(value) ? "Tênis" : value.Trim();
        if (Sports.Contains(sport))
        {
            error = null;
            return true;
        }

        error = "Esporte inválido. Use Tênis, Padel ou Beach tennis.";
        sport = "Tênis";
        return false;
    }

    private static bool AllowsStrings(string sport) => sport == "Tênis";

    private static RacketResponse ToResponse(Racket racket) =>
        new(
            racket.Id,
            racket.Name,
            string.IsNullOrWhiteSpace(racket.Sport) ? "Tênis" : racket.Sport,
            racket.StringName,
            racket.TensionLb,
            racket.Grip,
            racket.PurchasePrice,
            racket.Notes,
            racket.FrameColor,
            racket.StringColor,
            racket.GripColor,
            racket.Services
                .OrderByDescending(service => service.ChangedAt)
                .Select(service => new RacketServiceResponse(
                    service.Id,
                    service.Kind,
                    service.ChangedAt,
                    service.Detail,
                    service.TensionLb))
                .ToList());

    private static string NormalizeColor(string? value, string fallback)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return fallback;
        }

        var color = value.Trim();
        if (color.Length == 7 && color[0] == '#' && color[1..].All(Uri.IsHexDigit))
        {
            return color.ToLowerInvariant();
        }

        return fallback;
    }

    private static string? TrimToNull(string? value) =>
        string.IsNullOrWhiteSpace(value) ? null : value.Trim();
}
