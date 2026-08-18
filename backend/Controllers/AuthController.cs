using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ScoreHistory.Api.Auth;
using ScoreHistory.Api.Models;
using ScoreHistory.Api.Services;

namespace ScoreHistory.Api.Controllers;

[ApiController]
[Route("api/auth")]
public sealed class AuthController(UserStore users, JwtTokenService tokens) : ControllerBase
{
    public sealed record LoginRequest(string Email, string Password);

    public sealed record AuthResponse(string AccessToken, string TokenType, DateTime ExpiresAtUtc, string Email);

    public sealed record MeResponse(string Id, string Email, string? Name);

    [HttpPost("login")]
    [AllowAnonymous]
    public async Task<ActionResult<AuthResponse>> Login(
        [FromBody] LoginRequest request,
        CancellationToken cancellationToken)
    {
        var user = await users.FindByEmailAsync(request.Email, cancellationToken);
        if (user is null || !users.VerifyPassword(user, request.Password))
        {
            return Unauthorized(new { message = "Credenciais inválidas." });
        }

        return Ok(IssueToken(user));
    }

    [HttpGet("me")]
    [Authorize]
    public async Task<ActionResult<MeResponse>> Me(CancellationToken cancellationToken)
    {
        var id = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub");
        if (id is null || !Guid.TryParse(id, out var userId))
        {
            return Unauthorized();
        }

        var user = await users.FindByIdAsync(userId, cancellationToken);
        if (user is null)
        {
            return Unauthorized();
        }

        return Ok(new MeResponse(user.Id.ToString(), user.Email, user.Name));
    }

    private AuthResponse IssueToken(User user)
    {
        var (token, expiresAtUtc) = tokens.CreateAccessToken(user);
        return new AuthResponse(token, "Bearer", expiresAtUtc, user.Email);
    }
}
