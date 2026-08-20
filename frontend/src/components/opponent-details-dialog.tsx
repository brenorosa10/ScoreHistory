import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Pencil } from "lucide-react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { HeadToHead } from "@/lib/api";
import { toInitials } from "@/lib/format";
import { opponentQueryOptions } from "@/lib/queries";

type OpponentDetailsDialogProps = {
  opponentId: string | null;
  h2h?: Pick<HeadToHead, "played" | "wins" | "losses" | "lastScore">;
  onClose: () => void;
};

export function OpponentDetailsDialog({ opponentId, h2h, onClose }: OpponentDetailsDialogProps) {
  const open = Boolean(opponentId);
  const { data: opponent, isPending, isError } = useQuery({
    ...opponentQueryOptions(opponentId ?? ""),
    enabled: open,
  });

  const played = h2h?.played ?? opponent?.played ?? 0;
  const wins = h2h?.wins ?? opponent?.wins ?? 0;
  const losses = h2h?.losses ?? (played > 0 ? played - wins : 0);
  const name = opponent?.name ?? "Adversário";

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={name}
      description={opponent?.handedness ?? (isPending ? "Carregando perfil..." : undefined)}
    >
      {isPending ? (
        <div className="grid gap-3">
          <Skeleton className="h-16 rounded-2xl" />
          <Skeleton className="h-20 rounded-2xl" />
          <Skeleton className="h-16 rounded-2xl" />
        </div>
      ) : isError || !opponent ? (
        <p className="text-sm text-destructive">Não foi possível carregar o adversário.</p>
      ) : (
        <div className="grid gap-4">
          <div className="flex items-center gap-3">
            <span className="grid size-12 shrink-0 place-items-center rounded-full bg-accent text-sm font-semibold text-accent-foreground">
              {toInitials(opponent.name)}
            </span>
            <div className="min-w-0">
              <p className="truncate font-medium">{opponent.name}</p>
              <p className="text-xs text-muted-foreground">{opponent.handedness}</p>
            </div>
          </div>

          <div className="rounded-2xl border bg-card p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold">Head to head</p>
                <p className="text-xs text-muted-foreground">
                  {played} {played === 1 ? "jogo" : "jogos"}
                  {h2h?.lastScore ? ` · último ${h2h.lastScore}` : ""}
                </p>
              </div>
              <p className="text-lg font-bold tabular-nums">
                <span className="text-success">{wins}</span>
                <span className="text-muted-foreground">-</span>
                <span className="text-destructive">{losses}</span>
              </p>
            </div>
          </div>

          {opponent.strengths || opponent.weaknesses ? (
            <div className="grid gap-2 text-sm">
              {opponent.strengths ? (
                <p>
                  <span className="font-medium text-success">Forte: </span>
                  <span className="text-muted-foreground">{opponent.strengths}</span>
                </p>
              ) : null}
              {opponent.weaknesses ? (
                <p>
                  <span className="font-medium text-destructive">Fraco: </span>
                  <span className="text-muted-foreground">{opponent.weaknesses}</span>
                </p>
              ) : null}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Sem pontos fortes ou fracos cadastrados.</p>
          )}

          {opponent.notes ? (
            <p className="text-sm text-muted-foreground">{opponent.notes}</p>
          ) : null}

          <Button asChild variant="outline" className="w-full">
            <Link
              to="/adversarios/$opponentId/editar"
              params={{ opponentId: opponent.id }}
              onClick={onClose}
            >
              <Pencil />
              Editar adversário
            </Link>
          </Button>
        </div>
      )}
    </Dialog>
  );
}
