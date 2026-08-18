using Microsoft.AspNetCore.Identity;
using ScoreHistory.Api.Models;

namespace ScoreHistory.Api.Services;

public sealed class InMemoryUserStore
{
    private readonly List<User> _users = [];
    private readonly PasswordHasher<User> _passwordHasher = new();
    private readonly Lock _lock = new();

    public InMemoryUserStore()
    {
        var demo = new User
        {
            Email = "admin@scorehistory.local",
            Name = "Admin",
            PasswordHash = string.Empty
        };
        demo.PasswordHash = _passwordHasher.HashPassword(demo, "Admin123!");
        _users.Add(demo);
    }

    public User? FindByEmail(string email)
    {
        lock (_lock)
        {
            return _users.FirstOrDefault(user =>
                string.Equals(user.Email, email, StringComparison.OrdinalIgnoreCase));
        }
    }

    public User? FindById(Guid id)
    {
        lock (_lock)
        {
            return _users.FirstOrDefault(user => user.Id == id);
        }
    }

    public bool VerifyPassword(User user, string password) =>
        _passwordHasher.VerifyHashedPassword(user, user.PasswordHash, password)
            is not PasswordVerificationResult.Failed;

    public User Create(string email, string password, string? name)
    {
        lock (_lock)
        {
            if (_users.Any(user => string.Equals(user.Email, email, StringComparison.OrdinalIgnoreCase)))
            {
                throw new InvalidOperationException("Email already registered.");
            }

            var user = new User
            {
                Email = email,
                Name = string.IsNullOrWhiteSpace(name) ? null : name.Trim(),
                PasswordHash = string.Empty
            };
            user.PasswordHash = _passwordHasher.HashPassword(user, password);
            _users.Add(user);
            return user;
        }
    }
}
