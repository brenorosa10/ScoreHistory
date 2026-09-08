import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { ChevronRight, Flame, History, Plus, Swords, Trophy, Users } from "lucide-react";
import { BrandMark } from "@/components/brand-mark";
import { EquipmentStatus } from "@/components/equipment-status";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { formatShortDate } from "@/lib/format";
import { resultBadgeClass, resultLabel, resultLetter, resultStripeClass } from "@/lib/match-result";
import { dashboardSummaryQueryOptions, meQueryOptions } from "@/lib/queries";
import { cn } from "@/lib/utils";

export function HomePage() {
  const { data: user } = useQuery(meQueryOptions());
  const { data: summary, isPending } = useQuery(dashboardSummaryQueryOptions());
  const latest = summary?.latestMatch;
  const firstName = user?.name?.trim().split(/\s+/)[0] || "jogador";
  const matches = summary?.matches ?? 0;
  const wins = summary?.wins ?? 0;
  const losses = summary?.losses ?? 0;
  const winRate = summary?.winRate ?? 0;
  const streak = summary?.streakCount ?? 0;

  return (
    <>
      <header className="px-4 pt-5 pb-2">
        <div className="flex items-center gap-3">
          <BrandMark className="size-10" />
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground">ScoreHistory</p>
            <h1 className="truncate text-xl font-bold tracking-tight">Olá, {firstName}</h1>
          </div>
        </div>
      </header>

      <main className="grid gap-6 px-4 pt-3">
        {isPending ? (
          <HomeLoading />
        ) : (
          <>
            <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary via-primary to-brand/80 p-4 text-primary-foreground shadow-md">
              <span
                aria-hidden
                className="pointer-events-none absolute -top-10 -right-10 size-36 rounded-full bg-white/10"
              />
              <span
                aria-hidden
                className="pointer-events-none absolute -bottom-14 -left-6 size-32 rounded-full bg-black/10"
              />

              <div className="relative flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide opacity-80">Aproveitamento</p>
                  <p className="mt-1 text-4xl font-bold tabular-nums leading-none">{winRate}%</p>
                  <p className="mt-2 text-xs opacity-80">
                    {matches === 0
                      ? "Registre a primeira partida"
                      : `${wins} vitória${wins === 1 ? "" : "s"} · ${losses} derrota${losses === 1 ? "" : "s"}`}
                  </p>
                </div>
                {streak > 0 ? (
                  <span className="flex items-center gap-1 rounded-full bg-white/15 px-2.5 py-1 text-xs font-semibold backdrop-blur">
                    <Flame className="size-3.5" />
                    {streak} {summary?.streakWon ? "seguidas" : "sem vencer"}
                  </span>
                ) : null}
              </div>

              <div className="relative mt-4 h-2 overflow-hidden rounded-full bg-white/20">
                <div
                  className="h-full rounded-full bg-white transition-[width]"
                  style={{ width: `${Math.min(100, Math.max(0, winRate))}%` }}
                />
              </div>

              <div className="relative mt-4 grid grid-cols-3 divide-x divide-white/15 rounded-2xl bg-white/10 py-2.5 backdrop-blur">
                <HeroStat label="Partidas" value={matches} />
                <HeroStat label="Vitórias" value={wins} />
                <HeroStat label="Adversários" value={summary?.opponents ?? 0} />
              </div>
            </section>

            <section className="grid grid-cols-3 gap-2">
              <QuickAction to="/partidas/nova" icon={Plus} label="Nova partida" primary />
              <QuickAction to="/historico" icon={History} label="Histórico" />
              <QuickAction to="/adversarios" icon={Swords} label="Adversários" />
            </section>

            <section className="grid gap-3">
              <SectionTitle title="Última partida" to={latest ? "/historico" : undefined} />

              {latest ? (
                <Link
                  to="/partidas/$matchId"
                  params={{ matchId: latest.id }}
                  className="group relative flex items-center gap-3 overflow-hidden rounded-2xl border bg-card p-4 shadow-xs transition-colors active:bg-accent"
                >
                  <span
                    aria-hidden
                    className={cn("absolute inset-y-0 left-0 w-1.5", resultStripeClass(latest.won))}
                  />
                  <span
                    className={cn(
                      "grid size-12 shrink-0 place-items-center rounded-xl text-base font-bold",
                      resultBadgeClass(latest.won),
                    )}
                  >
                    {resultLetter(latest.won)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate font-medium">{latest.opponentName}</p>
                      <span
                        className={cn(
                          "shrink-0 rounded-full px-2 py-0.5 text-[0.65rem] font-semibold",
                          resultBadgeClass(latest.won),
                        )}
                      >
                        {resultLabel(latest.won)}
                      </span>
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {formatShortDate(latest.playedAt)} · {latest.courtType}
                    </p>
                    <p className="mt-1.5 text-sm font-semibold tabular-nums">{latest.score}</p>
                  </div>
                  <ChevronRight className="size-4 shrink-0 text-muted-foreground transition-transform group-active:translate-x-0.5" />
                </Link>
              ) : (
                <EmptyCard
                  icon={Trophy}
                  title="Comece seu histórico"
                  description="Sua partida mais recente aparecerá aqui."
                  action={
                    <Button asChild size="sm">
                      <Link to="/partidas/nova">Registrar partida</Link>
                    </Button>
                  }
                />
              )}
            </section>

            <EquipmentStatus />

            <Link
              to="/adversarios"
              className="flex items-center gap-3 rounded-2xl border bg-card p-4 shadow-xs transition-colors active:bg-accent"
            >
              <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-accent text-accent-foreground">
                <Users className="size-5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">Adversários cadastrados</p>
                <p className="text-xs text-muted-foreground">
                  {!summary || summary.opponents === 0
                    ? "Cadastre seu primeiro rival"
                    : `${summary.opponents} ${summary.opponents === 1 ? "perfil" : "perfis"}`}
                </p>
              </div>
              <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
            </Link>
          </>
        )}
      </main>
    </>
  );
}

function HomeLoading() {
  return (
    <>
      <Skeleton className="h-52 rounded-3xl" />
      <div className="grid grid-cols-3 gap-2">
        <Skeleton className="h-24 rounded-2xl" />
        <Skeleton className="h-24 rounded-2xl" />
        <Skeleton className="h-24 rounded-2xl" />
      </div>
      <div className="grid gap-3">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-24 rounded-2xl" />
      </div>
      <div className="grid gap-3">
        <Skeleton className="h-5 w-32" />
        <div className="grid grid-cols-2 gap-2">
          <Skeleton className="h-28 rounded-2xl" />
          <Skeleton className="h-28 rounded-2xl" />
        </div>
      </div>
      <Skeleton className="h-20 rounded-2xl" />
    </>
  );
}

function HeroStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="grid gap-0.5 text-center">
      <p className="text-lg font-bold tabular-nums leading-none">{value}</p>
      <p className="text-[0.65rem] opacity-80">{label}</p>
    </div>
  );
}

