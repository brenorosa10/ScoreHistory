namespace ScoreHistory.Api.Models;

public sealed class RacketService
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid RacketId { get; set; }
    public required string Kind { get; set; }
    public DateTime ChangedAt { get; set; } = DateTime.UtcNow;
    public string? Detail { get; set; }
    public decimal? TensionLb { get; set; }
}
