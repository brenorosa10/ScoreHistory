using System.Text;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using ScoreHistory.Api.Auth;
using ScoreHistory.Api.Data;
using ScoreHistory.Api.Services;

var builder = WebApplication.CreateBuilder(args);

var listenPort = Environment.GetEnvironmentVariable("PORT");
if (!string.IsNullOrWhiteSpace(listenPort))
{
    builder.WebHost.UseUrls($"http://0.0.0.0:{listenPort}");
}

builder.Configuration.AddJsonFile("appsettings.Local.json", optional: true, reloadOnChange: true);

builder.Services.AddControllers();
builder.Services.AddOpenApi();

var connectionString = NormalizePostgres(builder.Configuration.GetConnectionString("Default"));
if (string.IsNullOrWhiteSpace(connectionString))
{
    throw new InvalidOperationException(
        "ConnectionStrings:Default is missing. Copy backend/appsettings.Local.json with the Supabase URI.");
}

builder.Services.AddDbContext<AppDbContext>(options => options.UseNpgsql(connectionString));
builder.Services.AddScoped<UserStore>();
builder.Services.AddSingleton<JwtTokenService>();

var jwtSection = builder.Configuration.GetSection(JwtOptions.SectionName);
builder.Services.Configure<JwtOptions>(jwtSection);
var jwt = jwtSection.Get<JwtOptions>()
    ?? throw new InvalidOperationException("Jwt configuration is missing.");

if (jwt.Key.Length < 32)
{
    throw new InvalidOperationException("Jwt:Key must be at least 32 characters.");
}

builder.Services
    .AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateIssuerSigningKey = true,
            ValidateLifetime = true,
            ValidIssuer = jwt.Issuer,
            ValidAudience = jwt.Audience,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwt.Key)),
            ClockSkew = TimeSpan.FromMinutes(1)
        };
    });

builder.Services.AddAuthorization();

builder.Services.AddCors(options =>
{
    var origins = builder.Configuration["Cors:Origins"]
        ?.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
        ?? ["http://localhost:5173"];

    options.AddPolicy("frontend", policy =>
        policy.WithOrigins(origins)
            .AllowAnyHeader()
            .AllowAnyMethod());
});

var app = builder.Build();

app.MapGet("/api/health", () => Results.Ok(new { ok = true }));

app.Lifetime.ApplicationStarted.Register(() =>
{
    _ = EnsureSchemaAsync(app.Services);
});

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

app.UseCors("frontend");

if (!app.Environment.IsDevelopment() && string.IsNullOrEmpty(Environment.GetEnvironmentVariable("PORT")))
{
    app.UseHttpsRedirection();
}

app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();

app.Run();

static string? NormalizePostgres(string? connectionString)
{
    if (string.IsNullOrWhiteSpace(connectionString))
    {
        return connectionString;
    }

    var trimmed = connectionString.Trim().Trim('"').Trim('\'');
    var isUri = trimmed.StartsWith("postgres://", StringComparison.OrdinalIgnoreCase)
        || trimmed.StartsWith("postgresql://", StringComparison.OrdinalIgnoreCase);
    if (isUri && trimmed.IndexOf("sslmode=", StringComparison.OrdinalIgnoreCase) < 0)
    {
        trimmed += trimmed.Contains('?') ? "&sslmode=require" : "?sslmode=require";
    }

    return trimmed;
}

