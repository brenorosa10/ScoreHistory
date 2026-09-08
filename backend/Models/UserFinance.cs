namespace ScoreHistory.Api.Models;

public sealed class UserFinance
{
    public Guid UserId { get; set; }
    public decimal? LessonPrice { get; set; }
    public decimal? ClubPrice { get; set; }
    public decimal? BallCanPrice { get; set; }
    public decimal? StringPrice { get; set; }
    public decimal? OvergripPrice { get; set; }
    public decimal? CushionGripPrice { get; set; }
    public string? BallName { get; set; }
    public DateTime? LastBallCanOpenedAt { get; set; }
}
