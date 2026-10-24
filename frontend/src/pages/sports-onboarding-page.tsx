import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { SportMultiSelect } from "@/components/sport-multi-select";
import { Button } from "@/components/ui/button";
import { updateMySports } from "@/lib/api";
import { sportsOrTennis, type PlayerSport } from "@/lib/player-sports";
import { meQueryKey, meQueryOptions } from "@/lib/queries";

export function SportsOnboardingPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: user } = useQuery(meQueryOptions());
  const [sports, setSports] = useState<PlayerSport[]>(() => sportsOrTennis(user?.sports));
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: () => updateMySports(sports),
    onSuccess: async (updated) => {
      queryClient.setQueryData(meQueryKey, {
        id: updated.id,
        email: updated.email,
        name: updated.name,
        sports: updated.sports ?? sports,
        sportsConfirmed: true,
      });
      await queryClient.invalidateQueries({ queryKey: meQueryKey });
      await navigate({ to: "/", replace: true });
    },
  });

  return (
    <main className="mx-auto grid min-h-svh max-w-lg content-center gap-6 px-5 py-10">
      <div className="grid gap-2">
        <p className="text-sm font-medium text-primary">Bem-vindo ao ScoreHistory</p>
        <h1 className="text-2xl font-bold tracking-tight">Quais esportes você joga?</h1>
        <p className="text-sm text-muted-foreground">
          Escolha um ou mais. Partidas, adversários e estatísticas passam a respeitar essa escolha. Você pode mudar depois no perfil.
        </p>
      </div>
      <SportMultiSelect
        value={sports}
        invalid={Boolean(error)}
        onChange={(next) => {
          setSports(next);
          setError(null);
        }}
      />
      {error ? (
        <p role="alert" className="text-sm font-medium text-destructive">
          {error}
        </p>
      ) : null}
      {mutation.isError ? (
        <p role="alert" className="text-sm font-medium text-destructive">
          {mutation.error instanceof Error ? mutation.error.message : "Não foi possível salvar."}
        </p>
      ) : null}
      <Button
        size="lg"
        loading={mutation.isPending}
        onClick={() => {
          if (sports.length === 0) {
            setError("Escolha pelo menos um esporte.");
            return;
          }
          mutation.mutate();
        }}
      >
        Continuar
      </Button>
    </main>
  );
}