static async Task EnsureSchemaAsync(IServiceProvider services)
{
    try
    {
        await using var scope = services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        await db.Database.ExecuteSqlRawAsync(
            """
            CREATE TABLE IF NOT EXISTS users (
                "Id" uuid NOT NULL,
                "Email" character varying(256) NOT NULL,
                "Name" character varying(256),
                "PasswordHash" text NOT NULL,
                CONSTRAINT "PK_users" PRIMARY KEY ("Id")
            );
            CREATE UNIQUE INDEX IF NOT EXISTS "IX_users_Email" ON users ("Email");

            CREATE TABLE IF NOT EXISTS opponents (
                "Id" uuid NOT NULL,
                "UserId" uuid NOT NULL,
                "Name" character varying(256) NOT NULL,
                "Strengths" text,
                "Weaknesses" text,
                "Notes" text,
                "Handedness" character varying(16) NOT NULL,
                CONSTRAINT "PK_opponents" PRIMARY KEY ("Id"),
                CONSTRAINT "FK_opponents_users_UserId" FOREIGN KEY ("UserId") REFERENCES users ("Id") ON DELETE CASCADE
            );
            CREATE INDEX IF NOT EXISTS "IX_opponents_UserId" ON opponents ("UserId");

            CREATE TABLE IF NOT EXISTS matches (
                "Id" uuid NOT NULL,
                "UserId" uuid NOT NULL,
                "OpponentId" uuid NOT NULL,
                "PlayedAt" timestamp with time zone NOT NULL,
                "Score" character varying(64) NOT NULL,
                "Won" boolean NOT NULL,
                "CourtType" character varying(32) NOT NULL,
                "Notes" text,
                "Strengths" text,
                "Weaknesses" text,
                "OpponentStrengths" text,
                "OpponentWeaknesses" text,
                CONSTRAINT "PK_matches" PRIMARY KEY ("Id"),
                CONSTRAINT "FK_matches_users_UserId" FOREIGN KEY ("UserId") REFERENCES users ("Id") ON DELETE CASCADE,
                CONSTRAINT "FK_matches_opponents_OpponentId" FOREIGN KEY ("OpponentId") REFERENCES opponents ("Id") ON DELETE RESTRICT
            );
            CREATE INDEX IF NOT EXISTS "IX_matches_UserId" ON matches ("UserId");
            CREATE INDEX IF NOT EXISTS "IX_matches_OpponentId" ON matches ("OpponentId");

            CREATE TABLE IF NOT EXISTS rackets (
                "Id" uuid NOT NULL,
                "UserId" uuid NOT NULL,
                "Name" character varying(256) NOT NULL,
                "StringName" character varying(256),
                "TensionLb" numeric(5,1),
                "Grip" character varying(256),
                "Notes" text,
                "FrameColor" character varying(7) NOT NULL DEFAULT '#1f2937',
                "StringColor" character varying(7) NOT NULL DEFAULT '#e5e7eb',
                "GripColor" character varying(7) NOT NULL DEFAULT '#44403c',
                CONSTRAINT "PK_rackets" PRIMARY KEY ("Id"),
                CONSTRAINT "FK_rackets_users_UserId" FOREIGN KEY ("UserId") REFERENCES users ("Id") ON DELETE CASCADE
            );
            CREATE INDEX IF NOT EXISTS "IX_rackets_UserId" ON rackets ("UserId");

            CREATE TABLE IF NOT EXISTS racket_services (
                "Id" uuid NOT NULL,
                "RacketId" uuid NOT NULL,
                "Kind" character varying(32) NOT NULL,
                "ChangedAt" timestamp with time zone NOT NULL,
                "Detail" character varying(256),
                "TensionLb" numeric(5,1),
                CONSTRAINT "PK_racket_services" PRIMARY KEY ("Id"),
                CONSTRAINT "FK_racket_services_rackets_RacketId" FOREIGN KEY ("RacketId") REFERENCES rackets ("Id") ON DELETE CASCADE
            );
            CREATE INDEX IF NOT EXISTS "IX_racket_services_RacketId" ON racket_services ("RacketId");

            ALTER TABLE rackets ADD COLUMN IF NOT EXISTS "FrameColor" character varying(7) NOT NULL DEFAULT '#1f2937';
            ALTER TABLE rackets ADD COLUMN IF NOT EXISTS "StringColor" character varying(7) NOT NULL DEFAULT '#e5e7eb';
            ALTER TABLE rackets ADD COLUMN IF NOT EXISTS "GripColor" character varying(7) NOT NULL DEFAULT '#44403c';
            """);
        await scope.ServiceProvider.GetRequiredService<UserStore>().EnsureDemoUserAsync();
    }
    catch (Exception ex)
    {
        Console.Error.WriteLine($"Database startup failed: {ex}");
    }
}
