import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CircleDot, Grip, Hand, Plus, Waves, Wallet } from "lucide-react";
import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { MoneyInput } from "@/components/money-input";
import { NativeSelect } from "@/components/ui/native-select";
import {
  createReplacement,
  type ExpenseCategoryName,
  type ReplacementKind,
} from "@/lib/api";
import { latestServiceAcross } from "@/lib/equipment";
import {
  dateInputToIso,
  formatInputDate,
  moneyToInput,
  parseMoney,
  todayInputValue,
} from "@/lib/format";
import { CATEGORY_LABEL, EXPENSE_CATEGORIES } from "@/lib/ledger";
import { racketHasStrings } from "@/lib/racket-sport";
import { expensesQueryKey, financeQueryKey, financeQueryOptions, racketsQueryKey, racketsQueryOptions } from "@/lib/queries";
import { cn } from "@/lib/utils";

const LAST_RACKET_KEY = "scorehistory:last-racket";

export type SheetRequest = {
  kind?: ReplacementKind;
  racketId?: string;
  ballCanId?: string;
};

type SheetContextValue = {
  openSheet: (request?: SheetRequest) => void;
};

const SheetContext = createContext<SheetContextValue | null>(null);

export function useExpenseSheet() {
  const value = useContext(SheetContext);
  if (!value) {
    throw new Error("useExpenseSheet precisa do ExpenseSheetProvider.");
  }
  return value;
}

const QUICK_KINDS: { kind: ReplacementKind; label: string; icon: typeof Grip }[] = [
  { kind: "Overgrip", label: "Overgrip", icon: Grip },
  { kind: "Bolinhas", label: "Bolinhas", icon: CircleDot },
  { kind: "Corda", label: "Corda", icon: Waves },
  { kind: "Grip", label: "Grip", icon: Hand },
  { kind: "Outro", label: "Outro gasto", icon: Wallet },
];

export function ExpenseSheetProvider({ children }: { children: React.ReactNode }) {
  const [request, setRequest] = useState<SheetRequest | null>(null);

  return (
    <SheetContext.Provider value={{ openSheet: (next) => setRequest(next ?? {}) }}>
      {children}
      <ExpenseSheet request={request} onClose={() => setRequest(null)} />
    </SheetContext.Provider>
  );
}

function ExpenseSheet({ request, onClose }: { request: SheetRequest | null; onClose: () => void }) {
  return (
    <Dialog
      open={request != null}
      title={request?.kind ? "Registrar troca" : "Registrar troca/gasto"}
      description="O valor fica salvo neste lançamento."
      onClose={onClose}
    >
      {request ? <ExpenseSheetBody request={request} onDone={onClose} /> : null}
    </Dialog>
  );
}

