namespace ScoreHistory.Api.Models;

public sealed class User
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public required string Email { get; set; }
    public string? Name { get; set; }
    public required string PasswordHash { get; set; }
}
