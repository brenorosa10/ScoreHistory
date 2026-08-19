import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { OpponentForm } from "@/components/opponent-form";
import { PageHeader } from "@/components/page-header";
import { createOpponent, type OpponentPayload } from "@/lib/api";
import { opponentsQueryKey } from "@/lib/queries";

export function NewOpponentPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: (payload: OpponentPayload) => createOpponent(payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: opponentsQueryKey });
      await navigate({ to: "/adversarios" });
    },
  });

  return (
    <>
      <PageHeader title="Novo adversário" description="Monte o perfil de quem você enfrenta" back />

      <main className="px-4 pt-4">
        <div className="rounded-2xl border bg-card p-4 shadow-xs">
          <OpponentForm
            submitLabel="Salvar adversário"
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
