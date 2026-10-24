import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { LogOut } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { EquipmentSection } from "@/components/equipment-section";
import { FinanceSection } from "@/components/finance-section";
import { ThemeToggle } from "@/components/theme-toggle";
import { InstallAppButton } from "@/components/install-app-button";
import { SportMultiSelect } from "@/components/sport-multi-select";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { clearToken, updateMySports } from "@/lib/api";
import { sportsOrTennis, type PlayerSport } from "@/lib/player-sports";
import { toInitials } from "@/lib/format";
import { drawCount, WIN_RATE_HINT, winRatePercent } from "@/lib/record";
import {
  dashboardSummaryQueryOptions,
  meQueryKey,
  meQueryOptions,
} from "@/lib/queries";

export function ProfilePage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: user, isPending: userPending } = useQuery(meQueryOptions());
  const [sports, setSports] = useState<PlayerSport[] | null>(null);
  const selectedSports = sports ?? sportsOrTennis(user?.sports);
  const sportsMutation = useMutation({
    mutationFn: () => updateMySports(selectedSports),
    onSuccess: async (updated) => {
      queryClient.setQueryData(meQueryKey, {
        id: updated.id,
        email: updated.email,
        name: updated.name ?? user?.name ?? null,
        sports: updated.sports ?? selectedSports,
        sportsConfirmed: true,
      });
      setSports(null);
      await queryClient.invalidateQueries({ queryKey: meQueryKey });
    },
  });
  const { data: summary, isPending: summaryPending } = useQuery(dashboardSummaryQueryOptions());
  const isPending = userPending || summaryPending;

  const displayName = user?.name || user?.email || "Jogador";
  const wins = summary?.wins ?? 0;
  const losses = summary?.losses ?? 0;
  const draws = drawCount(summary?.matches ?? 0, wins, losses, summary?.draws);
  const winRate = winRatePercent(wins, losses);

  async function signOut() {
    clearToken();
    queryClient.setQueryData(meQueryKey, null);
    await queryClient.invalidateQueries({ queryKey: meQueryKey });
    await navigate({ to: "/login", replace: true });
  }

  return (
    <>
      <PageHeader title="Perfil" description="Sua conta, equipamento e custos" />

      <main className="grid min-w-0 gap-5 overflow-x-hidden px-4 pt-4 pb-6">
        {isPending ? (
          <section className="grid gap-4 rounded-2xl border bg-card p-5 shadow-xs">
            <div className="flex items-center gap-4">
              <Skeleton className="size-16 rounded-2xl" />
              <div className="grid flex-1 gap-2">
                <Skeleton className="h-5 w-40" />
                <Skeleton className="h-4 w-48" />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <Skeleton className="h-16 rounded-xl" />
              <Skeleton className="h-16 rounded-xl" />
              <Skeleton className="h-16 rounded-xl" />
            </div>
          </section>
        ) : (
          <section className="relative overflow-hidden rounded-2xl border bg-card shadow-xs">
            <div className="h-20 bg-gradient-to-br from-primary via-primary/85 to-brand/70" />
            <div className="-mt-9 grid gap-4 px-4 pb-4">
              <div className="flex items-end gap-3">
                <span className="grid size-18 shrink-0 place-items-center rounded-2xl border-4 border-card bg-primary text-xl font-bold text-primary-foreground shadow-sm">
                  {toInitials(displayName)}
                </span>
                <div className="min-w-0 flex-1 pb-1">
                  <p className="truncate text-lg font-semibold leading-tight">{displayName}</p>
                  <p className="truncate text-xs text-muted-foreground">{user?.email}</p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <Stat label="Partidas" value={String(summary?.matches ?? 0)} />
                <Stat
                  label="Vitórias"
                  value={String(wins)}
                  sub={
                    draws > 0
                      ? `${draws} ${draws === 1 ? "empate" : "empates"} · ${losses} ${losses === 1 ? "derrota" : "derrotas"}`
                      : `${losses} ${losses === 1 ? "derrota" : "derrotas"}`
                  }
                />
                <Stat label="Aproveitamento" value={`${winRate}%`} sub={WIN_RATE_HINT} />
              </div>
            </div>
          </section>
        )}

        <section className="grid gap-3 rounded-2xl border bg-card p-4 shadow-xs">
          <div>
            <h2 className="text-sm font-semibold">Esportes que eu jogo</h2>
            <p className="text-xs text-muted-foreground">Escolha pelo menos um. Partidas e adversários usam essa lista.</p>
          </div>
          <SportMultiSelect
            value={selectedSports}
            onChange={(next) => {
              setSports(next);
            }}
          />
          {sportsMutation.isError ? (
            <p role="alert" className="text-sm font-medium text-destructive">
              {sportsMutation.error instanceof Error ? sportsMutation.error.message : "Não foi possível salvar."}
            </p>
          ) : null}
          <Button
            type="button"
            disabled={selectedSports.length === 0 || sportsMutation.isPending}
            onClick={() => {
              if (selectedSports.length === 0) {
                return;
              }
              sportsMutation.mutate();
            }}
          >
            {sportsMutation.isPending ? "Salvando..." : "Salvar esportes"}
          </Button>
        </section>

        <EquipmentSection />

        <FinanceSection />

        <ThemeToggle />

        <div className="grid gap-2">
          <InstallAppButton />
          <Button variant="outline" size="lg" className="text-destructive" onClick={() => void signOut()}>
            <LogOut />
            Sair da conta
          </Button>
        </div>
      </main>
    </>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="grid gap-0.5 rounded-xl bg-muted/60 px-2 py-2.5 text-center">
      <p className="text-xl font-bold tabular-nums leading-none">{value}</p>
      <p className="text-[0.65rem] text-muted-foreground">{label}</p>
      {sub ? <p className="text-[0.6rem] text-balance text-muted-foreground/80">{sub}</p> : null}
    </div>
  );
}
