using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ScoreHistory.Api.Auth;
using ScoreHistory.Api.Data;
using ScoreHistory.Api.Models;

namespace ScoreHistory.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/rackets")]
public sealed class RacketsController(AppDbContext db) : ControllerBase
{
    private static readonly HashSet<string> ServiceKinds = ["Corda", "Overgrip", "Grip", "Outro"];

    public sealed record RacketServiceRequest(
        Guid? Id,
        string Kind,
        DateTime ChangedAt,
        string? Detail,
        decimal? TensionLb);

    public sealed record RacketRequest(
        string Name,
        string? StringName,
        decimal? TensionLb,
        string? Grip,
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
        string? StringName,
        decimal? TensionLb,
        string? Grip,
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

        if (!TryMapServices(request.Services, out var services, out var error))
        {
            return BadRequest(new { message = error });
        }

        var racket = new Racket
        {
            UserId = userId.Value,
            Name = request.Name.Trim(),
            StringName = TrimToNull(request.StringName),
            TensionLb = request.TensionLb,
            Grip = TrimToNull(request.Grip),
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

        if (!TryMapServices(request.Services, out var services, out var error))
        {
            return BadRequest(new { message = error });
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
        var stringName = TrimToNull(request.StringName);
        var grip = TrimToNull(request.Grip);
        var notes = TrimToNull(request.Notes);

        await using var transaction = await db.Database.BeginTransactionAsync(cancellationToken);

        await db.RacketServices
            .Where(service => service.RacketId == id)
            .ExecuteDeleteAsync(cancellationToken);

        await db.Rackets
            .Where(racket => racket.Id == id && racket.UserId == userId)
            .ExecuteUpdateAsync(
                setters => setters
                    .SetProperty(racket => racket.Name, name)
                    .SetProperty(racket => racket.StringName, stringName)
                    .SetProperty(racket => racket.TensionLb, request.TensionLb)
                    .SetProperty(racket => racket.Grip, grip)
                    .SetProperty(racket => racket.Notes, notes)
                    .SetProperty(racket => racket.FrameColor, frameColor)
                    .SetProperty(racket => racket.StringColor, stringColor)
                    .SetProperty(racket => racket.GripColor, gripColor),
                cancellationToken);

        foreach (var service in services)
        {
            service.RacketId = id;
            db.RacketServices.Add(service);
        }

        if (services.Count > 0)
        {
            await db.SaveChangesAsync(cancellationToken);
        }

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

    private Task<Racket?> FindOwnedAsync(Guid id, Guid userId, CancellationToken cancellationToken) =>
        db.Rackets
            .Include(racket => racket.Services)
            .FirstOrDefaultAsync(racket => racket.Id == id && racket.UserId == userId, cancellationToken);

    private static bool TryMapServices(
        IReadOnlyList<RacketServiceRequest>? requests,
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

            services.Add(new RacketService
            {
                Kind = item.Kind,
                ChangedAt = item.ChangedAt.ToUniversalTime(),
                Detail = TrimToNull(item.Detail),
                TensionLb = item.TensionLb
            });
        }

        return true;
    }

    private static RacketResponse ToResponse(Racket racket) =>
        new(
            racket.Id,
            racket.Name,
            racket.StringName,
            racket.TensionLb,
            racket.Grip,
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
