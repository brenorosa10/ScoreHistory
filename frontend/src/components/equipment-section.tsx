import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Backpack, CircleDot, Pencil, Plus } from "lucide-react";
import { useState } from "react";
import { FinanceEditor, SectionHeading } from "@/components/finance-section";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useUpdateFinance } from "@/hooks/use-update-finance";
import type { FinanceRecord, RacketRecord, RacketServiceKind, RacketServiceRecord } from "@/lib/api";
import {
  BALL_WARN_DAYS,
  OVERGRIP_WARN_DAYS,
  STRING_WARN_DAYS,
  WEAR_TONE_CLASS,
  wearTone,
} from "@/lib/equipment";
import { financeToPayload } from "@/lib/finance";
import { formatMoney, formatRelativeDays } from "@/lib/format";
import { SERVICE_KIND_META } from "@/lib/racket-service";
import { financeQueryOptions, racketsQueryOptions } from "@/lib/queries";
import { cn } from "@/lib/utils";

function latestService(
  services: RacketServiceRecord[],
  kinds: RacketServiceKind[],
): RacketServiceRecord | undefined {
  return services.find((service) => kinds.includes(service.kind));
}

export function EquipmentSection() {
  const { data: rackets = [], isPending } = useQuery(racketsQueryOptions());
  const { data: finance } = useQuery(financeQueryOptions());

  return (
    <section className="grid min-w-0 gap-4 overflow-hidden rounded-2xl border bg-card p-4 shadow-xs">
      <SectionHeading
        icon={<Backpack className="size-4" />}
        title="Equipamento"
        description="Raquetes, bolinhas e desgaste."
        action={
          <Button asChild size="sm" className="shrink-0">
            <Link to="/perfil/raquetes/novo">
              <Plus />
              Raquete
            </Link>
          </Button>
        }
      />

      {finance ? <BallsCard finance={finance} /> : <Skeleton className="h-20 rounded-xl" />}

      {isPending ? (
        <div className="grid gap-2">
          <Skeleton className="h-28 rounded-xl" />
        </div>
      ) : rackets.length === 0 ? (
        <div className="grid justify-items-center gap-3 rounded-xl border border-dashed px-4 py-7 text-center">
          <Backpack className="size-6 text-muted-foreground" />
          <div>
            <p className="text-sm font-medium">Nenhuma raquete</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Cadastre para acompanhar corda, tensão e trocas de grip.
            </p>
          </div>
          <Button asChild size="sm" variant="outline">
            <Link to="/perfil/raquetes/novo">Cadastrar raquete</Link>
          </Button>
        </div>
      ) : (
        <div className="grid min-w-0 gap-2">
          {rackets.map((racket) => (
            <RacketCard key={racket.id} racket={racket} finance={finance} />
          ))}
        </div>
      )}
    </section>
  );
}

function BallsCard({ finance }: { finance: FinanceRecord }) {
  const [editing, setEditing] = useState(false);
  const mutation = useUpdateFinance();
  const tone = wearTone(finance.lastBallCanOpenedAt, BALL_WARN_DAYS);

  function openToday() {
    mutation.mutate({ ...financeToPayload(finance), lastBallCanOpenedAt: new Date().toISOString() });
  }

  if (editing) {
    return (
      <div className="rounded-xl border bg-muted/40 p-3">
        <FinanceEditor variant="balls" finance={finance} onDone={() => setEditing(false)} />
      </div>
    );
  }

  return (
    <div className="grid gap-3 rounded-xl border p-3">
      <div className="flex min-w-0 items-center gap-3">
        <span
          className={cn(
            "grid size-10 shrink-0 place-items-center rounded-xl",
            tone ? WEAR_TONE_CLASS[tone] : "bg-muted text-muted-foreground",
          )}
        >
          <CircleDot className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium">{finance.ballName?.trim() || "Bolinhas"}</p>
          <p className="truncate text-xs text-muted-foreground">
            {finance.lastBallCanOpenedAt
              ? `Lata aberta ${formatRelativeDays(finance.lastBallCanOpenedAt)}`
              : "Nenhuma lata registrada"}
            {finance.ballCanPrice != null ? ` · ${formatMoney(finance.ballCanPrice)}` : ""}
          </p>
        </div>
        <Button
          variant="outline"
          size="icon-sm"
          aria-label="Editar bolinhas"
          className="shrink-0"
          onClick={() => setEditing(true)}
        >
          <Pencil />
        </Button>
      </div>
      <Button size="sm" variant="secondary" loading={mutation.isPending} onClick={openToday}>
        <Plus />
        Abri uma lata hoje
      </Button>
    </div>
  );
}

