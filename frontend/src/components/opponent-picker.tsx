import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, ChevronDown, Search, UserPlus } from "lucide-react";
import { useState } from "react";
import { OpponentForm } from "@/components/opponent-form";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { createOpponent, type OpponentPayload } from "@/lib/api";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { toInitials } from "@/lib/format";
import {
  dashboardQueryKey,
  opponentQueryOptions,
  opponentsQueryKey,
  opponentsQueryOptions,
} from "@/lib/queries";
import { cn } from "@/lib/utils";

type OpponentPickerProps = {
  value: string;
  onChange: (opponentId: string) => void;
  invalid?: boolean;
};

export function OpponentPicker({ value, onChange, invalid }: OpponentPickerProps) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search);
  const { data, isPending, isFetching } = useQuery(
    opponentsQueryOptions({
      page: 1,
      pageSize: 50,
      search: debouncedSearch,
    }),
  );
  const { data: selectedOpponent } = useQuery({
    ...opponentQueryOptions(value),
    enabled: Boolean(value),
  });

  const opponents = data?.items ?? [];
  const selected =
    opponents.find((opponent) => opponent.id === value) ??
    (selectedOpponent?.id === value ? selectedOpponent : undefined);
  const results = opponents;

  const mutation = useMutation({
    mutationFn: (payload: OpponentPayload) => createOpponent(payload),
    onSuccess: async (opponent) => {
      await queryClient.invalidateQueries({ queryKey: opponentsQueryKey });
      await queryClient.invalidateQueries({ queryKey: dashboardQueryKey });
      onChange(opponent.id);
      closeDialog();
    },
  });

  function closeDialog() {
    setOpen(false);
    setCreating(false);
    setSearch("");
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-invalid={invalid ? true : undefined}
        className={cn(
          "flex w-full items-center gap-3 rounded-xl border border-input bg-background p-2.5 text-left shadow-xs transition-colors outline-none",
          "focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 active:bg-accent",
          "aria-invalid:border-destructive aria-invalid:ring-[3px] aria-invalid:ring-destructive/20",
        )}
      >
        {selected ? (
          <>
            <span className="grid size-9 shrink-0 place-items-center rounded-full bg-accent text-xs font-semibold text-accent-foreground">
              {toInitials(selected.name)}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium">{selected.name}</span>
              <span className="block text-xs text-muted-foreground">{selected.handedness}</span>
            </span>
          </>
        ) : (
          <>
            <span className="grid size-9 shrink-0 place-items-center rounded-full bg-muted text-muted-foreground">
              <UserPlus className="size-4" />
            </span>
            <span className="flex-1 text-sm text-muted-foreground">Selecionar adversário</span>
          </>
        )}
        <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
      </button>

      <Dialog
        open={open}
        onClose={closeDialog}
        title={creating ? "Novo adversário" : "Escolher adversário"}
        description={
          creating ? "Ele fica salvo para as próximas partidas." : "Selecione ou cadastre um novo."
        }
      >
        {creating ? (
          <>
            <OpponentForm
              submitLabel="Salvar e selecionar"
              pending={mutation.isPending}
              onSubmit={(payload) => mutation.mutate(payload)}
            />
            {mutation.isError ? (
              <p role="alert" className="mt-3 text-sm font-medium text-destructive">
                {mutation.error instanceof Error ? mutation.error.message : "Falha ao salvar."}
              </p>
            ) : null}
            <Button type="button" variant="ghost" className="mt-2 w-full" onClick={() => setCreating(false)}>
              Voltar para a lista
            </Button>
          </>
        ) : (
          <div className="grid gap-3">
            <div className="relative">
              <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pr-9 pl-9"
                placeholder="Buscar adversário"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
              {isFetching ? (
                <Spinner className="absolute top-1/2 right-3 -translate-y-1/2 text-muted-foreground" />
              ) : null}
            </div>

            <div className="grid max-h-72 gap-1 overflow-y-auto">
              {isPending && !data ? (
                <>
                  <Skeleton className="h-14 rounded-xl" />
                  <Skeleton className="h-14 rounded-xl" />
                  <Skeleton className="h-14 rounded-xl" />
                </>
              ) : results.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">
                  {search.trim()
                    ? "Nenhum adversário encontrado."
                    : "Você ainda não cadastrou adversários."}
                </p>
              ) : (
                results.map((opponent) => (
                  <button
                    key={opponent.id}
                    type="button"
                    onClick={() => {
                      onChange(opponent.id);
                      closeDialog();
                    }}
                    className="flex items-center gap-3 rounded-xl p-2.5 text-left transition-colors hover:bg-accent active:bg-accent"
                  >
                    <span className="grid size-9 shrink-0 place-items-center rounded-full bg-accent text-xs font-semibold text-accent-foreground">
                      {toInitials(opponent.name)}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">{opponent.name}</span>
                      <span className="block text-xs text-muted-foreground">{opponent.handedness}</span>
                    </span>
                    {opponent.id === value ? <Check className="size-4 text-primary" /> : null}
                  </button>
                ))
              )}
            </div>

            <Button type="button" variant="outline" className="h-11 w-full" onClick={() => setCreating(true)}>
              <UserPlus />
              Cadastrar novo adversário
            </Button>
          </div>
        )}
      </Dialog>
    </>
  );
}
