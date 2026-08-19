import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { ChevronRight, Lightbulb, Swords, Trophy } from "lucide-react";
import { useMemo, useState } from "react";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { WinRateRing } from "@/components/win-rate-ring";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { MatchRecord } from "@/lib/api";
import { formatMonth, formatShortDate, toInitials } from "@/lib/format";
import { matchesQueryOptions } from "@/lib/queries";
import { cn } from "@/lib/utils";

type Filter = "all" | "wins" | "losses";

const filters: { value: Filter; label: string }[] = [
  { value: "all", label: "Todas" },
  { value: "wins", label: "Vitórias" },
  { value: "losses", label: "Derrotas" },
];

export function HistoryPage() {
  const { data: matches = [], isPending } = useQuery(matchesQueryOptions());
  const [filter, setFilter] = useState<Filter>("all");

  const wins = matches.filter((match) => match.won).length;
  const losses = matches.length - wins;
  const winRate = matches.length === 0 ? 0 : Math.round((wins / matches.length) * 100);
  const streak = useMemo(() => buildStreak(matches), [matches]);
  const headToHead = useMemo(() => buildHeadToHead(matches), [matches]);
  const tips = useMemo(() => buildImprovementTips(matches), [matches]);

  const visibleMatches = matches.filter((match) =>
    filter === "all" ? true : filter === "wins" ? match.won : !match.won,
  );
  const grouped = useMemo(() => groupByMonth(visibleMatches), [visibleMatches]);

  return (
    <>
      <PageHeader title="Histórico" description="Resultados, aproveitamento e duelos" back />

      <main className="grid gap-6 px-4 pt-4">
        {isPending ? (
          <LoadingState />
        ) : matches.length === 0 ? (
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
                <WinRateRing value={winRate} />
                <div className="grid gap-2">
                  <p className="text-3xl leading-none font-bold">
                    {wins}
                    <span className="opacity-60">-</span>
                    {losses}
                  </p>
                  <p className="text-sm opacity-80">
                    {matches.length === 1 ? "1 partida registrada" : `${matches.length} partidas registradas`}
                  </p>
                  {streak ? (
                    <span className="w-fit rounded-full bg-primary-foreground/15 px-2.5 py-1 text-xs font-semibold">
                      {streak.count} {streak.won ? "vitórias" : "derrotas"} seguidas
                    </span>
                  ) : null}
                </div>
              </div>
            </section>

            {tips.length > 0 ? (
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

            {headToHead.length > 0 ? (
              <section className="grid gap-3">
                <SectionTitle icon={Swords}>Head to head</SectionTitle>
                <div className="grid gap-2">
                  {headToHead.map((item) => {
                    const share = Math.round((item.wins / item.played) * 100);
                    return (
                      <article key={item.opponentId} className="rounded-2xl border bg-card p-4 shadow-xs">
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex min-w-0 items-center gap-3">
                            <Avatar name={item.name} />
                            <div className="min-w-0">
                              <p className="truncate font-medium">{item.name}</p>
                              <p className="text-xs text-muted-foreground">
                                {item.played} {item.played === 1 ? "jogo" : "jogos"} · último{" "}
                                {item.lastScore}
                              </p>
                            </div>
                          </div>
                          <p className="shrink-0 text-sm font-semibold tabular-nums">
                            <span className="text-success">{item.wins}</span>
                            <span className="text-muted-foreground">-</span>
                            <span className="text-destructive">{item.losses}</span>
                          </p>
                        </div>
                        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-destructive/20">
                          <div
                            className="h-full rounded-full bg-success transition-[width] duration-500"
                            style={{ width: `${share}%` }}
                          />
                        </div>
                      </article>
                    );
                  })}
                </div>
              </section>
            ) : null}

            <section className="grid gap-3">
              <div className="flex items-center justify-between gap-3">
                <SectionTitle>Partidas</SectionTitle>
                <div className="flex gap-1 rounded-full bg-muted p-1">
                  {filters.map((item) => (
                    <button
                      key={item.value}
                      type="button"
                      onClick={() => setFilter(item.value)}
                      aria-pressed={filter === item.value}
                      className={cn(
                        "rounded-full px-3 py-1 text-xs font-medium transition-colors",
                        filter === item.value
                          ? "bg-background text-foreground shadow-xs"
                          : "text-muted-foreground",
                      )}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              {visibleMatches.length === 0 ? (
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
      <Skeleton className="h-20 rounded-2xl" />
      <Skeleton className="h-20 rounded-2xl" />
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

function buildStreak(matches: MatchRecord[]) {
  if (matches.length === 0) {
    return null;
  }

  const won = matches[0].won;
  let count = 0;
  for (const match of matches) {
    if (match.won !== won) {
      break;
    }
    count += 1;
  }

  return count >= 2 ? { won, count } : null;
}

function buildHeadToHead(matches: MatchRecord[]) {
  const map = new Map<
    string,
    {
      opponentId: string;
      name: string;
      wins: number;
      losses: number;
      played: number;
      lastScore: string;
      lastWon: boolean;
    }
  >();

  for (const match of matches) {
    const current = map.get(match.opponentId) ?? {
      opponentId: match.opponentId,
      name: match.opponentName,
      wins: 0,
      losses: 0,
      played: 0,
      lastScore: match.score,
      lastWon: match.won,
    };
    current.played += 1;
    if (match.won) {
      current.wins += 1;
    } else {
      current.losses += 1;
    }
    map.set(match.opponentId, current);
  }

  return [...map.values()].sort((a, b) => b.played - a.played);
}

function buildImprovementTips(matches: MatchRecord[]) {
  const tips: string[] = [];
  const losses = matches.filter((match) => !match.won);
  if (matches.length >= 3 && losses.length / matches.length >= 0.6) {
    tips.push(
      "Aproveitamento baixo nas últimas partidas. Revise o plano de jogo antes do próximo confronto.",
    );
  }

  const clayLosses = losses.filter((match) => match.courtType === "Saibro").length;
  if (clayLosses >= 2) {
    tips.push("Várias derrotas no saibro. Trabalhe consistência e pontos longos nessa superfície.");
  }

  const leftyLosses = losses.filter((match) => match.opponentHandedness === "Canhoto").length;
  if (leftyLosses >= 2) {
    tips.push("Dificuldade contra canhotos. Treine devolução no lado invertido e o cruzado no backhand.");
  }

  const weaknessText = matches
    .map((match) => match.weaknesses)
    .filter((value): value is string => Boolean(value))
    .join(" ")
    .toLowerCase();
  if (weaknessText.includes("saque")) {
    tips.push("O saque aparece nos pontos fracos. Priorize % de primeiro saque e variação de direção.");
  }
  if (weaknessText.includes("backhand")) {
    tips.push("O backhand vem sendo explorado. Reforce a profundidade e o cruzado de defesa.");
  }
  if (weaknessText.includes("rede") || weaknessText.includes("voleio")) {
    tips.push("Jogo na rede em alerta. Treine aproximação e voleio de contenção.");
  }

  if (tips.length === 0 && losses.length > 0) {
    tips.push("Nas derrotas, anote um ponto fraco objetivo para transformar o histórico em treino.");
  }

  return tips.slice(0, 4);
}
