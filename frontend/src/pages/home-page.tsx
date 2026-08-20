import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { ChevronRight, History, Plus, Swords, Trophy } from "lucide-react";
import { BrandMark } from "@/components/brand-mark";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { formatShortDate } from "@/lib/format";
import { dashboardSummaryQueryOptions, meQueryOptions } from "@/lib/queries";
import { cn } from "@/lib/utils";

export function HomePage() {
  const { data: user } = useQuery(meQueryOptions());
  const { data: summary, isPending } = useQuery(dashboardSummaryQueryOptions());
  const latest = summary?.latestMatch;
  const firstName = user?.name?.trim().split(/\s+/)[0] || "jogador";

  return (
    <>
      <header className="border-b px-4 pt-5 pb-6">
        <div className="flex items-center gap-3">
          <BrandMark className="size-10" />
          <div>
            <p className="text-xs text-muted-foreground">ScoreHistory</p>
            <h1 className="text-xl font-bold tracking-tight">Olá, {firstName}</h1>
          </div>
        </div>
        <p className="mt-4 max-w-xs text-sm text-muted-foreground">
          Registre seus jogos e transforme cada partida em evolução.
        </p>
      </header>

      <main className="grid gap-6 px-4 pt-5">
        {isPending ? (
          <HomeLoading />
        ) : (
          <>
        <section className="grid grid-cols-3 gap-2">
          <Stat label="Partidas" value={String(summary?.matches ?? 0)} />
          <Stat label="Vitórias" value={String(summary?.wins ?? 0)} />
          <Stat label="Aproveitamento" value={`${summary?.winRate ?? 0}%`} />
        </section>

        <section className="grid grid-cols-3 gap-2">
          <QuickAction to="/partidas/nova" icon={Plus} label="Nova partida" primary />
          <QuickAction to="/historico" icon={History} label="Histórico" />
          <QuickAction to="/adversarios" icon={Swords} label="Adversários" />
        </section>

        <section className="grid gap-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold">Última partida</h2>
            {latest ? (
              <Button asChild variant="ghost" size="sm">
                <Link to="/historico">Ver histórico</Link>
              </Button>
            ) : null}
          </div>

          {latest ? (
            <Link
              to="/partidas/$matchId"
              params={{ matchId: latest.id }}
              className="flex items-center gap-3 rounded-2xl border bg-card p-4 shadow-xs transition-colors active:bg-accent"
            >
              <span
                className={cn(
                  "grid size-12 shrink-0 place-items-center rounded-xl text-base font-bold",
                  latest.won
                    ? "bg-success/12 text-success"
                    : "bg-destructive/12 text-destructive",
                )}
              >
                {latest.won ? "V" : "D"}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{latest.opponentName}</p>
                <p className="text-xs text-muted-foreground">
                  {formatShortDate(latest.playedAt)} · {latest.courtType}
                </p>
                <p className="mt-1 text-sm font-semibold tabular-nums">{latest.score}</p>
              </div>
              <ChevronRight className="size-4 text-muted-foreground" />
            </Link>
          ) : (
            <div className="grid justify-items-center gap-3 rounded-2xl border border-dashed bg-card/60 px-5 py-8 text-center">
              <Trophy className="size-7 text-muted-foreground" />
              <div>
                <p className="font-medium">Comece seu histórico</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Sua partida mais recente aparecerá aqui.
                </p>
              </div>
              <Button asChild size="sm">
                <Link to="/partidas/nova">Registrar partida</Link>
              </Button>
            </div>
          )}
        </section>

        <section className="flex items-center justify-between rounded-2xl bg-muted px-4 py-3">
          <div>
            <p className="text-sm font-medium">Adversários cadastrados</p>
            <p className="text-xs text-muted-foreground">
              {!summary || summary.opponents === 0
                ? "Cadastre seu primeiro rival"
                : `${summary.opponents} ${summary.opponents === 1 ? "perfil" : "perfis"}`}
            </p>
          </div>
          <Button asChild variant="outline" size="sm">
            <Link to="/adversarios">Abrir</Link>
          </Button>
        </section>
          </>
        )}
      </main>
    </>
  );
}

function HomeLoading() {
  return (
    <>
      <div className="grid grid-cols-3 gap-2">
        <Skeleton className="h-[4.25rem] rounded-xl" />
        <Skeleton className="h-[4.25rem] rounded-xl" />
        <Skeleton className="h-[4.25rem] rounded-xl" />
      </div>
      <div className="grid grid-cols-3 gap-2">
        <Skeleton className="h-24 rounded-2xl" />
        <Skeleton className="h-24 rounded-2xl" />
        <Skeleton className="h-24 rounded-2xl" />
      </div>
      <div className="grid gap-3">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-24 rounded-2xl" />
      </div>
      <Skeleton className="h-16 rounded-2xl" />
    </>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border bg-card px-2 py-3 text-center shadow-xs">
      <p className="text-lg font-bold tabular-nums">{value}</p>
      <p className="text-[0.65rem] text-muted-foreground">{label}</p>
    </div>
  );
}

function QuickAction({
  to,
  icon: Icon,
  label,
  primary,
}: {
  to: "/partidas/nova" | "/historico" | "/adversarios";
  icon: typeof Plus;
  label: string;
  primary?: boolean;
}) {
  return (
    <Link
      to={to}
      className={cn(
        "flex min-h-24 flex-col items-center justify-center gap-2 rounded-2xl border p-2 text-center text-xs font-medium shadow-xs transition-transform active:scale-[0.98]",
        primary
          ? "border-primary bg-primary text-primary-foreground"
          : "bg-card text-foreground",
      )}
    >
      <Icon className="size-5" />
      {label}
    </Link>
  );
}
