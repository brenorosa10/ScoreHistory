import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate, useSearch } from "@tanstack/react-router";
import { ChevronRight, Lightbulb, Swords, Trophy } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { EmptyState } from "@/components/empty-state";
import { OpponentDetailsDialog } from "@/components/opponent-details-dialog";
import { PageHeader } from "@/components/page-header";
import { Pagination } from "@/components/pagination";
import { WinRateRing } from "@/components/win-rate-ring";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { LoadingHint } from "@/components/ui/spinner";
import type { HeadToHead, MatchRecord } from "@/lib/api";
import { DEFAULT_PAGE_SIZE } from "@/lib/api";
import { formatMonth, formatShortDate, toInitials } from "@/lib/format";
import {
  dashboardHeadToHeadQueryOptions,
  dashboardSummaryQueryOptions,
  dashboardTipsQueryOptions,
  matchesQueryOptions,
} from "@/lib/queries";
import { cn } from "@/lib/utils";

type Filter = "all" | "wins" | "losses";

const filters: { value: Filter; label: string }[] = [
  { value: "all", label: "Todas" },
  { value: "wins", label: "Vitórias" },
  { value: "losses", label: "Derrotas" },
];

export function HistoryPage() {
  const navigate = useNavigate({ from: "/historico" });
  const search = useSearch({ from: "/app/historico" });
  const page = search.page ?? 1;
  const filtro = search.filtro ?? "all";
  const { data: summary, isPending: summaryPending } = useQuery(dashboardSummaryQueryOptions());
  const { data: tips = [], isPending: tipsPending } = useQuery(dashboardTipsQueryOptions());
  const { data: headToHead = [], isPending: h2hPending } = useQuery(dashboardHeadToHeadQueryOptions());
  const { data: matchesPage, isPending: matchesPending, isFetching: matchesFetching } = useQuery(
    matchesQueryOptions({
      page,
      pageSize: DEFAULT_PAGE_SIZE,
      filter: filtro,
    }),
  );

  const matches = matchesPage?.items ?? [];
  const grouped = useMemo(() => groupByMonth(matches), [matches]);
  const isPending = summaryPending || matchesPending;
  const empty = (summary?.matches ?? 0) === 0;
  const [selectedH2h, setSelectedH2h] = useState<HeadToHead | null>(null);

  useEffect(() => {
    const totalPages = matchesPage?.totalPages ?? 0;
    if (totalPages > 0 && page > totalPages) {
      void navigate({
        search: { page: totalPages, filtro: filtro === "all" ? undefined : filtro },
        replace: true,
      });
    }
  }, [filtro, matchesPage, navigate, page]);

  function setFilter(next: Filter) {
    void navigate({ search: { page: 1, filtro: next === "all" ? undefined : next } });
  }

  function goToPage(nextPage: number) {
    void navigate({ search: { page: nextPage, filtro: filtro === "all" ? undefined : filtro } });
  }

  return (
    <>
      <PageHeader title="Histórico" description="Resultados, aproveitamento e duelos" back />

      <main className="grid gap-6 px-4 pt-4">
        {isPending && !summary ? (
          <LoadingState />
        ) : empty ? (
          <EmptyState
            icon={Trophy}
            title="Nenhuma partida registrada"
            description="Toque no botão + para registrar seu primeiro jogo e começar a acompanhar sua evolução."
            action={
              <Button asChild className="mt-1">
                <Link to="/partidas/nova">Registrar partida</Link>
              </Button>
            }
          />
        ) : (
          <>
            <section className="rounded-2xl bg-primary p-5 text-primary-foreground">
              <div className="flex items-center gap-5">
                <WinRateRing value={summary?.winRate ?? 0} />
                <div className="grid gap-2">
                  <p className="text-3xl leading-none font-bold">
                    {summary?.wins ?? 0}
                    <span className="opacity-60">-</span>
                    {summary?.losses ?? 0}
                  </p>
                  <p className="text-sm opacity-80">
                    {summary?.matches === 1
                      ? "1 partida registrada"
                      : `${summary?.matches ?? 0} partidas registradas`}
                  </p>
                  {summary?.streakCount ? (
                    <span className="w-fit rounded-full bg-primary-foreground/15 px-2.5 py-1 text-xs font-semibold">
                      {summary.streakCount} {summary.streakWon ? "vitórias" : "derrotas"} seguidas
                    </span>
                  ) : null}
                </div>
              </div>
            </section>

            {tipsPending ? (
              <section className="grid gap-3">
                <Skeleton className="h-5 w-40" />
                <Skeleton className="h-14 rounded-xl" />
              </section>
            ) : tips.length > 0 ? (
              <section className="grid gap-3">
                <SectionTitle icon={Lightbulb}>Avisos de melhoria</SectionTitle>
                <div className="grid gap-2">
                  {tips.map((tip) => (
                    <p
                      key={tip}
                      className="rounded-xl border-l-4 border-warning bg-warning/8 px-3 py-2.5 text-sm"
                    >
                      {tip}
                    </p>
                  ))}
                </div>
              </section>
            ) : null}

            {h2hPending ? (
              <section className="grid gap-3">
                <Skeleton className="h-5 w-36" />
                <Skeleton className="h-24 rounded-2xl" />
                <Skeleton className="h-24 rounded-2xl" />
              </section>
            ) : headToHead.length > 0 ? (
              <section className="grid gap-3">
                <SectionTitle icon={Swords}>Head to head</SectionTitle>
                <div className="grid gap-2">
                  {headToHead.map((item) => {
                    const share = item.played === 0 ? 0 : Math.round((item.wins / item.played) * 100);
                    return (
                      <button
                        key={item.opponentId}
                        type="button"
                        onClick={() => setSelectedH2h(item)}
                        className="rounded-2xl border bg-card p-4 text-left shadow-xs transition-colors outline-none active:bg-accent focus-visible:ring-[3px] focus-visible:ring-ring/50"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex min-w-0 items-center gap-3">
                            <Avatar name={item.name} />
                            <div className="min-w-0">
                              <p className="truncate font-medium">{item.name}</p>
                              <p className="text-xs text-muted-foreground">
                                {item.played} {item.played === 1 ? "jogo" : "jogos"}
                                {item.lastScore ? ` · último ${item.lastScore}` : ""}
                              </p>
                            </div>
                          </div>
                          <div className="flex shrink-0 items-center gap-1">
                            <p className="text-sm font-semibold tabular-nums">
                              <span className="text-success">{item.wins}</span>
                              <span className="text-muted-foreground">-</span>
                              <span className="text-destructive">{item.losses}</span>
                            </p>
                            <ChevronRight className="size-4 text-muted-foreground" />
                          </div>
                        </div>
                        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-destructive/20">
                          <div
                            className="h-full rounded-full bg-success transition-[width] duration-500"
                            style={{ width: `${share}%` }}
                          />
                        </div>
                      </button>
                    );
                  })}
                </div>
              </section>
            ) : null}

            <OpponentDetailsDialog
              opponentId={selectedH2h?.opponentId ?? null}
              h2h={selectedH2h ?? undefined}
              onClose={() => setSelectedH2h(null)}
            />

            <section className="grid gap-3">
              <div className="flex items-center justify-between gap-3">
                <SectionTitle>Partidas</SectionTitle>
                <div className="flex gap-1 rounded-full bg-muted p-1">
                  {filters.map((item) => (
                    <button
                      key={item.value}
                      type="button"
                      onClick={() => setFilter(item.value)}
                      aria-pressed={filtro === item.value}
                      className={cn(
                        "rounded-full px-3 py-1 text-xs font-medium transition-colors",
                        filtro === item.value
                          ? "bg-background text-foreground shadow-xs"
                          : "text-muted-foreground",
                      )}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              {matchesFetching && matchesPage ? (
                <LoadingHint label="Atualizando partidas..." />
              ) : null}
              {matchesPending && !matchesPage ? (
                <LoadingHint label="Carregando partidas..." />
              ) : matches.length === 0 ? (
                <p className="rounded-xl bg-muted px-3 py-6 text-center text-sm text-muted-foreground">
                  Nenhuma partida neste filtro.
                </p>
              ) : (
                grouped.map(([month, items]) => (
                  <div key={month} className="grid gap-2">
                    <p className="mt-1 text-xs font-medium tracking-wide text-muted-foreground uppercase">
                      {month}
                    </p>
                    {items.map((match) => (
                      <MatchRow key={match.id} match={match} />
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
          </>
        )}
      </main>
    </>
  );
}

function MatchRow({ match }: { match: MatchRecord }) {
  return (
    <Link
      to="/partidas/$matchId"
      params={{ matchId: match.id }}
      className="flex items-center gap-3 rounded-2xl border bg-card p-3 shadow-xs transition-colors active:bg-accent"
    >
      <span
        className={cn(
          "grid size-11 shrink-0 place-items-center rounded-xl text-sm font-bold",
          match.won ? "bg-success/12 text-success" : "bg-destructive/12 text-destructive",
        )}
      >
        {match.won ? "V" : "D"}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium">{match.opponentName}</p>
        <p className="truncate text-xs text-muted-foreground">
          {formatShortDate(match.playedAt)} · {match.courtType}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        <span className="text-sm font-semibold tabular-nums">{match.score}</span>
        <ChevronRight className="size-4 text-muted-foreground" />
      </div>
    </Link>
  );
}

function SectionTitle({ icon: Icon, children }: { icon?: typeof Trophy; children: React.ReactNode }) {
  return (
    <h2 className="flex items-center gap-2 text-base font-semibold">
      {Icon ? <Icon className="size-4 text-muted-foreground" /> : null}
      {children}
    </h2>
  );
}

function Avatar({ name }: { name: string }) {
  return (
    <span className="grid size-10 shrink-0 place-items-center rounded-full bg-accent text-sm font-semibold text-accent-foreground">
      {toInitials(name)}
    </span>
  );
}

function LoadingState() {
  return (
    <div className="grid gap-4">
      <Skeleton className="h-36 rounded-2xl" />
      <Skeleton className="h-5 w-32" />
      <Skeleton className="h-14 rounded-xl" />
      <Skeleton className="h-24 rounded-2xl" />
      <Skeleton className="h-24 rounded-2xl" />
      <Skeleton className="h-16 rounded-2xl" />
      <Skeleton className="h-16 rounded-2xl" />
    </div>
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
