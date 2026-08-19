import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { MatchForm } from "@/components/match-form";
import { PageHeader } from "@/components/page-header";
import { createMatch, type MatchPayload } from "@/lib/api";
import { matchesQueryKey } from "@/lib/queries";

export function NewMatchPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (payload: MatchPayload) => createMatch(payload),
    onSuccess: async (match) => {
      await queryClient.invalidateQueries({ queryKey: matchesQueryKey });
      await navigate({ to: "/partidas/$matchId", params: { matchId: match.id } });
    },
  });

  return (
    <>
      <PageHeader title="Nova partida" description="Registre o placar e o que rolou em quadra" back />
      <MatchForm
        submitLabel="Salvar partida"
        pending={mutation.isPending}
        error={mutation.error}
        onSubmit={(payload) => mutation.mutate(payload)}
      />
    </>
  );
}
