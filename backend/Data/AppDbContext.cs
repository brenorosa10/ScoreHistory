using Microsoft.EntityFrameworkCore;
using ScoreHistory.Api.Models;

namespace ScoreHistory.Api.Data;

public sealed class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options)
{
    public DbSet<User> Users => Set<User>();
    public DbSet<Opponent> Opponents => Set<Opponent>();
    public DbSet<Match> Matches => Set<Match>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<User>(entity =>
        {
            entity.ToTable("users");
            entity.HasKey(user => user.Id);
            entity.HasIndex(user => user.Email).IsUnique();
            entity.Property(user => user.Email).HasMaxLength(256).IsRequired();
            entity.Property(user => user.Name).HasMaxLength(256);
            entity.Property(user => user.PasswordHash).IsRequired();
        });

        modelBuilder.Entity<Opponent>(entity =>
        {
            entity.ToTable("opponents");
            entity.HasKey(opponent => opponent.Id);
            entity.HasIndex(opponent => opponent.UserId);
            entity.Property(opponent => opponent.Name).HasMaxLength(256).IsRequired();
            entity.Property(opponent => opponent.Handedness).HasMaxLength(16).IsRequired();
        });

        modelBuilder.Entity<Match>(entity =>
        {
            entity.ToTable("matches");
            entity.HasKey(match => match.Id);
            entity.HasIndex(match => match.UserId);
            entity.Property(match => match.Score).HasMaxLength(64).IsRequired();
            entity.Property(match => match.CourtType).HasMaxLength(32).IsRequired();
            entity.HasOne(match => match.Opponent)
                .WithMany()
                .HasForeignKey(match => match.OpponentId)
                .OnDelete(DeleteBehavior.Restrict);
        });
    }
}
