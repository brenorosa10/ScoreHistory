namespace ScoreHistory.Api.Models;

public sealed class Opponent
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid UserId { get; set; }
    public required string Name { get; set; }
    public string? Strengths { get; set; }
    public string? Weaknesses { get; set; }
    public string? Notes { get; set; }
    public required string Handedness { get; set; }
}
