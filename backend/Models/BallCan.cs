namespace ScoreHistory.Api.Models;

public sealed class BallCan
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid UserId { get; set; }
    public string? Name { get; set; }
    public decimal? CanPrice { get; set; }
    public DateTime? LastOpenedAt { get; set; }
    public int SortOrder { get; set; }
}
