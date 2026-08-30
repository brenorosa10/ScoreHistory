import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useParams } from "@tanstack/react-router";
import { Trash2 } from "lucide-react";
import { useState } from "react";
import { DeleteMatchDialog } from "@/components/delete-match-dialog";
import { MatchForm, type MatchFormValues } from "@/components/match-form";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
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
  const [deleteOpen, setDeleteOpen] = useState(false);

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
        extra={
          <Button
            type="button"
            variant="destructive"
            size="lg"
            disabled={mutation.isPending}
            onClick={() => setDeleteOpen(true)}
          >
            <Trash2 />
            Excluir partida
          </Button>
        }
      />
      <DeleteMatchDialog
        match={match}
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onDeleted={() => navigate({ to: "/historico", replace: true })}
      />
    </>
  );
}

function toFormValues(match: MatchRecord): MatchFormValues {
  return {
    opponentId: match.opponentId,
    sets: parseScore(match.score),
    won: match.won === true ? "true" : match.won === false ? "false" : "draw",
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
