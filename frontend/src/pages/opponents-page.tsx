import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Plus, Users } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toInitials } from "@/lib/format";
import { matchesQueryOptions, opponentsQueryOptions } from "@/lib/queries";

export function OpponentsPage() {
  const { data: opponents = [] } = useQuery(opponentsQueryOptions());
  const { data: matches = [] } = useQuery(matchesQueryOptions());

  return (
    <>
      <PageHeader
        title="Adversários"
        description="Perfis, características e confrontos"
        back
        action={
          <Button asChild size="sm">
            <Link to="/adversarios/novo">
              <Plus />
              Novo
            </Link>
          </Button>
        }
      />

      <main className="grid gap-3 px-4 pt-4">
        {opponents.length === 0 ? (
          <EmptyState
            icon={Users}
            title="Nenhum adversário"
            description="Cadastre quem você enfrenta para acompanhar o head to head e os pontos a explorar."
            action={
              <Button asChild size="sm" className="mt-1">
                <Link to="/adversarios/novo">Cadastrar adversário</Link>
              </Button>
            }
          />
        ) : (
          opponents.map((opponent) => {
            const played = matches.filter((match) => match.opponentId === opponent.id);
            const wins = played.filter((match) => match.won).length;

            return (
              <article
                key={opponent.id}
                className="grid gap-3 rounded-2xl border bg-card p-4 shadow-xs"
              >
                <div className="flex items-center gap-3">
                  <span className="grid size-11 shrink-0 place-items-center rounded-full bg-accent text-sm font-semibold text-accent-foreground">
                    {toInitials(opponent.name)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{opponent.name}</p>
                    <p className="text-xs text-muted-foreground">{opponent.handedness}</p>
                  </div>
                  {played.length > 0 ? (
                    <Badge variant="outline">
                      H2H {wins}-{played.length - wins}
                    </Badge>
                  ) : (
                    <Badge variant="outline">Sem jogos</Badge>
                  )}
                </div>

                {opponent.strengths || opponent.weaknesses ? (
                  <div className="grid gap-1 border-t pt-3 text-sm">
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
                ) : null}

                {opponent.notes ? (
                  <p className="text-sm text-muted-foreground">{opponent.notes}</p>
                ) : null}
              </article>
            );
          })
        )}
      </main>
    </>
  );
}