function SectionTitle({ title, to }: { title: string; to?: "/historico" | "/perfil" }) {
  return (
    <div className="flex items-center justify-between">
      <h2 className="text-base font-semibold">{title}</h2>
      {to ? (
        <Button asChild variant="ghost" size="sm" className="-mr-2 text-muted-foreground">
          <Link to={to}>
            Ver tudo
            <ChevronRight />
          </Link>
        </Button>
      ) : null}
    </div>
  );
}

function EmptyCard({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: typeof Trophy;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="grid justify-items-center gap-3 rounded-2xl border border-dashed bg-card/60 px-5 py-8 text-center">
      <span className="grid size-11 place-items-center rounded-xl bg-muted text-muted-foreground">
        <Icon className="size-5" />
      </span>
      <div>
        <p className="font-medium">{title}</p>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </div>
      {action}
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
        "flex min-h-24 flex-col items-center justify-center gap-2 rounded-2xl border p-2 text-center text-xs font-medium shadow-xs transition-transform active:scale-[0.97]",
        primary ? "border-primary bg-primary text-primary-foreground" : "bg-card text-foreground",
      )}
    >
      <span
        className={cn(
          "grid size-10 place-items-center rounded-xl",
          primary ? "bg-white/15" : "bg-accent text-accent-foreground",
        )}
      >
        <Icon className="size-5" />
      </span>
      {label}
    </Link>
  );
}
