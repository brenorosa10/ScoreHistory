using ScoreHistory.Api.Services;
using Xunit;

namespace ScoreHistory.Api.Tests;

public sealed class LedgerIntegrityTests
{
    [Fact]
    public void Backfill_is_gated_by_a_marker_and_runs_in_one_transaction()
    {
        Assert.Contains("schema_markers", LedgerBackfill.Sql, StringComparison.Ordinal);
        Assert.Contains(LedgerBackfill.MarkerName, LedgerBackfill.Sql, StringComparison.Ordinal);
        Assert.StartsWith("BEGIN;", LedgerBackfill.Sql.TrimStart(), StringComparison.Ordinal);
        Assert.EndsWith("COMMIT;", LedgerBackfill.Sql.TrimEnd(), StringComparison.Ordinal);

        var inserts = LedgerBackfill.Sql.Split("INSERT INTO expenses", StringSplitOptions.None);
        Assert.Equal(3, inserts.Length);
        Assert.Contains("schema_markers", inserts[1], StringComparison.Ordinal);
        Assert.Contains("schema_markers", inserts[2], StringComparison.Ordinal);
    }

    [Fact]
    public void Racket_save_keeps_known_service_ids_and_lists_the_ones_left_out()
    {
        var kept = Guid.Parse("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa");
        var dropped = Guid.Parse("bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb");
        var created = Guid.Parse("cccccccc-cccc-cccc-cccc-cccccccccccc");

        var plan = ServiceIdSync.Plan([kept, dropped], [kept, created]);

        Assert.Equal([kept], plan.KeptIds);
        Assert.Equal(1, plan.NewCount);
        Assert.Equal([dropped], plan.RemovedIds);
    }

    [Fact]
    public void Missing_ids_are_new_rows_and_do_not_reuse_an_existing_service()
    {
        var existing = Guid.Parse("dddddddd-dddd-dddd-dddd-dddddddddddd");
        var plan = ServiceIdSync.Plan([existing], [null, null]);

        Assert.Empty(plan.KeptIds);
        Assert.Equal(2, plan.NewCount);
        Assert.Equal([existing], plan.RemovedIds);
    }

    [Fact]
    public void Repeating_the_same_ids_removes_nothing()
    {
        var first = Guid.NewGuid();
        var second = Guid.NewGuid();
        var plan = ServiceIdSync.Plan([first, second], [second, first]);

        Assert.Empty(plan.RemovedIds);
        Assert.Equal(0, plan.NewCount);
        Assert.Equal(2, plan.KeptIds.Count);
    }
}
