import { Trash2, Waves } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { RacketServiceKind, RacketServicePayload } from "@/lib/api";
import { formatFullDate, formatRelativeDays } from "@/lib/format";
import { SERVICE_KIND_META, SERVICE_KIND_ORDER } from "@/lib/racket-service";
import { cn } from "@/lib/utils";

type RacketServiceHistoryProps = {
  services: RacketServicePayload[];
  onRemove?: (id: string | undefined, index: number) => void;
};

export function RacketServiceHistory({ services, onRemove }: RacketServiceHistoryProps) {
  const [filter, setFilter] = useState<RacketServiceKind | "Todos">("Todos");

  if (services.length === 0) {
    return (
      <div className="grid justify-items-center gap-1 rounded-xl border border-dashed px-4 py-8 text-center">
        <Waves className="size-5 text-muted-foreground" />
        <p className="text-sm font-medium">Nenhuma troca registrada</p>
        <p className="text-xs text-muted-foreground">
          Registre cordas e overgrips para acompanhar o desgaste.
        </p>
      </div>
    );
  }

  const entries = services
    .map((service, index) => ({ service, index }))
    .sort((a, b) => b.service.changedAt.localeCompare(a.service.changedAt));

  const kindsUsed = SERVICE_KIND_ORDER.filter((kind) =>
    entries.some((entry) => entry.service.kind === kind),
  );
  const latestByKind = kindsUsed.map((kind) => ({
    kind,
    service: entries.find((entry) => entry.service.kind === kind)!.service,
  }));
  const showFilter = entries.length > 3 && kindsUsed.length > 1;
  const visible =
    filter === "Todos" ? entries : entries.filter((entry) => entry.service.kind === filter);

  return (
    <div className="grid gap-3">
      <div className="grid gap-2 sm:grid-cols-2">
        {latestByKind.map(({ kind, service }) => {
          const Icon = SERVICE_KIND_META[kind].icon;
          return (
            <div
              key={kind}
              className="flex min-w-0 items-center gap-2 rounded-xl bg-muted/60 px-3 py-2"
            >
              <span
                className={cn(
                  "grid size-7 shrink-0 place-items-center rounded-lg",
                  SERVICE_KIND_META[kind].bubble,
                )}
              >
                <Icon className="size-3.5" />
              </span>
              <div className="min-w-0">
                <p className="truncate text-xs text-muted-foreground">{kind}</p>
                <p className="truncate text-sm font-medium">{formatRelativeDays(service.changedAt)}</p>
              </div>
            </div>
          );
        })}
      </div>

      {showFilter ? (
        <div className="flex flex-wrap gap-1.5">
          <FilterChip
            label="Todas"
            count={entries.length}
            active={filter === "Todos"}
            onClick={() => setFilter("Todos")}
          />
          {kindsUsed.map((kind) => (
            <FilterChip
              key={kind}
              label={kind}
              count={entries.filter((entry) => entry.service.kind === kind).length}
              active={filter === kind}
              onClick={() => setFilter(kind)}
            />
          ))}
        </div>
      ) : null}

      <ol className="grid">
        {visible.map(({ service, index }, position) => {
          const meta = SERVICE_KIND_META[service.kind];
          const Icon = meta.icon;
          const isLast = position === visible.length - 1;

          return (
            <li
              key={service.id ?? `${service.kind}-${service.changedAt}-${index}`}
              className="relative grid grid-cols-[2.25rem_1fr] gap-3"
            >
              {isLast ? null : (
                <span
                  aria-hidden
                  className="absolute top-9 bottom-0 left-[1.125rem] w-px -translate-x-1/2 bg-border"
                />
              )}

              <span className={cn("z-10 grid size-9 place-items-center rounded-full", meta.bubble)}>
                <Icon className="size-4" />
              </span>

              <div className={cn("flex min-w-0 items-start gap-2", isLast ? "pb-0" : "pb-4")}>
                <div className="min-w-0 flex-1">
                  <div className="flex min-w-0 flex-wrap items-center gap-1.5">
                    <span className="text-sm font-semibold">{service.kind}</span>
                    {service.tensionLb != null ? (
                      <Badge variant="outline" className="tabular-nums">
                        {service.tensionLb} lb
                      </Badge>
                    ) : null}
                  </div>
                  {service.detail ? (
                    <p className="truncate text-sm text-muted-foreground">{service.detail}</p>
                  ) : null}
                  <p className="text-xs text-muted-foreground">
                    {formatFullDate(service.changedAt)} · {formatRelativeDays(service.changedAt)}
                  </p>
                </div>

                {onRemove ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Remover troca de ${service.kind}`}
                    className="shrink-0 text-muted-foreground"
                    onClick={() => onRemove(service.id, index)}
                  >
                    <Trash2 />
                  </Button>
                ) : null}
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

function FilterChip({
  label,
  count,
  active,
  onClick,
}: {
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors outline-none",
        "focus-visible:ring-[3px] focus-visible:ring-ring/50",
        active
          ? "border-primary bg-primary text-primary-foreground"
          : "border-input bg-background text-muted-foreground hover:bg-accent hover:text-accent-foreground",
      )}
    >
      {label}
      <span className="tabular-nums opacity-70">{count}</span>
    </button>
  );
}
