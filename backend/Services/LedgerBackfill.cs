namespace ScoreHistory.Api.Services;

/// <summary>
/// One-shot copy of existing racket services and the latest ball opening into the ledger.
/// Gated by schema_markers so a later delete is not undone on the next API start.
/// </summary>
public static class LedgerBackfill
{
    public const string MarkerName = "expense-ledger-backfill-v1";

    public const string Sql = """
        BEGIN;
        CREATE TABLE IF NOT EXISTS schema_markers (
            "Name" character varying(64) NOT NULL,
            "AppliedAt" timestamp with time zone NOT NULL,
            CONSTRAINT "PK_schema_markers" PRIMARY KEY ("Name")
        );

        INSERT INTO ball_openings ("Id", "UserId", "BallCanId", "OpenedAt")
        SELECT gen_random_uuid(), ball."UserId", ball."Id", ball."LastOpenedAt"
        FROM ball_cans ball
        WHERE ball."LastOpenedAt" IS NOT NULL
          AND NOT EXISTS (SELECT 1 FROM schema_markers marker WHERE marker."Name" = 'expense-ledger-backfill-v1')
          AND NOT EXISTS (
              SELECT 1 FROM ball_openings opening WHERE opening."BallCanId" = ball."Id"
          );

        INSERT INTO expenses (
            "Id", "UserId", "OccurredAt", "Category", "Amount", "RacketId", "RacketServiceId", "Note")
        SELECT
            gen_random_uuid(),
            racket."UserId",
            service."ChangedAt",
            CASE service."Kind"
                WHEN 'Corda' THEN 'Corda'
                WHEN 'Overgrip' THEN 'Overgrip'
                WHEN 'Grip' THEN 'Grip'
                ELSE 'Outro'
            END,
            CASE service."Kind"
                WHEN 'Corda' THEN COALESCE(finance."StringPrice", 0)
                WHEN 'Overgrip' THEN COALESCE(finance."OvergripPrice", 0)
                WHEN 'Grip' THEN COALESCE(finance."CushionGripPrice", 0)
                ELSE 0
            END,
            racket."Id",
            service."Id",
            service."Detail"
        FROM racket_services service
        JOIN rackets racket ON racket."Id" = service."RacketId"
        LEFT JOIN user_finance finance ON finance."UserId" = racket."UserId"
        WHERE NOT EXISTS (SELECT 1 FROM schema_markers marker WHERE marker."Name" = 'expense-ledger-backfill-v1')
          AND NOT EXISTS (
              SELECT 1 FROM expenses existing WHERE existing."RacketServiceId" = service."Id"
          );

        INSERT INTO expenses (
            "Id", "UserId", "OccurredAt", "Category", "Amount", "BallCanId", "BallOpeningId", "Note")
        SELECT
            gen_random_uuid(),
            opening."UserId",
            opening."OpenedAt",
            'Bolinhas',
            COALESCE(ball."CanPrice", finance."BallCanPrice", 0),
            ball."Id",
            opening."Id",
            ball."Name"
        FROM ball_openings opening
        JOIN ball_cans ball ON ball."Id" = opening."BallCanId"
        LEFT JOIN user_finance finance ON finance."UserId" = opening."UserId"
        WHERE NOT EXISTS (SELECT 1 FROM schema_markers marker WHERE marker."Name" = 'expense-ledger-backfill-v1')
          AND NOT EXISTS (
              SELECT 1 FROM expenses existing WHERE existing."BallOpeningId" = opening."Id"
          );

        INSERT INTO schema_markers ("Name", "AppliedAt")
        SELECT 'expense-ledger-backfill-v1', now()
        WHERE NOT EXISTS (
            SELECT 1 FROM schema_markers marker WHERE marker."Name" = 'expense-ledger-backfill-v1'
        );
        COMMIT;
        """;
}
