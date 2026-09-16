import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { deleteMatch, type MatchRecord } from "@/lib/api";
import { dashboardQueryKey, matchesQueryKey, opponentsQueryKey } from "@/lib/queries";

type DeleteMatchDialogProps = {
  match: MatchRecord | null;
  open: boolean;
  onClose: () => void;
  onDeleted?: () => void | Promise<void>;
};

export function DeleteMatchDialog({ match, open, onClose, onDeleted }: DeleteMatchDialogProps) {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (id: string) => deleteMatch(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: matchesQueryKey });
      await queryClient.invalidateQueries({ queryKey: opponentsQueryKey });
      await queryClient.invalidateQueries({ queryKey: dashboardQueryKey });
      onClose();
      await onDeleted?.();
    },
  });

  function close() {
    if (!mutation.isPending) {
      mutation.reset();
      onClose();
    }
  }

  return (
    <Dialog
      open={open && Boolean(match)}
      onClose={close}
      title="Excluir partida?"
      description={
        match
          ? `A partida contra ${match.opponentName} (${match.score}) será removida do histórico. Esta ação não pode ser desfeita.`
          : undefined
      }
    >
      {mutation.isError ? (
        <p role="alert" className="mb-3 text-sm font-medium text-destructive">
          {mutation.error instanceof Error
            ? mutation.error.message
            : "Não foi possível excluir a partida."}
        </p>
      ) : null}
      <div className="grid grid-cols-2 gap-2">
        <Button type="button" variant="outline" disabled={mutation.isPending} onClick={close}>
          Cancelar
        </Button>
        <Button
          type="button"
          variant="destructive"
          loading={mutation.isPending}
          onClick={() => {
            if (match) {
              mutation.mutate(match.id);
            }
          }}
        >
          {mutation.isPending ? "Excluindo..." : "Excluir"}
        </Button>
      </div>
    </Dialog>
  );
}
