namespace ScoreHistory.Api.Models;

public sealed class User
{
    public Guid Id { get; init; } = Guid.NewGuid();
    public required string Email { get; init; }
    public string? Name { get; init; }
    public required string PasswordHash { get; set; }
}
