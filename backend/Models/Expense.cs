namespace ScoreHistory.Api.Models;

public sealed class Expense
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid UserId { get; set; }
    public DateTime OccurredAt { get; set; }
    public required string Category { get; set; }
    public decimal Amount { get; set; }
    public Guid? RacketId { get; set; }
    public Guid? BallCanId { get; set; }
    public Guid? RacketServiceId { get; set; }
    public Guid? BallOpeningId { get; set; }
    public string? Note { get; set; }
}
