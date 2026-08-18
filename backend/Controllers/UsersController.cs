using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ScoreHistory.Api.Models;
using ScoreHistory.Api.Services;

namespace ScoreHistory.Api.Controllers;

[ApiController]
[Route("api/users")]
public sealed class UsersController(InMemoryUserStore users) : ControllerBase
{
    public sealed record CreateUserRequest(string Email, string Password, string? Name);

    public sealed record UserResponse(Guid Id, string Email, string? Name);

    [HttpPost]
    [AllowAnonymous]
    public ActionResult<UserResponse> Create([FromBody] CreateUserRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Email) || string.IsNullOrWhiteSpace(request.Password))
        {
            return BadRequest(new { message = "Email e senha são obrigatórios." });
        }

        if (request.Password.Length < 8)
        {
            return BadRequest(new { message = "A senha deve ter pelo menos 8 caracteres." });
        }

        if (users.FindByEmail(request.Email) is not null)
        {
            return Conflict(new { message = "Este email já está cadastrado." });
        }

        var user = users.Create(request.Email.Trim(), request.Password, request.Name);
        var body = ToResponse(user);
        return Created($"/api/users/{user.Id}", body);
    }

    [HttpGet("{id:guid}")]
    [Authorize]
    public ActionResult<UserResponse> GetById(Guid id)
    {
        var user = users.FindById(id);
        if (user is null)
        {
            return NotFound(new { message = "Usuário não encontrado." });
        }

        return Ok(ToResponse(user));
    }

    private static UserResponse ToResponse(User user) => new(user.Id, user.Email, user.Name);
}
