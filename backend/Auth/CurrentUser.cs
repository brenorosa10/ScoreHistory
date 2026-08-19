using System.Security.Claims;

namespace ScoreHistory.Api.Auth;

public static class CurrentUser
{
    public static Guid? GetId(ClaimsPrincipal user)
    {
        var id = user.FindFirstValue(ClaimTypes.NameIdentifier) ?? user.FindFirstValue("sub");
        return Guid.TryParse(id, out var guid) ? guid : null;
    }
}
