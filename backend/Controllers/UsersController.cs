using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ScoreHistory.Api.Auth;
using ScoreHistory.Api.Models;
using ScoreHistory.Api.Services;

namespace ScoreHistory.Api.Controllers;

[ApiController]
[Route("api/users")]
public sealed class UsersController(UserStore users) : ControllerBase
{
    public sealed record CreateUserRequest(string Email, string Password, string Name);

    public sealed record UserResponse(Guid Id, string Email, string? Name, IReadOnlyList<string> Sports, bool SportsConfirmed);

    public sealed record UpdateSportsRequest(IReadOnlyList<string>? Sports);

    [HttpPost]
    [AllowAnonymous]
    public async Task<ActionResult<UserResponse>> Create(
        [FromBody] CreateUserRequest request,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(request.Name) ||
            string.IsNullOrWhiteSpace(request.Email) ||
            string.IsNullOrWhiteSpace(request.Password))
        {
            return BadRequest(new { message = "Nome, email e senha são obrigatórios." });
        }

        if (request.Password.Length < 6)
        {
            return BadRequest(new { message = "A senha deve ter pelo menos 6 caracteres." });
        }

        if (await users.FindByEmailAsync(request.Email, cancellationToken) is not null)
        {
            return Conflict(new { message = "Este email já está cadastrado." });
        }

        var user = await users.CreateAsync(request.Email.Trim(), request.Password, request.Name, cancellationToken);
        var body = ToResponse(user);
        return Created($"/api/users/{user.Id}", body);
    }

    [HttpGet("{id:guid}")]
    [Authorize]
    public async Task<ActionResult<UserResponse>> GetById(Guid id, CancellationToken cancellationToken)
    {
        var user = await users.FindByIdAsync(id, cancellationToken);
        if (user is null)
        {
            return NotFound(new { message = "Usuário não encontrado." });
        }

        return Ok(ToResponse(user));
    }

    [HttpPut("me/sports")]
    [Authorize]
    public async Task<ActionResult<UserResponse>> UpdateSports(
        [FromBody] UpdateSportsRequest request,
        CancellationToken cancellationToken)
    {
        var userId = CurrentUser.GetId(User);
        if (userId is null)
        {
            return Unauthorized();
        }

        var sports = Sports.Parse(request.Sports);
        if (sports.Count == 0)
        {
            return BadRequest(new { message = "Escolha pelo menos um esporte." });
        }

        if (request.Sports is not null && request.Sports.Count != sports.Count)
        {
            return BadRequest(new { message = "Esporte inválido." });
        }

        var user = await users.FindByIdAsync(userId.Value, cancellationToken);
        if (user is null)
        {
            return NotFound(new { message = "Usuário não encontrado." });
        }

        user.Sports = Sports.Format(sports);
        user.SportsConfirmed = true;
        await users.SaveAsync(user, cancellationToken);
        return Ok(ToResponse(user));
    }

    private static UserResponse ToResponse(User user) =>
        new(user.Id, user.Email, user.Name, Sports.Parse(user.Sports), user.SportsConfirmed);
}
