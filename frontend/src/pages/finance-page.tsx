import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, Pencil, Plus, Trash2, Wallet } from "lucide-react";
import { useState } from "react";
import { useExpenseSheet } from "@/components/expense-sheet";
import { PageHeader } from "@/components/page-header";
import { MoneyInput } from "@/components/money-input";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  deleteExpense,
  launchFees,
  updateExpense,
  type ExpenseCategoryName,
  type ExpenseRecord,
} from "@/lib/api";
import { formatMoney, formatShortDate, moneyToInput, parseMoney, toDateInputValue, dateInputToIso } from "@/lib/format";
import {
  CATEGORY_LABEL,
  EXPENSE_CATEGORIES,
  categoryTotals,
  expenseMonth,
  hasFee,
  monthKey,
  monthStart,
  recentMonthTotals,
  shiftMonth,
} from "@/lib/ledger";
import { expensesQueryKey, expensesQueryOptions, financeQueryKey, financeQueryOptions, racketsQueryKey } from "@/lib/queries";
import { cn } from "@/lib/utils";

export function FinancePage() {
  const { openSheet } = useExpenseSheet();
  const { data: expenses, isPending, isError } = useQuery(expensesQueryOptions());
  const { data: finance } = useQuery(financeQueryOptions());
  const [month, setMonth] = useState(monthKey);
  const current = monthKey();
  const rows = expenses ?? [];
  const totals = categoryTotals(rows, month);
  const previous = categoryTotals(rows, shiftMonth(month, -1));
  const series = recentMonthTotals(rows, month);
  const maxBar = Math.max(...series.map((item) => item.total), 1);
  const monthExpenses = rows.filter((expense) => expenseMonth(expense.occurredAt) === month);
  const monthDate = monthStart(month);
  const monthName = monthDate.toLocaleDateString("pt-BR", { month: "long" });
  const monthTitle = monthDate.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
  const lessonDue = (finance?.lessonPrice ?? null) != null && !hasFee(rows, month, "Aula");
  const clubDue = (finance?.clubPrice ?? null) != null && !hasFee(rows, month, "Clube");
  const queryClient = useQueryClient();
  const fees = useMutation({
    mutationFn: () =>
      launchFees({
        year: monthDate.getFullYear(),
        month: monthDate.getMonth() + 1,
        lessonAmount: lessonDue ? finance?.lessonPrice : null,
        clubAmount: clubDue ? finance?.clubPrice : null,
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: expensesQueryKey });
    },
  });

  const parts = EXPENSE_CATEGORIES.filter((category) => totals[category] > 0);
  const diff = totals.total - previous.total;
  const comparison =
    previous.total === 0
      ? totals.total === 0
        ? "Sem gastos no mês anterior"
        : "Mês anterior sem gastos"
      : diff === 0
        ? "Igual ao mês anterior"
        : `${Math.abs(Math.round((diff / previous.total) * 100))}% ${diff > 0 ? "a mais" : "a menos"} que o mês anterior`;

  return (
    <>
      <PageHeader
        title="Financeiro"
        description="Gastos do mês"
        back
        action={
          <Button size="sm" onClick={() => openSheet()}>
            <Plus />
            Registrar
          </Button>
        }
      />
      <main className="grid gap-4 px-4 pt-4 pb-6">
        <section className="grid gap-3 rounded-2xl border bg-card p-4 shadow-xs">
          <div className="flex items-center justify-between gap-2">
            <Button variant="outline" size="icon-sm" aria-label="Mês anterior" onClick={() => setMonth((value) => shiftMonth(value, -1))}>
              <ChevronLeft />
            </Button>
            <p className="text-sm font-semibold capitalize">{monthTitle}</p>
            <Button
              variant="outline"
              size="icon-sm"
              aria-label="Próximo mês"
              disabled={month >= current}
              onClick={() => setMonth((value) => shiftMonth(value, 1))}
            >
              <ChevronRight />
            </Button>
          </div>
          {isPending ? (
            <Skeleton className="h-16 rounded-xl" />
          ) : (
            <div>
              <p className="text-[0.65rem] font-medium uppercase tracking-wide text-muted-foreground">Total do mês</p>
              <p className="text-3xl font-bold tabular-nums">{formatMoney(totals.total)}</p>
              <p className="text-xs text-muted-foreground">{comparison}</p>
            </div>
          )}
        </section>

        {finance && (lessonDue || clubDue) ? (
          <button
            type="button"
            className="grid gap-1 rounded-2xl border border-primary/30 bg-primary/8 p-4 text-left active:bg-primary/15"
            disabled={fees.isPending}
            onClick={() => fees.mutate()}
          >
            <span className="text-sm font-semibold">Lançar mensalidades de {monthName}</span>
            <span className="text-xs text-muted-foreground">
              {[
                lessonDue ? `Aula ${formatMoney(finance.lessonPrice)}` : null,
                clubDue ? `Clube ${formatMoney(finance.clubPrice)}` : null,
              ]
                .filter(Boolean)
                .join(" · ")}
            </span>
          </button>
        ) : finance && (finance.lessonPrice != null || finance.clubPrice != null) ? (
          <p className="rounded-2xl border bg-card px-4 py-3 text-sm text-muted-foreground">
            Mensalidades de {monthName} lançadas.
          </p>
        ) : null}

        <section className="grid gap-3 rounded-2xl border bg-card p-4 shadow-xs">
          <h2 className="text-sm font-semibold">Por categoria</h2>
          {parts.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum gasto neste mês.</p>
          ) : (
            <ul className="grid gap-2.5">
              {parts.map((category) => {
                const width = totals.total > 0 ? Math.max(6, Math.round((totals[category] / totals.total) * 100)) : 0;
                return (
                  <li key={category} className="grid gap-1">
                    <div className="flex items-center justify-between gap-3 text-sm">
                      <span>{CATEGORY_LABEL[category]}</span>
                      <span className="font-semibold tabular-nums">{formatMoney(totals[category])}</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-muted">
                      <div className="h-full rounded-full bg-primary" style={{ width: `${width}%` }} />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section className="grid gap-3 rounded-2xl border bg-card p-4 shadow-xs">
          <h2 className="text-sm font-semibold">Últimos 6 meses</h2>
          <div className="flex h-28 items-end gap-2">
            {series.map((item) => {
              const height = Math.max(item.total > 0 ? 8 : 0, Math.round((item.total / maxBar) * 100));
              const label = monthStart(item.month).toLocaleDateString("pt-BR", { month: "short" }).replace(".", "");
              return (
                <button
                  key={item.month}
                  type="button"
                  className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1"
                  onClick={() => setMonth(item.month)}
                  aria-label={`${label}: ${formatMoney(item.total)}`}
                >
                  <span className="text-[0.6rem] font-medium tabular-nums text-muted-foreground">
                    {item.total > 0 ? Math.round(item.total) : ""}
                  </span>
                  <span
                    className={cn("w-full rounded-t-md", item.month === month ? "bg-primary" : "bg-primary/35")}
                    style={{ height: `${height}%` }}
                  />
                  <span className="text-[0.65rem] capitalize text-muted-foreground">{label}</span>
                </button>
              );
            })}
          </div>
        </section>

        <section className="grid gap-3">
          <h2 className="text-sm font-semibold">Lançamentos</h2>
          {isError ? (
            <p className="rounded-xl border border-dashed px-3 py-4 text-center text-sm text-destructive">
              Não foi possível carregar os gastos.
            </p>
          ) : isPending ? (
            <Skeleton className="h-24 rounded-xl" />
          ) : monthExpenses.length === 0 ? (
            <div className="grid justify-items-center gap-2 rounded-2xl border border-dashed px-4 py-8 text-center">
              <Wallet className="size-6 text-muted-foreground" />
              <p className="text-sm font-medium">Nada lançado em {monthName}</p>
              <Button size="sm" variant="outline" onClick={() => openSheet()}>
                Registrar gasto
              </Button>
            </div>
          ) : (
            <ExpenseGroups expenses={monthExpenses} />
          )}
        </section>
      </main>
    </>
  );
}

function ExpenseGroups({ expenses }: { expenses: ExpenseRecord[] }) {
  const groups = new Map<string, ExpenseRecord[]>();
  for (const expense of expenses) {
    const key = expense.occurredAt.slice(0, 10);
    groups.set(key, [...(groups.get(key) ?? []), expense]);
  }
  const days = [...groups.keys()].sort((a, b) => b.localeCompare(a));
  return (
    <div className="grid gap-3">
      {days.map((day) => (
        <section key={day} className="overflow-hidden rounded-2xl border bg-card">
          <h3 className="border-b px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {formatShortDate(`${day}T15:00:00.000Z`)}
          </h3>
          <ul className="divide-y">
            {(groups.get(day) ?? []).map((expense) => (
              <ExpenseRow key={expense.id} expense={expense} />
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

function ExpenseRow({ expense }: { expense: ExpenseRecord }) {
  const [editing, setEditing] = useState(false);
  const queryClient = useQueryClient();
  const remove = useMutation({
    mutationFn: () => deleteExpense(expense.id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: expensesQueryKey });
      await queryClient.invalidateQueries({ queryKey: financeQueryKey });
      await queryClient.invalidateQueries({ queryKey: racketsQueryKey });
    },
  });

  return (
    <li className="flex items-start gap-2 px-3 py-2.5">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium break-words">{CATEGORY_LABEL[expense.category] ?? expense.category}</p>
        {expense.note ? <p className="text-xs break-words text-muted-foreground">{expense.note}</p> : null}
      </div>
      <p className="text-sm font-semibold tabular-nums">{formatMoney(expense.amount)}</p>
      <Button variant="ghost" size="icon-sm" aria-label="Editar gasto" onClick={() => setEditing(true)}>
        <Pencil />
      </Button>
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label="Excluir gasto"
        className="text-destructive"
        loading={remove.isPending}
        onClick={() => remove.mutate()}
      >
        <Trash2 />
      </Button>
      {editing ? <ExpenseEditor expense={expense} onClose={() => setEditing(false)} /> : null}
    </li>
  );
}

function ExpenseEditor({ expense, onClose }: { expense: ExpenseRecord; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [amount, setAmount] = useState(moneyToInput(expense.amount));
  const [date, setDate] = useState(toDateInputValue(expense.occurredAt));
  const [note, setNote] = useState(expense.note ?? "");
  const [category, setCategory] = useState<ExpenseCategoryName>(expense.category);
  const [error, setError] = useState<string | null>(null);
  const mutation = useMutation({
    mutationFn: () => {
      const parsed = parseMoney(amount);
      const occurredAt = dateInputToIso(date);
      if (parsed == null || !occurredAt) {
        throw new Error("Informe data e valor.");
      }
      return updateExpense(expense.id, {
        amount: parsed,
        occurredAt,
        category,
        note: note.trim() || null,
        racketId: expense.racketId,
        ballCanId: expense.ballCanId,
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: expensesQueryKey });
      await queryClient.invalidateQueries({ queryKey: financeQueryKey });
      await queryClient.invalidateQueries({ queryKey: racketsQueryKey });
      onClose();
    },
  });

  return (
    <Dialog open title="Editar gasto" onClose={onClose}>
      <form
        className="grid gap-3"
        onSubmit={(event) => {
          event.preventDefault();
          const parsed = parseMoney(amount);
          if (parsed == null || !dateInputToIso(date)) {
            setError("Informe data e valor.");
            return;
          }
          setError(null);
          mutation.mutate();
        }}
      >
        <Field label="Categoria" htmlFor="edit-category">
          <NativeSelect
            id="edit-category"
            value={category}
            onChange={(event) => setCategory(event.target.value as ExpenseCategoryName)}
          >
            {EXPENSE_CATEGORIES.map((item) => (
              <option key={item} value={item}>
                {CATEGORY_LABEL[item]}
              </option>
            ))}
          </NativeSelect>
        </Field>
        <div className="grid grid-cols-2 gap-2">
          <Field label="Data" htmlFor="edit-date">
            <Input id="edit-date" type="date" lang="pt-BR" value={date} onChange={(event) => setDate(event.target.value)} />
          </Field>
          <Field label="Valor" htmlFor="edit-amount" hint="R$">
            <MoneyInput id="edit-amount" value={amount} onChange={setAmount} />
          </Field>
        </div>
        <Field label="Nota" htmlFor="edit-note" hint="opcional">
          <Input id="edit-note" value={note} onChange={(event) => setNote(event.target.value)} />
        </Field>
        {error || mutation.isError ? (
          <p role="alert" className="text-sm font-medium text-destructive">
            {error ?? (mutation.error instanceof Error ? mutation.error.message : "Falha ao salvar.")}
          </p>
        ) : null}
        <Button type="submit" loading={mutation.isPending}>
          Salvar
        </Button>
      </form>
    </Dialog>
  );
}
