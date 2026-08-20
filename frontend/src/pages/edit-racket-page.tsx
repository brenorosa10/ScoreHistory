import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useParams } from "@tanstack/react-router";
import { PageHeader } from "@/components/page-header";
import { RacketForm, type RacketFormValues } from "@/components/racket-form";
import { DEFAULT_FRAME_COLOR, DEFAULT_GRIP_COLOR, DEFAULT_STRING_COLOR } from "@/components/racket-preview";
import { Skeleton } from "@/components/ui/skeleton";
import { updateRacket, type RacketPayload, type RacketRecord } from "@/lib/api";
import { racketQueryOptions, racketsQueryKey } from "@/lib/queries";

export function EditRacketPage() {
  const { racketId } = useParams({ from: "/app/perfil/raquetes/$racketId/editar" });
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: racket, isPending, isError } = useQuery(racketQueryOptions(racketId));

  const mutation = useMutation({
    mutationFn: (payload: RacketPayload) => updateRacket(racketId, payload),
    onSuccess: async (updated) => {
      queryClient.setQueryData([...racketsQueryKey, racketId], updated);
      await queryClient.invalidateQueries({ queryKey: racketsQueryKey });
      await navigate({ to: "/perfil", replace: true });
    },
  });

  if (isPending) {
    return (
      <>
        <PageHeader title="Editar raquete" back />
        <div className="grid gap-4 px-4 pt-4">
          <Skeleton className="h-72 rounded-2xl" />
          <Skeleton className="h-56 rounded-2xl" />
        </div>
      </>
    );
  }

  if (isError || !racket) {
    return (
      <>
        <PageHeader title="Editar raquete" back />
        <p className="px-4 pt-6 text-center text-sm text-destructive">Não foi possível carregar a raquete.</p>
      </>
    );
  }

  return (
    <>
      <PageHeader title="Editar raquete" description={racket.name} back />
      <main className="px-4 pt-4 pb-6">
        <RacketForm
          defaultValues={toFormValues(racket)}
          defaultServices={racket.services}
          submitLabel="Salvar alterações"
          pending={mutation.isPending}
          onSubmit={(payload) => mutation.mutate(payload)}
        />
        {mutation.isError ? (
          <p role="alert" className="mt-3 text-sm font-medium text-destructive">
            {mutation.error instanceof Error ? mutation.error.message : "Falha ao salvar."}
          </p>
        ) : null}
      </main>
    </>
  );
}

function toFormValues(racket: RacketRecord): RacketFormValues {
  return {
    name: racket.name,
    stringName: racket.stringName ?? "",
    tensionLb: racket.tensionLb != null ? String(racket.tensionLb) : "",
    grip: racket.grip ?? "",
    notes: racket.notes ?? "",
    frameColor: racket.frameColor || DEFAULT_FRAME_COLOR,
    stringColor: racket.stringColor || DEFAULT_STRING_COLOR,
    gripColor: racket.gripColor || DEFAULT_GRIP_COLOR,
  };
}
