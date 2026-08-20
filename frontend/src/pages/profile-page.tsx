import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { LogOut } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { EquipmentSection } from "@/components/equipment-section";
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
  const winRate = summary?.winRate ?? 0;

  async function signOut() {
    clearToken();
    queryClient.setQueryData(meQueryKey, null);
    await queryClient.invalidateQueries({ queryKey: meQueryKey });
    await navigate({ to: "/login", replace: true });
  }

  return (
    <>
      <PageHeader title="Perfil" description="Sua conta e desempenho" back />

      <main className="grid min-w-0 gap-6 overflow-x-hidden px-4 pt-4">
        {isPending ? (
          <section className="grid gap-4 rounded-2xl border bg-card p-5 shadow-xs">
            <div className="flex items-center gap-4">
              <Skeleton className="size-14 rounded-full" />
              <div className="grid flex-1 gap-2">
                <Skeleton className="h-5 w-40" />
                <Skeleton className="h-4 w-48" />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2 border-t pt-4">
              <Skeleton className="h-12" />
              <Skeleton className="h-12" />
              <Skeleton className="h-12" />
            </div>
          </section>
        ) : (
        <section className="grid gap-4 rounded-2xl border bg-card p-5 shadow-xs">
          <div className="flex items-center gap-4">
            <span className="grid size-14 shrink-0 place-items-center rounded-full bg-primary text-lg font-bold text-primary-foreground">
              {toInitials(displayName)}
            </span>
            <div className="min-w-0">
              <p className="truncate text-lg font-semibold">{displayName}</p>
              <p className="truncate text-sm text-muted-foreground">{user?.email}</p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 border-t pt-4">
            <Stat label="Partidas" value={String(summary?.matches ?? 0)} />
            <Stat label="Vitórias" value={String(wins)} />
            <Stat label="Aproveitamento" value={`${winRate}%`} />
          </div>
        </section>
        )}

        <EquipmentSection />

        <ThemeToggle />

        <InstallAppButton />

        <Button variant="outline" size="lg" className="text-destructive" onClick={() => void signOut()}>
          <LogOut />
          Sair da conta
        </Button>
      </main>
    </>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-center">
      <p className="text-xl font-bold tabular-nums">{value}</p>
      <p className="text-[0.7rem] text-muted-foreground">{label}</p>
    </div>
  );
}
