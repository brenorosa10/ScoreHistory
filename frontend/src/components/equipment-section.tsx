import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Backpack, Pencil, Plus, Trash2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { useState } from "react";
import { BrandMark } from "@/components/brand-mark";
import { SectionHeading } from "@/components/finance-section";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useUpdateFinance } from "@/hooks/use-update-finance";
import type { FinanceBall, FinanceRecord, RacketRecord, RacketServiceKind, RacketServiceRecord } from "@/lib/api";
import {
  BALL_WARN_DAYS,
  OVERGRIP_WARN_DAYS,
  STRING_WARN_DAYS,
  WEAR_TONE_CLASS,
  wearTone,
} from "@/lib/equipment";
import { ballsToPayload, financeToPayload, moneyFieldRule } from "@/lib/finance";
import {
  dateInputToIso,
  formatMoney,
  formatRelativeDays,
  moneyToInput,
  parseMoney,
  toDateInputValue,
  todayInputValue,
} from "@/lib/format";
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
  return (
    <>
      <RacketsSection />
      <BallsSection />
    </>
  );
}

function RacketsSection() {
  const { data: rackets = [], isPending } = useQuery(racketsQueryOptions());
  const { data: finance } = useQuery(financeQueryOptions());

  return (
    <section className="grid min-w-0 gap-4 overflow-hidden rounded-2xl border bg-card p-4 shadow-xs">
      <SectionHeading
        icon={<Backpack className="size-4" />}
        title="Raquetes"
        description="Corda, overgrip e desgaste."
        action={
          <Button asChild size="sm" className="shrink-0">
            <Link to="/perfil/raquetes/novo">
              <Plus />
              Raquete
            </Link>
          </Button>
        }
      />

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
              Cadastre para acompanhar corda, tensão e overgrip.
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

function BallsSection() {
  const { data: finance, isPending } = useQuery(financeQueryOptions());
  const [creating, setCreating] = useState(false);
  const balls = finance?.balls ?? [];

  return (
    <section className="grid min-w-0 gap-4 overflow-hidden rounded-2xl border bg-card p-4 shadow-xs">
      <SectionHeading
        icon={<BrandMark className="size-5" />}
        title="Bolinhas"
        description="Cadastre cada modelo para abrir a lata."
        action={
          finance && !creating ? (
            <Button size="sm" className="shrink-0" onClick={() => setCreating(true)}>
              <Plus />
              Bolinha
            </Button>
          ) : null
        }
      />

      {isPending || !finance ? (
        <Skeleton className="h-24 rounded-xl" />
      ) : (
        <div className="grid min-w-0 gap-2">
          {creating ? (
            <BallEditor
              finance={finance}
              onDone={() => setCreating(false)}
            />
          ) : null}
          {balls.length === 0 && !creating ? (
            <div className="grid justify-items-center gap-3 rounded-xl border border-dashed px-4 py-7 text-center">
              <BrandMark className="size-8" />
              <div>
                <p className="text-sm font-medium">Nenhuma bolinha</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Cadastre o modelo para registrar quando abrir uma lata.
                </p>
              </div>
              <Button size="sm" variant="outline" onClick={() => setCreating(true)}>
                Cadastrar bolinha
              </Button>
            </div>
          ) : (
            balls.map((ball) => (
              <BallCard key={ball.id} ball={ball} finance={finance} />
            ))
          )}
        </div>
      )}
    </section>
  );
}

function BallCard({ ball, finance }: { ball: FinanceBall; finance: FinanceRecord }) {
  const [editing, setEditing] = useState(false);
  const mutation = useUpdateFinance();
  const tone = wearTone(ball.lastOpenedAt, BALL_WARN_DAYS);

  function openToday() {
    mutation.mutate({
      ...financeToPayload(finance),
      balls: ballsToPayload(
        finance.balls.map((item) =>
          item.id === ball.id ? { ...item, lastOpenedAt: new Date().toISOString() } : item,
        ),
      ),
    });
  }

  if (editing) {
    return <BallEditor finance={finance} ball={ball} onDone={() => setEditing(false)} />;
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
          <BrandMark className="size-7" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium">{ball.name?.trim() || "Bolinha"}</p>
          <p className="truncate text-xs text-muted-foreground">
            {ball.lastOpenedAt
              ? `Lata aberta ${formatRelativeDays(ball.lastOpenedAt)}`
              : "Nenhuma lata registrada"}
            {ball.canPrice != null ? ` · ${formatMoney(ball.canPrice)}` : ""}
          </p>
        </div>
        <Button
          variant="outline"
          size="icon-sm"
          aria-label={`Editar ${ball.name?.trim() || "bolinha"}`}
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

type BallFormValues = {
  name: string;
  canPrice: string;
  lastOpenedAt: string;
};

function BallEditor({
  finance,
  ball,
  onDone,
}: {
  finance: FinanceRecord;
  ball?: FinanceBall;
  onDone: () => void;
}) {
  const mutation = useUpdateFinance();
  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<BallFormValues>({
    defaultValues: {
      name: ball?.name ?? "",
      canPrice: moneyToInput(ball?.canPrice),
      lastOpenedAt: toDateInputValue(ball?.lastOpenedAt),
    },
  });

  function save(values: BallFormValues) {
    const current = {
      name: values.name.trim() || null,
      canPrice: parseMoney(values.canPrice),
      lastOpenedAt: dateInputToIso(values.lastOpenedAt),
    };
    const balls = ball
      ? finance.balls.map((item) => (item.id === ball.id ? { ...item, ...current } : item))
      : [...finance.balls, current];

    mutation.mutate(
      {
        ...financeToPayload(finance),
        balls: ballsToPayload(balls),
      },
      { onSuccess: onDone },
    );
  }

  function remove() {
    if (!ball) {
      onDone();
      return;
    }
    mutation.mutate(
      {
        ...financeToPayload(finance),
        balls: ballsToPayload(finance.balls.filter((item) => item.id !== ball.id)),
      },
      { onSuccess: onDone },
    );
  }

  return (
    <form className="grid gap-3 rounded-xl border bg-muted/40 p-3" onSubmit={handleSubmit(save)}>
      <Field label="Modelo" htmlFor={`ball-name-${ball?.id ?? "new"}`} hint="opcional">
        <Input
          id={`ball-name-${ball?.id ?? "new"}`}
          placeholder="Ex.: Wilson Extra Duty"
          {...register("name")}
        />
      </Field>
      <div className="grid grid-cols-2 gap-2">
        <Field label="Última lata" htmlFor={`ball-opened-${ball?.id ?? "new"}`}>
          <Input
            id={`ball-opened-${ball?.id ?? "new"}`}
            type="date"
            max={todayInputValue()}
            {...register("lastOpenedAt")}
          />
        </Field>
        <Field label="Valor da lata" htmlFor={`ball-price-${ball?.id ?? "new"}`} hint="R$" error={errors.canPrice?.message}>
          <Input
            id={`ball-price-${ball?.id ?? "new"}`}
            inputMode="decimal"
            className="tabular-nums"
            placeholder="0,00"
            aria-invalid={errors.canPrice ? true : undefined}
            {...register("canPrice", { validate: moneyFieldRule })}
          />
        </Field>
      </div>
      <Button
        type="button"
        size="sm"
        variant="secondary"
        className="justify-self-start"
        onClick={() => setValue("lastOpenedAt", todayInputValue(), { shouldDirty: true })}
      >
        <BrandMark className="size-4" />
        Marcar lata aberta hoje
      </Button>
      <div className="grid gap-2 sm:grid-cols-2">
        <Button type="submit" loading={mutation.isPending}>
          {mutation.isPending ? "Salvando..." : "Salvar"}
        </Button>
        <Button type="button" variant="ghost" onClick={onDone}>
          Cancelar
        </Button>
      </div>
      {ball ? (
        <Button type="button" variant="outline" className="text-destructive" disabled={mutation.isPending} onClick={remove}>
          <Trash2 />
          Excluir bolinha
        </Button>
      ) : null}
      {mutation.isError ? (
        <p role="alert" className="text-sm font-medium text-destructive">
          {mutation.error instanceof Error ? mutation.error.message : "Falha ao salvar."}
        </p>
      ) : null}
    </form>
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
