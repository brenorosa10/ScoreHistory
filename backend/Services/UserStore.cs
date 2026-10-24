using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using ScoreHistory.Api.Data;
using ScoreHistory.Api.Models;

namespace ScoreHistory.Api.Services;

public sealed class UserStore(AppDbContext db)
{
    private readonly PasswordHasher<User> _passwordHasher = new();

    public Task<User?> FindByEmailAsync(string email, CancellationToken cancellationToken = default)
    {
        var normalized = email.Trim().ToLowerInvariant();
        return db.Users.FirstOrDefaultAsync(
            user => user.Email.ToLower() == normalized,
            cancellationToken);
    }

    public Task<User?> FindByIdAsync(Guid id, CancellationToken cancellationToken = default) =>
        db.Users.FirstOrDefaultAsync(user => user.Id == id, cancellationToken);

    public async Task SaveAsync(User user, CancellationToken cancellationToken = default)
    {
        await db.SaveChangesAsync(cancellationToken);
    }

    /// <summary>
    /// Writes sports for an existing account, including one that only has the schema default
    /// (Tênis, never confirmed in the app) or a null/blank column.
    /// </summary>
    public async Task<User?> UpdateSportsAsync(
        Guid id,
        IReadOnlyList<string> sports,
        CancellationToken cancellationToken = default)
    {
        var formatted = Sports.Format(sports);
        var updated = await db.Users
            .Where(user => user.Id == id)
            .ExecuteUpdateAsync(
                setters => setters
                    .SetProperty(user => user.Sports, formatted)
                    .SetProperty(user => user.SportsConfirmed, true),
                cancellationToken);
        if (updated == 0)
        {
            return null;
        }

        db.ChangeTracker.Clear();
        return await FindByIdAsync(id, cancellationToken);
    }

    public bool VerifyPassword(User user, string password) =>
        _passwordHasher.VerifyHashedPassword(user, user.PasswordHash, password)
            is not PasswordVerificationResult.Failed;

    public async Task<User> CreateAsync(
        string email,
        string password,
        string? name,
        CancellationToken cancellationToken = default)
    {
        var user = new User
        {
            Email = email.Trim(),
            Name = string.IsNullOrWhiteSpace(name) ? null : name.Trim(),
            PasswordHash = string.Empty,
            Sports = Sports.Format([Sports.Tennis]),
            SportsConfirmed = false
        };
        user.PasswordHash = _passwordHasher.HashPassword(user, password);

        db.Users.Add(user);
        await db.SaveChangesAsync(cancellationToken);
        return user;
    }

    public async Task EnsureDemoUserAsync(CancellationToken cancellationToken = default)
    {
        const string demoEmail = "admin@scorehistory.local";
        if (await FindByEmailAsync(demoEmail, cancellationToken) is not null)
        {
            return;
        }

        await CreateAsync(demoEmail, "Admin123!", "Admin", cancellationToken);
    }
}
