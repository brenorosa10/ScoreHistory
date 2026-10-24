import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { ChevronRight, CircleDot, Wallet, type LucideIcon } from "lucide-react";
import { useExpenseSheet } from "@/components/expense-sheet";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  BALL_WARN_DAYS,
  OVERGRIP_WARN_DAYS,
  STRING_WARN_DAYS,
  WEAR_STRIPE_CLASS,
  WEAR_TONE_CLASS,
  latestOpenedBall,
  latestServiceAcross,
  wearTone,
} from "@/lib/equipment";
import { daysSince, formatMoney, formatRelativeDays } from "@/lib/format";
import { categoryTotals, intervalLabel, monthKey } from "@/lib/ledger";
import { SERVICE_KIND_META } from "@/lib/racket-service";
import { racketHasStrings } from "@/lib/racket-sport";
import { expensesQueryOptions, financeQueryOptions, racketsQueryOptions } from "@/lib/queries";
import { cn } from "@/lib/utils";

export function EquipmentStatus() {
  const { data: rackets, isPending: racketsPending } = useQuery(racketsQueryOptions());
  const { data: finance, isPending: financePending } = useQuery(financeQueryOptions());
  const { data: expenses = [] } = useQuery(expensesQueryOptions());
  const { openSheet } = useExpenseSheet();

  if (racketsPending || financePending) {
    return (
      <section className="grid gap-3">
        <Skeleton className="h-5 w-32" />
        <div className="grid grid-cols-3 gap-2">
          <Skeleton className="h-28 rounded-2xl" />
          <Skeleton className="h-28 rounded-2xl" />
          <Skeleton className="h-28 rounded-2xl" />
        </div>
      </section>
    );
  }

  const list = rackets ?? [];
  const stringRackets = list.filter((racket) => racketHasStrings(racket.sport));
  const overgrip = latestServiceAcross(list, ["Overgrip"]);
  const corda = latestServiceAcross(stringRackets, ["Corda"]);
  const showStrings = stringRackets.length > 0;
  const latestBall = latestOpenedBall(finance?.balls ?? []);
  const ballsAt = latestBall?.lastOpenedAt ?? finance?.lastBallCanOpenedAt ?? null;
  const ballDates = (finance?.openings ?? []).map((opening) => opening.openedAt);
  if (ballDates.length === 0 && ballsAt) ballDates.push(ballsAt);

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

      <div className={cn("grid gap-2", showStrings ? "grid-cols-3" : "grid-cols-2")}>
        <StatusTile
          icon={CircleDot}
          title="Bolinhas"
          subtitle={latestBall?.name?.trim() || finance?.ballName?.trim() || "Última lata"}
          changedAt={ballsAt}
          average={intervalLabel(ballDates)}
          emptyLabel="Nenhuma lata"
          warnAfter={BALL_WARN_DAYS}
          onOpen={() => openSheet({ kind: "Bolinhas", ballCanId: latestBall?.id })}
        />
        <StatusTile
          icon={SERVICE_KIND_META.Overgrip.icon}
          title="Overgrip"
          subtitle={overgrip ? overgrip.racket.name : "Última troca"}
          changedAt={overgrip?.service.changedAt ?? null}
          average={intervalLabel(list.flatMap((racket) => racket.services.filter((service) => service.kind === "Overgrip").map((service) => service.changedAt)))}
          emptyLabel="Sem troca"
          warnAfter={OVERGRIP_WARN_DAYS}
          onOpen={() => openSheet({ kind: "Overgrip", racketId: overgrip?.racket.id })}
        />
        {showStrings ? (
          <StatusTile
            icon={SERVICE_KIND_META.Corda.icon}
            title="Corda"
            subtitle={corda ? corda.racket.name : "Última troca"}
            changedAt={corda?.service.changedAt ?? null}
            average={intervalLabel(stringRackets.flatMap((racket) => racket.services.filter((service) => service.kind === "Corda").map((service) => service.changedAt)))}
            emptyLabel="Sem troca"
            warnAfter={STRING_WARN_DAYS}
            onOpen={() => openSheet({ kind: "Corda", racketId: corda?.racket.id })}
          />
        ) : null}
      </div>
      <Link
        to="/financeiro"
        className="flex items-center gap-3 rounded-2xl border bg-card p-3 shadow-xs active:bg-accent"
      >
        <span className="grid size-10 place-items-center rounded-xl bg-primary/12 text-primary">
          <Wallet className="size-5" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold">Financeiro</span>
          <span className="block text-xs text-muted-foreground">
            Neste mês · {formatMoney(categoryTotals(expenses, monthKey()).total)}
          </span>
        </span>
        <ChevronRight className="size-4 text-muted-foreground" />
      </Link>
    </section>
  );
}

function StatusTile({
  icon: Icon,
  title,
  subtitle,
  changedAt,
  average,
  emptyLabel,
  warnAfter,
  onOpen,
}: {
  icon: LucideIcon;
  title: string;
  subtitle: string;
  changedAt: string | null;
  average: string | null;
  emptyLabel: string;
  warnAfter: number;
  onOpen: () => void;
}) {
  const tone = wearTone(changedAt, warnAfter);
  const days = changedAt ? daysSince(changedAt) : null;

  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={`${title}: ${changedAt ? `última troca ${formatRelativeDays(changedAt)}` : emptyLabel}. Troquei hoje`}
      className="relative grid min-w-0 gap-2 overflow-hidden rounded-2xl border bg-card p-3 text-left shadow-xs transition-colors active:bg-accent"
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
          <Icon className="size-5" aria-hidden />
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
        <p className="truncate text-[0.65rem] text-muted-foreground">{average ?? subtitle}</p>
        <p className="text-[0.65rem] font-semibold text-primary">Troquei hoje</p>
      </div>
    </button>
  );
}

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
