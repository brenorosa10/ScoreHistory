using Microsoft.EntityFrameworkCore;
using ScoreHistory.Api.Data;
using ScoreHistory.Api.Models;
using ScoreHistory.Api.Services;
using Xunit;

namespace ScoreHistory.Api.Tests;

public sealed class UserSportsUpdateTests
{
    [Fact]
    public async Task Existing_user_with_no_saved_sports_can_replace_the_tennis_default()
    {
        await using var db = await CreateDbAsync();
        var existing = new User
        {
            Email = "ana@example.com",
            Name = "Ana",
            PasswordHash = "hash",
            Sports = null,
            SportsConfirmed = true
        };
        db.Users.Add(existing);
        await db.SaveChangesAsync();
        db.ChangeTracker.Clear();

        var store = new UserStore(db);
        var updated = await store.UpdateSportsAsync(existing.Id, ["Padel", "Beach tennis"]);

        Assert.NotNull(updated);
        Assert.Equal(["Padel", "Beach tennis"], Sports.Parse(updated.Sports));
        Assert.True(updated.SportsConfirmed);

        db.ChangeTracker.Clear();
        var reloaded = await db.Users.SingleAsync(user => user.Id == existing.Id);
        Assert.Equal(",Padel,Beach tennis,", reloaded.Sports);
        Assert.True(reloaded.SportsConfirmed);
    }

    private static async Task<AppDbContext> CreateDbAsync()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseSqlite("Data Source=user-sports-tests;Mode=Memory;Cache=Shared")
            .Options;
        var db = new AppDbContext(options);
        await db.Database.OpenConnectionAsync();
        await db.Database.EnsureCreatedAsync();
        return db;
    }
}
