import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { PageHeader } from "@/components/page-header";
import { RacketForm } from "@/components/racket-form";
import { createRacket, type RacketPayload } from "@/lib/api";
import { racketsQueryKey } from "@/lib/queries";

export function NewRacketPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: (payload: RacketPayload) => createRacket(payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: racketsQueryKey });
      await navigate({ to: "/perfil" });
    },
  });

  return (
    <>
      <PageHeader title="Nova raquete" description="Cadastre o setup e o histórico de trocas" back />
      <main className="px-4 pt-4 pb-6">
        <RacketForm
          submitLabel="Salvar raquete"
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
