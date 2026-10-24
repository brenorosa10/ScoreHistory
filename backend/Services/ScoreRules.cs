using System.Text.RegularExpressions;

namespace ScoreHistory.Api.Services;

public static partial class ScoreRules
{
    [GeneratedRegex(
        @"\[(\d+)\s*-\s*(\d+)\]|(\d+)\s*-\s*(\d+)(?:\((\d+)(?:\s*-\s*(\d+))?\))?",
        RegexOptions.CultureInvariant)]
    private static partial Regex ScorePattern();

    public static string? Validate(string? score, bool? won, string? sport = null)
    {
        // Tennis and padel share regulation sets. Beach tennis uses the same
        // grammar (6-0..6-4, 7-5, 7-6 and a super tie-break) so a single set
        // or a no-ad event still validates without best-of-three rules.
        _ = sport;
        if (string.IsNullOrWhiteSpace(score))
        {
            return "Placar inválido";
        }

        var entries = Parse(score);
        if (entries.Count == 0 || !OnlySeparatorsLeft(score))
        {
            return "Placar inválido";
        }

        foreach (var entry in entries)
        {
            if (!IsValid(entry))
            {
                return "Placar inválido";
            }
        }

        return ResultMessage(ResolveWinner(entries), won);
    }

    private static string? ResultMessage(Side? winner, bool? won)
    {
        if (won is null)
        {
            return winner is null
                ? null
                : $"O placar aponta {(winner == Side.Home ? "vitória" : "derrota")}, mas você marcou empate.";
        }

        if (winner is null)
        {
            return "O placar está empatado. Marque empate ou ajuste os games.";
        }

        var marked = won.Value ? "vitória" : "derrota";
        if ((winner == Side.Home) != won.Value)
        {
            return $"O placar aponta {(winner == Side.Home ? "vitória" : "derrota")}, mas você marcou {marked}.";
        }

        return null;
    }

    private static List<Entry> Parse(string score)
    {
        var entries = new List<Entry>();
        foreach (Match match in ScorePattern().Matches(score))
        {
            if (match.Groups[1].Success)
            {
                entries.Add(new Entry(true, int.Parse(match.Groups[1].Value), int.Parse(match.Groups[2].Value), null, null));
                continue;
            }

            var home = int.Parse(match.Groups[3].Value);
            var away = int.Parse(match.Groups[4].Value);
            int? tbHome = null;
            int? tbAway = null;
            if (match.Groups[5].Success && match.Groups[6].Success)
            {
                tbHome = int.Parse(match.Groups[5].Value);
                tbAway = int.Parse(match.Groups[6].Value);
            }
            else if (match.Groups[5].Success)
            {
                var loserPoints = int.Parse(match.Groups[5].Value);
                var winnerPoints = loserPoints <= 5 ? 7 : loserPoints + 2;
                if (home > away)
                {
                    tbHome = winnerPoints;
                    tbAway = loserPoints;
                }
                else if (away > home)
                {
                    tbHome = loserPoints;
                    tbAway = winnerPoints;
                }
            }

            entries.Add(new Entry(false, home, away, tbHome, tbAway));
        }

        return entries;
    }

    private static bool OnlySeparatorsLeft(string score)
    {
        var remainder = ScorePattern().Replace(score, "");
        foreach (var character in remainder)
        {
            if (character is not (' ' or ',' or '\t'))
            {
                return false;
            }
        }

        return true;
    }

    private static bool IsValid(Entry entry)
    {
        if (entry.Tiebreak)
        {
            return entry.Home != entry.Away && entry.Home >= 0 && entry.Away >= 0;
        }

        if (!IsRegulationSet(entry.Home, entry.Away))
        {
            return false;
        }

        if (entry.TbHome is null && entry.TbAway is null)
        {
            return true;
        }

        var tiebreakSet = (entry.Home == 7 && entry.Away == 6) || (entry.Home == 6 && entry.Away == 7);
        if (!tiebreakSet || entry.TbHome is null || entry.TbAway is null || entry.TbHome == entry.TbAway)
        {
            return false;
        }

        return entry.TbHome > entry.TbAway == entry.Home > entry.Away;
    }

    private static bool IsRegulationSet(int home, int away)
    {
        var high = Math.Max(home, away);
        var low = Math.Min(home, away);
        if (high == 6 && low <= 4)
        {
            return true;
        }

        return high == 7 && (low == 5 || low == 6);
    }

    private static Side? ResolveWinner(IReadOnlyList<Entry> entries)
    {
        var home = 0;
        var away = 0;
        foreach (var entry in entries)
        {
            if (entry.Home > entry.Away)
            {
                home += 1;
            }
            else if (entry.Away > entry.Home)
            {
                away += 1;
            }
        }

        if (home == away)
        {
            return null;
        }

        return home > away ? Side.Home : Side.Away;
    }

    private enum Side
    {
        Home,
        Away
    }

    private sealed record Entry(bool Tiebreak, int Home, int Away, int? TbHome, int? TbAway);
}