function RacketCard({
  racket,
  finance,
}: {
  racket: RacketRecord;
  finance: FinanceRecord | undefined;
}) {
  const lastCorda = latestService(racket.services, ["Corda"]);
  const lastOvergrip = latestService(racket.services, ["Overgrip"]);
  const lastCushion = latestService(racket.services, ["Grip"]);
  const tensionLb = lastCorda?.tensionLb ?? racket.tensionLb;

  const specs = [
    {
      kind: "Corda" as const,
      value: lastCorda?.detail?.trim() || racket.stringName?.trim() || "—",
      extra: tensionLb != null ? `${tensionLb} lb` : null,
      since: lastCorda?.changedAt,
      price: finance?.stringPrice,
      warn: STRING_WARN_DAYS,
    },
    {
      kind: "Overgrip" as const,
      value: lastOvergrip?.detail?.trim() || "—",
      extra: null,
      since: lastOvergrip?.changedAt,
      price: finance?.overgripPrice,
      warn: OVERGRIP_WARN_DAYS,
    },
    {
      kind: "Grip" as const,
      value: lastCushion?.detail?.trim() || racket.grip?.trim() || "—",
      extra: null,
      since: lastCushion?.changedAt,
      price: finance?.cushionGripPrice,
      warn: Number.POSITIVE_INFINITY,
    },
  ];

  return (
    <article className="grid min-w-0 gap-3 overflow-hidden rounded-xl border p-3">
      <div className="flex min-w-0 items-center gap-3">
        <RacketGlyph
          frameColor={racket.frameColor}
          stringColor={racket.stringColor}
          gripColor={racket.gripColor}
        />
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium">{racket.name}</p>
          <p className="truncate text-xs text-muted-foreground">
            {racket.purchasePrice != null ? formatMoney(racket.purchasePrice) : "Valor não informado"}
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

      <ul className="grid gap-1.5">
        {specs.map((spec) => {
          const meta = SERVICE_KIND_META[spec.kind];
          const Icon = meta.icon;
          const tone = wearTone(spec.since, spec.warn);
          return (
            <li key={spec.kind} className="flex min-w-0 items-center gap-2.5 rounded-lg bg-muted/60 px-2.5 py-2">
              <span className={cn("grid size-7 shrink-0 place-items-center rounded-md", meta.bubble)}>
                <Icon className="size-3.5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-medium">
                  {meta.label}
                  <span className="font-normal text-muted-foreground"> · {spec.value}</span>
                  {spec.extra ? <span className="font-normal text-muted-foreground"> · {spec.extra}</span> : null}
                </p>
                <p className="truncate text-[0.7rem] text-muted-foreground">
                  {spec.price != null ? formatMoney(spec.price) : "sem valor"}
                </p>
              </div>
              <span
                className={cn(
                  "shrink-0 rounded-full px-2 py-0.5 text-[0.65rem] font-medium",
                  tone ? WEAR_TONE_CLASS[tone] : "bg-muted text-muted-foreground",
                )}
              >
                {spec.since ? formatRelativeDays(spec.since) : "sem troca"}
              </span>
            </li>
          );
        })}
      </ul>
    </article>
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
