using ScoreHistory.Api.Services;
using Xunit;

namespace ScoreHistory.Api.Tests;

public class ScoreRulesTests
{
    [Theory]
    [InlineData("6-0", true)]
    [InlineData("6-4", true)]
    [InlineData("7-5", true)]
    [InlineData("7-6(7-4)", true)]
    [InlineData("4-6 6-3 [10-8]", true)]
    public void Accepts_regulation_scores(string score, bool won)
    {
        Assert.Null(ScoreRules.Validate(score, won, "Tênis"));
        Assert.Null(ScoreRules.Validate(score, won, "Padel"));
        Assert.Null(ScoreRules.Validate(score, won, "Beach tennis"));
    }

    [Theory]
    [InlineData("4-1", true)]
    [InlineData("1-4", false)]
    [InlineData("3-2", true)]
    [InlineData("5-5", null)]
    [InlineData("6-5", true)]
    [InlineData("6-4 4-1", true)]
    [InlineData("4-6 2-1", null)]
    public void Accepts_interrupted_sets(string score, bool? won)
    {
        Assert.Null(ScoreRules.Validate(score, won));
    }

    [Theory]
    [InlineData("4-1", false)]
    [InlineData("6-4 4-1", false)]
    [InlineData("1-2 5-3", true)]
    [InlineData("3-3", true)]
    [InlineData("6-0", null)]
    [InlineData("0-6", true)]
    public void Accepts_any_result_the_player_marked(string score, bool? won)
    {
        Assert.Null(ScoreRules.Validate(score, won));
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("   ")]
    [InlineData("0-0")]
    [InlineData("7-0")]
    [InlineData("7-4")]
    [InlineData("7-7")]
    [InlineData("8-6")]
    [InlineData("99-1")]
    [InlineData("-1-4")]
    [InlineData("abc")]
    [InlineData("4-1x")]
    public void Rejects_malformed_scores(string? score)
    {
        Assert.Equal("Placar inválido", ScoreRules.Validate(score, true));
    }
}
