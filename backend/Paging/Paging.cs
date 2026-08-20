namespace ScoreHistory.Api.Paging;

public static class PageQuery
{
    public const int DefaultPageSize = 10;
    public const int MaxPageSize = 50;

    public static (int Page, int PageSize) Normalize(int page, int pageSize)
    {
        var resolvedPage = page < 1 ? 1 : page;
        var resolvedSize = pageSize < 1 ? DefaultPageSize : Math.Min(pageSize, MaxPageSize);
        return (resolvedPage, resolvedSize);
    }
}

public sealed record PagedResult<T>(
    IReadOnlyList<T> Items,
    int Page,
    int PageSize,
    int TotalCount)
{
    public int TotalPages => TotalCount == 0 ? 0 : (int)Math.Ceiling(TotalCount / (double)PageSize);
}
