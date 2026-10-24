import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate, useParams, useSearch } from "@tanstack/react-router";
import { Pencil, Trophy } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { DeleteMatchDialog } from "@/components/delete-match-dialog";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { ResourceMissing } from "@/components/resource-missing";
import { Pagination } from "@/components/pagination";
import { SwipeableMatchRow } from "@/components/swipeable-match-row";
import { SportBadges } from "@/components/sport-badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { LoadingHint } from "@/components/ui/spinner";
import { DEFAULT_PAGE_SIZE, isNotFoundError, type MatchRecord } from "@/lib/api";
import { formatMonth, opponentMeta, toInitials } from "@/lib/format";
import { drawCount, h2hScore, recordSummary } from "@/lib/record";
import { matchesQueryOptions, opponentQueryOptions } from "@/lib/queries";

export function OpponentDetailPage() {
  const { opponentId } = useParams({ from: "/app/adversarios/$opponentId" });
  const navigate = useNavigate({ from: "/adversarios/$opponentId" });
  const search = useSearch({ from: "/app/adversarios/$opponentId" });
  const page = search.page ?? 1;
  const {
    data: opponent,
    isPending: opponentPending,
    isError,
    error,
  } = useQuery(opponentQueryOptions(opponentId));
  const { data: matchesPage, isPending: matchesPending, isFetching: matchesFetching } = useQuery(
    matchesQueryOptions({
      page,
      pageSize: DEFAULT_PAGE_SIZE,
      opponentId,
    }),
  );

  const matches = matchesPage?.items ?? [];
  const grouped = useMemo(() => groupByMonth(matches), [matches]);
  const [revealedMatchId, setRevealedMatchId] = useState<string | null>(null);
  const [matchToDelete, setMatchToDelete] = useState<MatchRecord | null>(null);

  useEffect(() => {
    const totalPages = matchesPage?.totalPages ?? 0;
    if (totalPages > 0 && page > totalPages) {
      void navigate({ search: { page: totalPages }, replace: true });
    }
  }, [matchesPage, navigate, page]);

  function goToPage(nextPage: number) {
    void navigate({ search: { page: nextPage } });
  }

  if (opponentPending && !opponent) {
    return (
      <>
        <PageHeader title="Confrontos" back />
        <div className="grid gap-4 px-4 pt-4">
          <Skeleton className="h-28 rounded-2xl" />
          <Skeleton className="h-16 rounded-2xl" />
          <Skeleton className="h-16 rounded-2xl" />
        </div>
      </>
    );
  }

  if (isError || !opponent) {
    const missing = isNotFoundError(error);
    return (
      <>
        <PageHeader title="Confrontos" back />
        <ResourceMissing
          title={missing ? "Adversário não encontrado" : "Não foi possível carregar o adversário"}
          description={
            missing
              ? "Esse adversário não existe ou foi removido."
              : "Tente novamente em instantes."
          }
          actionTo="/adversarios"
          actionLabel="Voltar aos adversários"
        />
      </>
    );
  }

  const played = opponent.played ?? 0;
  const wins = opponent.wins ?? 0;
  const losses = opponent.losses ?? 0;
  const draws = drawCount(played, wins, losses, opponent.draws);

  return (
    <>
      <PageHeader
        title={opponent.name}
        description="Confrontos"
        back
        action={
          <Button asChild variant="outline" size="sm">
            <Link to="/adversarios/$opponentId/editar" params={{ opponentId }}>
              <Pencil />
              Editar
            </Link>
          </Button>
        }
      />

      <main className="grid gap-5 px-4 pt-4">
        <section className="grid gap-4 rounded-2xl border bg-card p-4 shadow-xs">
          <div className="flex items-center gap-3">
            <span className="grid size-12 shrink-0 place-items-center rounded-full bg-accent text-sm font-semibold text-accent-foreground">
              {toInitials(opponent.name)}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium">{opponent.name}</p>
              <p className="text-xs text-muted-foreground">
                {opponentMeta(opponent.handedness, opponent.class)}
              </p>
              <SportBadges sports={opponent.sports} className="mt-1" />
            </div>
            <p className="text-right text-sm font-semibold tabular-nums" aria-label={recordSummary(wins, draws, losses)}>
              {played > 0 ? h2hScore(wins, losses, draws) : "0-0"}
            </p>
          </div>
          <p className="text-xs text-muted-foreground">
            {played === 0
              ? "Nenhum confronto registrado"
              : `${played === 1 ? "1 confronto" : `${played} confrontos`} · ${recordSummary(wins, draws, losses)}`}
          </p>
          {opponent.strengths || opponent.weaknesses ? (
            <div className="grid gap-1 border-t pt-3 text-sm">
              {opponent.strengths ? (
                <p>
                  <span className="font-medium text-success">Forte: </span>
                  <span className="text-muted-foreground break-words [overflow-wrap:anywhere]">{opponent.strengths}</span>
                </p>
              ) : null}
              {opponent.weaknesses ? (
                <p>
                  <span className="font-medium text-destructive">Fraco: </span>
                  <span className="text-muted-foreground break-words [overflow-wrap:anywhere]">{opponent.weaknesses}</span>
                </p>
              ) : null}
            </div>
          ) : null}
          {opponent.sportStats && opponent.sportStats.length > 1 ? (
            <div className="grid gap-1 border-t pt-3 text-sm">
              {opponent.sportStats.map((item) => (
                <p key={item.sport} className="flex justify-between gap-3">
                  <span className="font-medium">{item.sport}</span>
                  <span className="tabular-nums text-muted-foreground">
                    {h2hScore(item.wins, item.losses, item.draws)} · {item.played} {item.played === 1 ? "jogo" : "jogos"}
                  </span>
                </p>
              ))}
            </div>
          ) : null}
        </section>

        <section className="grid gap-3">
          <h2 className="text-base font-semibold">Partidas</h2>
          {matchesFetching && matchesPage ? (
            <LoadingHint label="Atualizando partidas..." />
          ) : null}
          {matchesPending && !matchesPage ? (
            <LoadingHint label="Carregando partidas..." />
          ) : matches.length === 0 ? (
            <EmptyState
              icon={Trophy}
              title="Nenhum confronto"
              description="Registre uma partida contra este adversário para ver o histórico aqui."
              action={
                <Button asChild size="sm" className="mt-1">
                  <Link to="/partidas/nova">Registrar partida</Link>
                </Button>
              }
            />
          ) : (
            grouped.map(([month, items]) => (
              <div key={month} className="grid gap-2">
                <p className="mt-1 text-xs font-medium tracking-wide text-muted-foreground uppercase">
                  {month}
                </p>
                {items.map((match) => (
                  <SwipeableMatchRow
                    key={match.id}
                    match={match}
                    hideOpponentName
                    revealed={revealedMatchId === match.id}
                    onRevealedChange={(open) => setRevealedMatchId(open ? match.id : null)}
                    onRequestDelete={() => {
                      setRevealedMatchId(null);
                      setMatchToDelete(match);
                    }}
                  />
                ))}
              </div>
            ))
          )}

          <Pagination
            page={page}
            totalPages={matchesPage?.totalPages ?? 0}
            totalCount={matchesPage?.totalCount ?? 0}
            pageSize={DEFAULT_PAGE_SIZE}
            loading={matchesFetching}
            onPageChange={goToPage}
          />
        </section>
      </main>

      <DeleteMatchDialog
        match={matchToDelete}
        open={Boolean(matchToDelete)}
        onClose={() => setMatchToDelete(null)}
      />
    </>
  );
}

function groupByMonth(matches: MatchRecord[]): [string, MatchRecord[]][] {
  const groups = new Map<string, MatchRecord[]>();

  for (const match of matches) {
    const key = formatMonth(match.playedAt);
    const current = groups.get(key) ?? [];
    current.push(match);
    groups.set(key, current);
  }

  return [...groups.entries()];
}
