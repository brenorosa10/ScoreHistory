import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useParams } from "@tanstack/react-router";
import { OpponentForm, type OpponentFormValues } from "@/components/opponent-form";
import { PageHeader } from "@/components/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { updateOpponent, type Opponent, type OpponentPayload } from "@/lib/api";
import { dashboardQueryKey, matchesQueryKey, opponentQueryOptions, opponentsQueryKey } from "@/lib/queries";

export function EditOpponentPage() {
  const { opponentId } = useParams({ from: "/app/adversarios/$opponentId/editar" });
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: opponent, isPending, isError } = useQuery(opponentQueryOptions(opponentId));

  const mutation = useMutation({
    mutationFn: (payload: OpponentPayload) => updateOpponent(opponentId, payload),
    onSuccess: async (updated) => {
      queryClient.setQueryData([...opponentsQueryKey, opponentId], updated);
      await queryClient.invalidateQueries({ queryKey: opponentsQueryKey });
      await queryClient.invalidateQueries({ queryKey: matchesQueryKey });
      await queryClient.invalidateQueries({ queryKey: dashboardQueryKey });
      await navigate({ to: "/adversarios", replace: true });
    },
  });

  if (isPending) {
    return (
      <>
        <PageHeader title="Editar adversário" back />
        <div className="px-4 pt-4">
          <Skeleton className="h-80 rounded-2xl" />
        </div>
      </>
    );
  }

  if (isError || !opponent) {
    return (
      <>
        <PageHeader title="Editar adversário" back />
        <p className="px-4 pt-6 text-center text-sm text-destructive">
          Não foi possível carregar o adversário.
        </p>
      </>
    );
  }

  return (
    <>
      <PageHeader title="Editar adversário" description={opponent.name} back />
      <main className="px-4 pt-4">
        <div className="rounded-2xl border bg-card p-4 shadow-xs">
          <OpponentForm
            defaultValues={toFormValues(opponent)}
            submitLabel="Salvar alterações"
            pending={mutation.isPending}
            onSubmit={(payload) => mutation.mutate(payload)}
          />
          {mutation.isError ? (
            <p role="alert" className="mt-3 text-sm font-medium text-destructive">
              {mutation.error instanceof Error ? mutation.error.message : "Falha ao salvar."}
            </p>
          ) : null}
        </div>
      </main>
    </>
  );
}

function toFormValues(opponent: Opponent): OpponentFormValues {
  return {
    name: opponent.name,
    handedness: opponent.handedness,
    strengths: opponent.strengths ?? "",
    weaknesses: opponent.weaknesses ?? "",
    notes: opponent.notes ?? "",
  };
}