function ExpenseSheetBody({ request, onDone }: { request: SheetRequest; onDone: () => void }) {
  const { data: finance } = useQuery(financeQueryOptions());
  const { data: rackets = [] } = useQuery(racketsQueryOptions());
  const queryClient = useQueryClient();
  const [kind, setKind] = useState<ReplacementKind | null>(request.kind ?? null);
  const [date, setDate] = useState(todayInputValue);
  const [note, setNote] = useState("");
  const [category, setCategory] = useState<ExpenseCategoryName>("Outro");
  const [error, setError] = useState<string | null>(null);

  const defaultRacketId = useMemo(() => {
    if (request.racketId && rackets.some((racket) => racket.id === request.racketId)) {
      return request.racketId;
    }
    if (rackets.length === 1) {
      return rackets[0].id;
    }
    const stored = window.localStorage.getItem(LAST_RACKET_KEY);
    if (stored && rackets.some((racket) => racket.id === stored)) {
      return stored;
    }
    return latestServiceAcross(rackets, ["Overgrip", "Corda", "Grip", "Outro"])?.racket.id ?? "";
  }, [rackets, request.racketId]);

  const [racketId, setRacketId] = useState(request.racketId ?? "");
  const [ballId, setBallId] = useState(request.ballCanId ?? "");

  const stringRackets = rackets.filter((item) => racketHasStrings(item.sport));
  const quickKinds = QUICK_KINDS.filter((item) => item.kind !== "Corda" || stringRackets.length > 0);
  const racket = rackets.find((item) => item.id === (racketId || defaultRacketId));
  const ball = finance?.balls.find((item) => item.id === ballId) ?? (finance?.balls.length === 1 ? finance.balls[0] : undefined);
  const activeRacketId = racketId || defaultRacketId;

  const prefill = useMemo(() => {
    if (kind === "Overgrip") return finance?.overgripPrice;
    if (kind === "Corda") return finance?.stringPrice;
    if (kind === "Grip") return finance?.cushionGripPrice;
    if (kind === "Bolinhas") return ball?.canPrice ?? finance?.ballCanPrice;
    return null;
  }, [ball?.canPrice, finance, kind]);

  const [amount, setAmount] = useState("");
  const [tension, setTension] = useState("");
  const seededAmount = useRef(false);
  const seededTension = useRef(false);

  useEffect(() => {
    if (seededAmount.current || prefill == null) {
      return;
    }
    seededAmount.current = true;
    setAmount(moneyToInput(prefill));
  }, [prefill]);

  useEffect(() => {
    if (seededTension.current || kind !== "Corda" || racket?.tensionLb == null) {
      return;
    }
    seededTension.current = true;
    setTension(String(racket.tensionLb));
  }, [kind, racket?.tensionLb]);

  const mutation = useMutation({
    mutationFn: createReplacement,
    onSuccess: async () => {
      if (activeRacketId) {
        window.localStorage.setItem(LAST_RACKET_KEY, activeRacketId);
      }
      await queryClient.invalidateQueries({ queryKey: expensesQueryKey });
      await queryClient.invalidateQueries({ queryKey: financeQueryKey });
      await queryClient.invalidateQueries({ queryKey: racketsQueryKey });
      onDone();
    },
  });

  if (!kind) {
    return (
      <div className="grid grid-cols-2 gap-2">
        {quickKinds.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.kind}
              type="button"
              className="flex min-h-20 flex-col items-start justify-between rounded-2xl border bg-card p-3 text-left active:bg-accent"
              onClick={() => {
                setKind(item.kind);
                const nextAmount =
                  item.kind === "Overgrip"
                    ? finance?.overgripPrice
                    : item.kind === "Corda"
                      ? finance?.stringPrice
                      : item.kind === "Grip"
                        ? finance?.cushionGripPrice
                        : item.kind === "Bolinhas"
                          ? (ball?.canPrice ?? finance?.ballCanPrice)
                          : null;
                seededAmount.current = true;
                setAmount(moneyToInput(nextAmount));
                if (item.kind === "Corda" && racket?.tensionLb != null) {
                  setTension(String(racket.tensionLb));
                }
              }}
            >
              <Icon className="size-5 text-primary" />
              <span className="text-sm font-semibold">{item.label}</span>
            </button>
          );
        })}
      </div>
    );
  }

  const needsRacket = kind === "Overgrip" || kind === "Corda" || kind === "Grip";
  const racketChoices = kind === "Corda" ? stringRackets : rackets;
  const selectedRacketId =
    kind === "Corda" && !stringRackets.some((item) => item.id === activeRacketId)
      ? (stringRackets[0]?.id ?? "")
      : activeRacketId;
  const needsBall = kind === "Bolinhas";

  function save() {
    if (!kind) {
      return;
    }
    const parsed = parseMoney(amount);
    if (parsed == null) {
      setError("Informe o valor.");
      return;
    }
    const occurredAt = dateInputToIso(date);
    if (!occurredAt) {
      setError("Informe a data.");
      return;
    }
    if (kind === "Corda" && !stringRackets.some((item) => item.id === selectedRacketId)) {
      setError("Corda só vale para raquetes de tênis.");
      return;
    }
    if (needsRacket && !selectedRacketId) {
      setError("Cadastre uma raquete para registrar a troca.");
      return;
    }
    if (needsBall && !ball?.id) {
      setError("Cadastre uma bolinha para registrar a lata.");
      return;
    }
    setError(null);
    const tensionValue = kind === "Corda" && tension.trim() ? Number(tension.replace(",", ".")) : null;
    mutation.mutate({
      kind,
      occurredAt,
      amount: parsed,
      racketId: needsRacket ? selectedRacketId : null,
      ballCanId: needsBall ? ball?.id : null,
      tensionLb: tensionValue != null && Number.isFinite(tensionValue) ? tensionValue : null,
      note: note.trim() || null,
      category: kind === "Outro" ? category : null,
    });
  }

  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap gap-1.5">
        {quickKinds.map((item) => (
          <button
            key={item.kind}
            type="button"
            className={cn(
              "rounded-full border px-3 py-1 text-xs font-medium",
              item.kind === kind ? "border-primary bg-primary text-primary-foreground" : "bg-card",
            )}
            onClick={() => {
              setKind(item.kind);
              const next =
                item.kind === "Overgrip"
                  ? finance?.overgripPrice
                  : item.kind === "Corda"
                    ? finance?.stringPrice
                    : item.kind === "Grip"
                      ? finance?.cushionGripPrice
                      : item.kind === "Bolinhas"
                        ? (ball?.canPrice ?? finance?.ballCanPrice)
                        : null;
              seededAmount.current = true;
              setAmount(moneyToInput(next));
            }}
          >
            {item.label}
          </button>
        ))}
      </div>

      {needsRacket ? (
        <Field label="Raquete" htmlFor="sheet-racket">
          <NativeSelect
            id="sheet-racket"
            value={selectedRacketId}
            onChange={(event) => setRacketId(event.target.value)}
          >
            {racketChoices.length === 0 ? <option value="">Nenhuma raquete</option> : null}
            {racketChoices.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </NativeSelect>
        </Field>
      ) : null}

      {needsBall ? (
        <Field label="Bolinha" htmlFor="sheet-ball">
          <NativeSelect id="sheet-ball" value={ball?.id ?? ""} onChange={(event) => setBallId(event.target.value)}>
            {(finance?.balls ?? []).length === 0 ? <option value="">Nenhuma bolinha</option> : null}
            {(finance?.balls ?? []).map((item) => (
              <option key={item.id} value={item.id}>
                {item.name?.trim() || "Bolinha"}
              </option>
            ))}
          </NativeSelect>
        </Field>
      ) : null}

      {kind === "Outro" ? (
        <Field label="Categoria" htmlFor="sheet-category">
          <NativeSelect
            id="sheet-category"
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
      ) : null}

      <div className="grid grid-cols-2 gap-2">
        <Field label="Data" htmlFor="sheet-date" hint={formatInputDate(date) ?? undefined}>
          <Input id="sheet-date" type="date" lang="pt-BR" max={todayInputValue()} value={date} onChange={(event) => setDate(event.target.value)} />
        </Field>
        <Field label="Valor" htmlFor="sheet-amount" hint="R$">
          <MoneyInput id="sheet-amount" value={amount} onChange={setAmount} />
        </Field>
      </div>

      {kind === "Corda" ? (
        <Field label="Tensão" htmlFor="sheet-tension" hint="lb">
          <Input
            id="sheet-tension"
            inputMode="decimal"
            value={tension}
            placeholder="Ex.: 52"
            onChange={(event) => setTension(event.target.value)}
          />
        </Field>
      ) : null}

      <Field label="Nota" htmlFor="sheet-note" hint="opcional">
        <Input id="sheet-note" value={note} placeholder="Modelo ou observação" onChange={(event) => setNote(event.target.value)} />
      </Field>

      {error || mutation.isError ? (
        <p role="alert" className="text-sm font-medium text-destructive">
          {error ?? (mutation.error instanceof Error ? mutation.error.message : "Falha ao registrar.")}
        </p>
      ) : null}

      <Button type="button" size="lg" loading={mutation.isPending} onClick={save}>
        <Plus />
        {mutation.isPending ? "Salvando..." : "Registrar"}
      </Button>
    </div>
  );
}
