namespace ScoreHistory.Api.Models;

public sealed class Match
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid UserId { get; set; }
    public Guid OpponentId { get; set; }
    public DateTime PlayedAt { get; set; } = DateTime.UtcNow;
    public required string Score { get; set; }
    public bool Won { get; set; }
    public required string CourtType { get; set; }
    public string? Notes { get; set; }
    public string? Strengths { get; set; }
    public string? Weaknesses { get; set; }
    public string? OpponentStrengths { get; set; }
    public string? OpponentWeaknesses { get; set; }

    public Opponent? Opponent { get; set; }
}
