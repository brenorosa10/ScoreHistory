import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useParams } from "@tanstack/react-router";
import { MatchForm, type MatchFormValues } from "@/components/match-form";
import { PageHeader } from "@/components/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { updateMatch, type MatchPayload, type MatchRecord } from "@/lib/api";
import { COURT_TYPE_OPTIONS } from "@/lib/constants";
import { matchQueryOptions, matchesQueryKey, dashboardQueryKey } from "@/lib/queries";
import { parseScore } from "@/lib/score";

export function EditMatchPage() {
  const { matchId } = useParams({ from: "/app/partidas/$matchId/editar" });
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: match, isPending, isError } = useQuery(matchQueryOptions(matchId));

  const mutation = useMutation({
    mutationFn: (payload: MatchPayload) => updateMatch(matchId, payload),
    onSuccess: async (updated) => {
      queryClient.setQueryData([...matchesQueryKey, matchId], updated);
      await queryClient.invalidateQueries({ queryKey: matchesQueryKey });
      await queryClient.invalidateQueries({ queryKey: dashboardQueryKey });
      await navigate({
        to: "/partidas/$matchId",
        params: { matchId },
        replace: true,
      });
    },
  });

  if (isPending) {
    return (
      <>
        <PageHeader title="Editar partida" back />
        <div className="grid gap-4 px-4 pt-4">
          <Skeleton className="h-80 rounded-2xl" />
          <Skeleton className="h-40 rounded-2xl" />
        </div>
      </>
    );
  }

  if (isError || !match) {
    return (
      <>
        <PageHeader title="Editar partida" back />
        <p className="px-4 pt-6 text-center text-sm text-destructive">
          Não foi possível carregar a partida.
        </p>
      </>
    );
  }

  return (
    <>
      <PageHeader title="Editar partida" description={`Contra ${match.opponentName}`} back />
      <MatchForm
        defaultValues={toFormValues(match)}
        submitLabel="Salvar alterações"
        pending={mutation.isPending}
        error={mutation.error}
        onSubmit={(payload) => mutation.mutate(payload)}
      />
    </>
  );
}

function toFormValues(match: MatchRecord): MatchFormValues {
  return {
    opponentId: match.opponentId,
    sets: parseScore(match.score),
    won: match.won ? "true" : "false",
    courtType: COURT_TYPE_OPTIONS.includes(
      match.courtType as (typeof COURT_TYPE_OPTIONS)[number],
    )
      ? match.courtType
      : "Saibro",
    playedAt: new Date(match.playedAt).toISOString().slice(0, 10),
    notes: match.notes ?? "",
    strengths: match.strengths ?? "",
    weaknesses: match.weaknesses ?? "",
    opponentStrengths: match.opponentStrengths ?? "",
    opponentWeaknesses: match.opponentWeaknesses ?? "",
  };
}
