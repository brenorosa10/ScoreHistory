import { useQuery } from "@tanstack/react-query";
import { useForm, type UseFormRegisterReturn } from "react-hook-form";
import { Check, ChevronDown, Pencil, Wallet } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useUpdateFinance } from "@/hooks/use-update-finance";
import type { FinanceRecord } from "@/lib/api";
import {
  emptyFinanceForm,
  financeToForm,
  formToFinancePayload,
  moneyFieldRule,
  monthlyFinanceBreakdown,
  monthlyFinanceHint,
  isSameCalendarMonth,
  type FinanceFormValues,
} from "@/lib/finance";
import { formatMoney } from "@/lib/format";
import { financeQueryOptions, racketsQueryOptions } from "@/lib/queries";
import { cn } from "@/lib/utils";

type FinanceEditorProps = {
  finance: FinanceRecord;
  onDone?: () => void;
};

export function FinanceEditor({ finance, onDone }: FinanceEditorProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FinanceFormValues>({
    defaultValues: emptyFinanceForm(),
    values: financeToForm(finance),
  });
  const mutation = useUpdateFinance();

  return (
    <form
      className="grid gap-4"
      onSubmit={handleSubmit((values) =>
        mutation.mutate(formToFinancePayload(values), { onSuccess: onDone }),
      )}
    >
      <fieldset className="grid gap-3">
        <legend className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Mensalidades
        </legend>
        <div className="grid grid-cols-2 gap-2">
          <MoneyField
            id="fin-lesson"
            label="Aula"
            error={errors.lessonPrice?.message}
            register={register("lessonPrice", { validate: moneyFieldRule })}
          />
          <MoneyField
            id="fin-club"
            label="Clube"
            error={errors.clubPrice?.message}
            register={register("clubPrice", { validate: moneyFieldRule })}
          />
        </div>
      </fieldset>

      <fieldset className="grid gap-3">
        <legend className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Consumíveis
        </legend>
        <div className="grid grid-cols-3 gap-2">
          <MoneyField
            id="fin-string"
            label="Corda"
            error={errors.stringPrice?.message}
            register={register("stringPrice", { validate: moneyFieldRule })}
          />
          <MoneyField
            id="fin-overgrip"
            label="Overgrip"
            error={errors.overgripPrice?.message}
            register={register("overgripPrice", { validate: moneyFieldRule })}
          />
          <MoneyField
            id="fin-grip"
            label="Grip"
            error={errors.cushionGripPrice?.message}
            register={register("cushionGripPrice", { validate: moneyFieldRule })}
          />
        </div>
      </fieldset>

      <fieldset className="grid gap-3">
        <legend className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Raquetes
        </legend>
        {finance.rackets.length === 0 ? (
          <p className="rounded-xl border border-dashed px-3 py-4 text-center text-xs text-muted-foreground">
            Cadastre uma raquete no equipamento para informar o valor.
          </p>
        ) : (
          finance.rackets.map((racket) => (
            <MoneyField
              key={racket.id}
              id={`fin-racket-${racket.id}`}
              label={racket.name}
              error={errors.racketPrices?.[racket.id]?.message}
              register={register(`racketPrices.${racket.id}`, { validate: moneyFieldRule })}
            />
          ))
        )}
      </fieldset>

      <div className="grid gap-2 sm:grid-cols-2">
        <Button type="submit" loading={mutation.isPending}>
          <Check />
          {mutation.isPending ? "Salvando..." : "Salvar"}
        </Button>
        {onDone ? (
          <Button type="button" variant="ghost" onClick={onDone}>
            Cancelar
          </Button>
        ) : null}
      </div>
      {mutation.isError ? (
        <p role="alert" className="text-sm font-medium text-destructive">
          {mutation.error instanceof Error ? mutation.error.message : "Falha ao salvar."}
        </p>
      ) : null}
    </form>
  );
}

function MoneyField({
  id,
  label,
  error,
  register,
}: {
  id: string;
  label: string;
  error?: string;
  register: UseFormRegisterReturn;
}) {
  return (
    <Field label={label} htmlFor={id} hint="R$" error={error}>
      <Input
        id={id}
        inputMode="decimal"
        className="tabular-nums"
        placeholder="0,00"
        aria-invalid={error ? true : undefined}
        {...register}
      />
    </Field>
  );
}

