import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Pencil, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { RacketRecord, RacketServiceKind } from "@/lib/api";
import { formatRelativeDays } from "@/lib/format";
import { SERVICE_KIND_META } from "@/lib/racket-service";
import { racketsQueryOptions } from "@/lib/queries";
import { cn } from "@/lib/utils";

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
          <Skeleton className="h-24 rounded-xl" />
          <Skeleton className="h-24 rounded-xl" />
        </div>
      ) : rackets.length === 0 ? (
        <p className="rounded-xl border border-dashed px-3 py-6 text-center text-sm text-muted-foreground">
          Cadastre sua raquete para acompanhar corda, lb e trocas de overgrip.
        </p>
      ) : (
        <div className="grid min-w-0 gap-2">
          {rackets.map((racket) => (
            <RacketCard key={racket.id} racket={racket} />
          ))}
        </div>
      )}
    </section>
  );
}

function RacketCard({ racket }: { racket: RacketRecord }) {
  const lastService = racket.services[0];
  const specs = [
    { label: "Corda", value: racket.stringName?.trim() || "—" },
    { label: "Tensão", value: racket.tensionLb != null ? `${racket.tensionLb} lb` : "—" },
    { label: "Grip", value: racket.grip?.trim() || "—" },
  ];

  return (
    <article className="grid min-w-0 gap-3 overflow-hidden rounded-xl border p-3">
      <div className="flex min-w-0 items-start gap-3">
        <RacketGlyph
          frameColor={racket.frameColor}
          stringColor={racket.stringColor}
          gripColor={racket.gripColor}
        />
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium">{racket.name}</p>
          {lastService ? (
            <LastService kind={lastService.kind} changedAt={lastService.changedAt} detail={lastService.detail} />
          ) : (
            <p className="truncate text-xs text-muted-foreground">Nenhuma troca registrada</p>
          )}
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

      <dl className="grid min-w-0 grid-cols-3 gap-1.5">
        {specs.map((spec) => (
          <div key={spec.label} className="grid min-w-0 gap-0.5 rounded-lg bg-muted/60 px-2 py-1.5 text-center">
            <dt className="truncate text-[0.65rem] text-muted-foreground">{spec.label}</dt>
            <dd className="truncate text-xs font-semibold tabular-nums">{spec.value}</dd>
          </div>
        ))}
      </dl>
    </article>
  );
}

function LastService({
  kind,
  changedAt,
  detail,
}: {
  kind: RacketServiceKind;
  changedAt: string;
  detail: string | null;
}) {
  const meta = SERVICE_KIND_META[kind];
  const Icon = meta.icon;

  return (
    <p className="flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground">
      <span className={cn("grid size-5 shrink-0 place-items-center rounded-md", meta.bubble)}>
        <Icon className="size-3" />
      </span>
      <span className="truncate">
        {kind}
        {detail ? ` · ${detail}` : ""} · {formatRelativeDays(changedAt)}
      </span>
    </p>
  );
}

function RacketGlyph({
  frameColor,
  stringColor,
  gripColor,
}: {
  frameColor: string;
  stringColor: string;
  gripColor: string;
}) {
  return (
    <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-muted/70">
      <svg viewBox="0 0 24 24" className="size-7" aria-hidden>
        <ellipse
          cx="12"
          cy="8.5"
          rx="6.2"
          ry="7.5"
          fill={stringColor}
          fillOpacity="0.45"
          stroke={frameColor}
          strokeWidth="1.6"
        />
        <line x1="12" y1="16" x2="12" y2="17.5" stroke={frameColor} strokeWidth="1.6" />
        <rect x="10.6" y="17" width="2.8" height="6" rx="1.4" fill={gripColor} />
      </svg>
    </span>
  );
}
