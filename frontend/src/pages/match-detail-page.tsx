import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "@tanstack/react-router";
import { ChevronRight, Lightbulb, Pencil } from "lucide-react";
import { useState } from "react";
import { OpponentDetailsDialog } from "@/components/opponent-details-dialog";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { formatFullDate } from "@/lib/format";
import { dashboardHeadToHeadByOpponentQueryOptions, matchQueryOptions } from "@/lib/queries";
import { cn } from "@/lib/utils";

export function MatchDetailPage() {
  const { matchId } = useParams({ from: "/app/partidas/$matchId" });
  const { data: match, isPending } = useQuery(matchQueryOptions(matchId));
  const { data: h2h, isPending: h2hPending } = useQuery(dashboardHeadToHeadByOpponentQueryOptions(match?.opponentId ?? ""));
  const [opponentOpen, setOpponentOpen] = useState(false);

  if (isPending || !match) {
    return (
      <>
        <PageHeader title="Partida" back />
        <div className="grid gap-4 px-4 pt-4">
          <Skeleton className="h-11 w-24 rounded-xl" />
          <Skeleton className="h-36 rounded-2xl" />
          <Skeleton className="h-24 rounded-2xl" />
          <Skeleton className="h-24 rounded-2xl" />
        </div>
      </>
    );
  }

  const wins = h2h?.wins ?? 0;
  const losses = h2h?.losses ?? 0;
  const played = h2h?.played ?? 0;
  const share = played === 0 ? 0 : Math.round((wins / played) * 100);

  const tips = [
    match.weaknesses ? `Trabalhe isto no treino: ${match.weaknesses}` : null,
    match.opponentStrengths ? `O adversário impôs: ${match.opponentStrengths}` : null,
    !match.won ? "Revise o plano de jogo deste confronto antes do próximo duelo." : null,
  ].filter((value): value is string => Boolean(value));

  const details = [
    { title: "Seus pontos fortes", value: match.strengths },
    { title: "Seus pontos fracos", value: match.weaknesses },
    { title: "Pontos fortes do adversário", value: match.opponentStrengths },
    { title: "Pontos fracos do adversário", value: match.opponentWeaknesses },
    { title: "Observações", value: match.notes },
  ].filter((item) => Boolean(item.value));

  return (
    <>
      <PageHeader
        title={match.opponentName}
        description={formatFullDate(match.playedAt)}
        back
        action={
          <Button asChild variant="outline" size="sm">
            <Link to="/partidas/$matchId/editar" params={{ matchId }}>
              <Pencil />
              Editar
            </Link>
          </Button>
        }
      />

      <main className="grid gap-5 px-4 pt-4">
        <section
          className={cn(
            "grid gap-3 rounded-2xl p-5 text-white shadow-lg",
            match.won ? "bg-success" : "bg-destructive",
          )}
        >
          <p className="text-sm font-semibold tracking-wide uppercase opacity-80">
            {match.won ? "Vitória" : "Derrota"}
          </p>
          <p className="text-4xl leading-none font-bold tabular-nums">{match.score}</p>
          <div className="flex flex-wrap gap-2">
            <span className="rounded-full bg-white/20 px-2.5 py-1 text-xs font-medium">
              {match.courtType}
            </span>
            <span className="rounded-full bg-white/20 px-2.5 py-1 text-xs font-medium">
              Adversário {match.opponentHandedness.toLowerCase()}
            </span>
          </div>
        </section>

        <section className="rounded-2xl border bg-card p-0 shadow-xs">
          {h2hPending ? (
            <div className="grid gap-3 p-4">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-2 w-full rounded-full" />
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setOpponentOpen(true)}
              className="w-full rounded-2xl p-4 text-left transition-colors outline-none active:bg-accent focus-visible:ring-[3px] focus-visible:ring-ring/50"
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="font-semibold">Head to head</h2>
                  <p className="text-xs text-muted-foreground">
                    {played} {played === 1 ? "jogo" : "jogos"} contra {match.opponentName}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <p className="text-lg font-bold tabular-nums">
                    <span className="text-success">{wins}</span>
                    <span className="text-muted-foreground">-</span>
                    <span className="text-destructive">{losses}</span>
                  </p>
                  <ChevronRight className="size-4 text-muted-foreground" />
                </div>
              </div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-destructive/20">
                <div className="h-full rounded-full bg-success" style={{ width: `${share}%` }} />
              </div>
            </button>
          )}
        </section>

        <OpponentDetailsDialog
          opponentId={opponentOpen ? match.opponentId : null}
          h2h={h2h}
          onClose={() => setOpponentOpen(false)}
        />

        {tips.length > 0 ? (
          <section className="grid gap-2">
            <h2 className="flex items-center gap-2 text-base font-semibold">
              <Lightbulb className="size-4 text-muted-foreground" />
              Avisos de melhoria
            </h2>
            {tips.map((tip) => (
              <p key={tip} className="rounded-xl border-l-4 border-warning bg-warning/8 px-3 py-2.5 text-sm">
                {tip}
              </p>
            ))}
          </section>
        ) : null}

        {details.length > 0 ? (
          <section className="grid gap-3 rounded-2xl border bg-card p-4 shadow-xs">
            {details.map((item) => (
              <div key={item.title} className="grid gap-1">
                <h3 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                  {item.title}
                </h3>
                <p className="text-sm">{item.value}</p>
              </div>
            ))}
          </section>
        ) : (
          <p className="rounded-xl bg-muted px-3 py-6 text-center text-sm text-muted-foreground">
            Sem anotações nesta partida.
          </p>
        )}
      </main>
    </>
  );
}
