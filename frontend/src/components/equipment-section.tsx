import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { CircleDot, Pencil, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { racketsQueryOptions } from "@/lib/queries";

export function EquipmentSection() {
  const { data: rackets = [], isPending } = useQuery(racketsQueryOptions());

  return (
    <section className="grid min-w-0 gap-3 overflow-hidden rounded-2xl border bg-card p-4 shadow-xs">
      <div className="flex min-w-0 items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-semibold">Equipamento</h2>
          <p className="text-xs text-muted-foreground">Raquetes, corda, tensão e grip.</p>
        </div>
        <Button asChild size="sm" className="shrink-0">
          <Link to="/perfil/raquetes/novo">
            <Plus />
            Nova
          </Link>
        </Button>
      </div>

      {isPending ? (
        <div className="grid gap-2">
          <Skeleton className="h-20 rounded-xl" />
          <Skeleton className="h-20 rounded-xl" />
        </div>
      ) : rackets.length === 0 ? (
        <p className="rounded-xl bg-muted px-3 py-6 text-center text-sm text-muted-foreground">
          Cadastre sua raquete para acompanhar corda, lb e trocas de overgrip.
        </p>
      ) : (
        <div className="grid min-w-0 gap-2">
          {rackets.map((racket) => (
            <article key={racket.id} className="grid min-w-0 gap-2 overflow-hidden rounded-xl border p-3">
              <div className="flex min-w-0 items-start gap-2">
                <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-accent text-accent-foreground">
                  <CircleDot className="size-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{racket.name}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {[
                      racket.stringName,
                      racket.tensionLb != null ? `${racket.tensionLb} lb` : null,
                      racket.grip,
                    ]
                      .filter(Boolean)
                      .join(" · ") || "Setup ainda não informado"}
                  </p>
                </div>
                <Button asChild variant="outline" size="icon-sm" className="shrink-0">
                  <Link
                    to="/perfil/raquetes/$racketId/editar"
                    params={{ racketId: racket.id }}
                    aria-label={`Editar ${racket.name}`}
                  >
                    <Pencil />
                  </Link>
                </Button>
              </div>
              {racket.services[0] ? (
                <p className="truncate text-xs text-muted-foreground">
                  Última troca: {racket.services[0].kind}
                  {racket.services[0].detail ? ` · ${racket.services[0].detail}` : ""}
                </p>
              ) : null}
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
