namespace ScoreHistory.Api.Services;

/// <summary>
/// Decides which racket services a PUT keeps, inserts, or removes.
/// An id that already belongs to the racket is updated in place. A missing id is a new row.
/// Services left out of the payload are removed, and their ledger rows go with them.
/// </summary>
public static class ServiceIdSync
{
    public sealed record SyncPlan(IReadOnlyList<Guid> KeptIds, int NewCount, IReadOnlyList<Guid> RemovedIds);

    public static SyncPlan Plan(IEnumerable<Guid> existingIds, IEnumerable<Guid?> incomingIds)
    {
        var existing = existingIds.ToHashSet();
        var kept = new HashSet<Guid>();
        var newCount = 0;

        foreach (var incoming in incomingIds)
        {
            if (incoming is Guid id && existing.Contains(id))
            {
                kept.Add(id);
            }
            else
            {
                newCount++;
            }
        }

        var removed = existing.Where(id => !kept.Contains(id)).ToList();
        return new SyncPlan(kept.ToList(), newCount, removed);
    }
}
