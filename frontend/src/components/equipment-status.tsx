import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { ChevronRight, CircleDot, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  BALL_WARN_DAYS,
  OVERGRIP_WARN_DAYS,
  WEAR_STRIPE_CLASS,
  WEAR_TONE_CLASS,
  latestServiceAcross,
  wearTone,
} from "@/lib/equipment";
import { daysSince, formatRelativeDays } from "@/lib/format";
import { SERVICE_KIND_META } from "@/lib/racket-service";
import { financeQueryOptions, racketsQueryOptions } from "@/lib/queries";
import { cn } from "@/lib/utils";

export function EquipmentStatus() {
  const { data: rackets, isPending: racketsPending } = useQuery(racketsQueryOptions());
  const { data: finance, isPending: financePending } = useQuery(financeQueryOptions());

  if (racketsPending || financePending) {
    return (
      <section className="grid gap-3">
        <Skeleton className="h-5 w-32" />
        <div className="grid grid-cols-2 gap-2">
          <Skeleton className="h-24 rounded-2xl" />
          <Skeleton className="h-24 rounded-2xl" />
        </div>
      </section>
    );
  }

  const overgrip = latestServiceAcross(rackets ?? [], ["Overgrip"]);
  const ballsAt = finance?.lastBallCanOpenedAt ?? null;

  return (
    <section className="grid gap-3">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold">Equipamento</h2>
        <Button asChild variant="ghost" size="sm" className="-mr-2 text-muted-foreground">
          <Link to="/perfil">
            Ver tudo
            <ChevronRight />
          </Link>
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <StatusTile
          icon={CircleDot}
          title="Bolinhas"
          subtitle={finance?.ballName?.trim() || "Última lata"}
          changedAt={ballsAt}
          emptyLabel="Nenhuma lata"
          warnAfter={BALL_WARN_DAYS}
        />
        <StatusTile
          icon={SERVICE_KIND_META.Overgrip.icon}
          title="Overgrip"
          subtitle={overgrip ? overgrip.racket.name : "Última troca"}
          changedAt={overgrip?.service.changedAt ?? null}
          emptyLabel="Sem troca"
          warnAfter={OVERGRIP_WARN_DAYS}
        />
      </div>
    </section>
  );
}

function StatusTile({
  icon: Icon,
  title,
  subtitle,
  changedAt,
  emptyLabel,
  warnAfter,
}: {
  icon: LucideIcon;
  title: string;
  subtitle: string;
  changedAt: string | null;
  emptyLabel: string;
  warnAfter: number;
}) {
  const tone = wearTone(changedAt, warnAfter);
  const days = changedAt ? daysSince(changedAt) : null;

  return (
    <Link
      to="/perfil"
      className="relative grid min-w-0 gap-3 overflow-hidden rounded-2xl border bg-card p-3.5 shadow-xs transition-colors active:bg-accent"
    >
      <span
        aria-hidden
        className={cn(
          "absolute inset-x-0 top-0 h-1",
          tone ? WEAR_STRIPE_CLASS[tone] : "bg-border",
        )}
      />
      <div className="flex items-center justify-between gap-2">
        <span
          className={cn(
            "grid size-10 shrink-0 place-items-center rounded-xl",
            tone ? WEAR_TONE_CLASS[tone] : "bg-muted text-muted-foreground",
          )}
        >
          <Icon className="size-5" />
        </span>
        {days != null ? (
          <span
            className={cn(
              "rounded-full px-2 py-0.5 text-[0.65rem] font-semibold tabular-nums",
              tone ? WEAR_TONE_CLASS[tone] : "bg-muted text-muted-foreground",
            )}
          >
            {days}d
          </span>
        ) : null}
      </div>
      <div className="min-w-0">
        <p className="text-[0.65rem] font-medium uppercase tracking-wide text-muted-foreground">{title}</p>
        <p className="mt-0.5 truncate text-sm font-semibold">
          {changedAt ? capitalize(formatRelativeDays(changedAt)) : emptyLabel}
        </p>
        <p className="truncate text-xs text-muted-foreground">{subtitle}</p>
      </div>
    </Link>
  );
}

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
