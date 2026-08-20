namespace ScoreHistory.Api.Models;

public sealed class Racket
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid UserId { get; set; }
    public required string Name { get; set; }
    public string? StringName { get; set; }
    public decimal? TensionLb { get; set; }
    public string? Grip { get; set; }
    public string? Notes { get; set; }
    public string FrameColor { get; set; } = "#1f2937";
    public string StringColor { get; set; } = "#e5e7eb";
    public string GripColor { get; set; } = "#44403c";

    public List<RacketService> Services { get; set; } = [];
}
