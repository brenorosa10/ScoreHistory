namespace ScoreHistory.Api.Services;

public static class Sports
{
    public const string Tennis = "Tênis";
    public const string Padel = "Padel";
    public const string Beach = "Beach tennis";

    public static readonly string[] All = [Tennis, Padel, Beach];

    public static bool CourtApplies(string sport) => sport == Tennis;

    public static bool IsDoublesSport(string sport) => sport is Padel or Beach;

    public static string Canonical(IEnumerable<string>? values)
    {
        var parsed = Parse(values);
        return Format(parsed.Count == 0 ? [Tennis] : parsed);
    }

    public static string Format(IReadOnlyList<string> sports)
    {
        return "," + string.Join(',', sports) + ",";
    }

    public static IReadOnlyList<string> Parse(string? stored)
    {
        if (string.IsNullOrWhiteSpace(stored))
        {
            return [Tennis];
        }

        return Parse(stored.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries));
    }

    public static IReadOnlyList<string> Parse(IEnumerable<string>? values)
    {
        var list = new List<string>();
        if (values is null)
        {
            return list;
        }

        foreach (var value in values)
        {
            var sport = Normalize(value);
            if (sport is null || list.Contains(sport))
            {
                continue;
            }

            list.Add(sport);
        }

        return list;
    }

    public static string? Normalize(string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return null;
        }

        var trimmed = value.Trim();
        foreach (var sport in All)
        {
            if (string.Equals(sport, trimmed, StringComparison.OrdinalIgnoreCase))
            {
                return sport;
            }
        }

        return null;
    }

    public static bool Contains(string? stored, string sport) =>
        (stored ?? "").Contains("," + sport + ",", StringComparison.Ordinal);

    public static string Add(string? stored, string sport)
    {
        var current = Parse(stored).ToList();
        if (!current.Contains(sport))
        {
            current.Add(sport);
        }

        return Format(current);
    }
}
