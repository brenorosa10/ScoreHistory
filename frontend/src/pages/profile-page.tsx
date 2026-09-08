import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { LogOut } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { EquipmentSection } from "@/components/equipment-section";
import { FinanceSection } from "@/components/finance-section";
import { ThemeToggle } from "@/components/theme-toggle";
import { InstallAppButton } from "@/components/install-app-button";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { clearToken } from "@/lib/api";
import { toInitials } from "@/lib/format";
import {
  dashboardSummaryQueryOptions,
  meQueryKey,
  meQueryOptions,
} from "@/lib/queries";

export function ProfilePage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: user, isPending: userPending } = useQuery(meQueryOptions());
  const { data: summary, isPending: summaryPending } = useQuery(dashboardSummaryQueryOptions());
  const isPending = userPending || summaryPending;

  const displayName = user?.name || user?.email || "Jogador";
  const wins = summary?.wins ?? 0;
  const losses = summary?.losses ?? 0;
  const winRate = summary?.winRate ?? 0;

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
                <Stat label="Vitórias" value={String(wins)} sub={`${losses} derrota${losses === 1 ? "" : "s"}`} />
                <Stat label="Aproveitamento" value={`${winRate}%`} />
              </div>
            </div>
          </section>
        )}

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
      {sub ? <p className="text-[0.6rem] text-muted-foreground/80">{sub}</p> : null}
    </div>
  );
}