export function FinanceSection() {
  const { data: finance, isPending, isError } = useQuery(financeQueryOptions());
  const { data: rackets = [] } = useQuery(racketsQueryOptions());
  const [editing, setEditing] = useState(false);

  const racketsTotal = finance?.rackets.reduce((sum, r) => sum + (r.purchasePrice ?? 0), 0) ?? 0;
  const month = finance ? monthlyFinanceBreakdown(finance, rackets) : null;
  const balls = finance?.balls ?? [];
  const hasAnyValue =
    finance &&
    [
      finance.lessonPrice,
      finance.clubPrice,
      finance.stringPrice,
      finance.overgripPrice,
      finance.cushionGripPrice,
      ...balls.map((ball) => ball.canPrice),
      ...finance.rackets.map((r) => r.purchasePrice),
    ].some((v) => v != null);

  return (
    <section className="grid min-w-0 gap-4 overflow-hidden rounded-2xl border bg-card p-4 shadow-xs">
      <SectionHeading
        icon={<Wallet className="size-4" />}
        title="Financeiro"
        description="Quanto você investe no jogo."
        action={
          finance && !editing ? (
            <Button size="sm" variant="outline" onClick={() => setEditing(true)}>
              <Pencil />
              Editar
            </Button>
          ) : null
        }
      />

      {isPending ? (
        <div className="grid gap-2">
          <Skeleton className="h-20 rounded-xl" />
          <Skeleton className="h-24 rounded-xl" />
        </div>
      ) : isError || !finance ? (
        <p className="rounded-xl border border-dashed px-3 py-4 text-center text-sm text-destructive">
          Não foi possível carregar o financeiro.
        </p>
      ) : editing ? (
        <FinanceEditor finance={finance} onDone={() => setEditing(false)} />
      ) : !hasAnyValue ? (
        <div className="grid justify-items-center gap-3 rounded-xl border border-dashed px-4 py-7 text-center">
          <Wallet className="size-6 text-muted-foreground" />
          <div>
            <p className="text-sm font-medium">Nenhum valor informado</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Registre aula, clube e os custos do seu equipamento.
            </p>
          </div>
          <Button size="sm" onClick={() => setEditing(true)}>
            Informar valores
          </Button>
        </div>
      ) : (
        <div className="grid gap-3">
          <div className="grid grid-cols-2 gap-2">
            <Highlight
              label="Neste mês"
              value={formatMoney(month?.total ?? 0)}
              hint={month ? monthlyFinanceHint(month) : undefined}
            />
            <Highlight label="Em raquetes" value={formatMoney(racketsTotal)} hint={`${finance.rackets.length} cadastrada${finance.rackets.length === 1 ? "" : "s"}`} />
          </div>

          <dl className="divide-y rounded-xl border">
            <Row label="Aula" value={finance.lessonPrice} />
            <Row label="Clube" value={finance.clubPrice} />
            {balls.map((ball, index) => (
              <Row
                key={ball.id}
                label={ball.name?.trim() || (balls.length > 1 ? `Lata ${index + 1}` : "Lata de bolinhas")}
                value={ball.canPrice}
                hint={isSameCalendarMonth(ball.lastOpenedAt) ? "aberta neste mês" : undefined}
              />
            ))}
            <Row
              label="Corda"
              value={finance.stringPrice}
              hint={swapHint(month?.stringCount ?? 0, "troca", "trocas")}
            />
            <Row
              label="Overgrip"
              value={finance.overgripPrice}
              hint={swapHint(month?.overgripCount ?? 0, "troca", "trocas")}
            />
            <Row
              label="Grip"
              value={finance.cushionGripPrice}
              hint={swapHint(month?.gripCount ?? 0, "troca", "trocas")}
            />
          </dl>

          {finance.rackets.length > 0 ? (
            <RacketPrices rackets={finance.rackets} />
          ) : null}
        </div>
      )}
    </section>
  );
}

function RacketPrices({ rackets }: { rackets: FinanceRecord["rackets"] }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-xl border">
      <button
        type="button"
        className="flex w-full items-center justify-between px-3 py-2.5 text-sm font-medium"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        Raquetes
        <ChevronDown className={cn("size-4 text-muted-foreground transition-transform", open && "rotate-180")} />
      </button>
      {open ? (
        <dl className="divide-y border-t">
          {rackets.map((racket) => (
            <Row key={racket.id} label={racket.name} value={racket.purchasePrice} />
          ))}
        </dl>
      ) : null}
    </div>
  );
}

function swapHint(count: number, singular: string, plural: string) {
  if (count <= 0) {
    return undefined;
  }
  return count === 1 ? `1 ${singular} neste mês` : `${count} ${plural} neste mês`;
}

function Highlight({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="grid gap-0.5 rounded-xl bg-primary/8 px-3 py-2.5">
      <p className="text-[0.65rem] font-medium uppercase tracking-wide text-primary">{label}</p>
      <p className="text-lg font-bold tabular-nums">{value}</p>
      {hint ? <p className="text-[0.65rem] text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

function Row({ label, value, hint }: { label: string; value: number | null; hint?: string }) {
  return (
    <div className="flex items-center justify-between gap-3 px-3 py-2">
      <div className="min-w-0">
        <dt className="truncate text-sm">{label}</dt>
        {hint ? <p className="text-[0.65rem] text-muted-foreground">{hint}</p> : null}
      </div>
      <dd className={cn("shrink-0 text-sm font-semibold tabular-nums", value == null && "text-muted-foreground")}>
        {formatMoney(value)}
      </dd>
    </div>
  );
}

export function SectionHeading({
  icon,
  title,
  description,
  action,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-accent text-accent-foreground">
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <h2 className="text-sm font-semibold">{title}</h2>
        <p className="truncate text-xs text-muted-foreground">{description}</p>
      </div>
      {action}
    </div>
  );
}
