namespace ScoreHistory.Api.Models;

public sealed class BallOpening
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid UserId { get; set; }
    public Guid BallCanId { get; set; }
    public DateTime OpenedAt { get; set; }
}
