import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { clearToken } from "@/lib/api";
import { meQueryKey, meQueryOptions } from "@/lib/queries";

export function HomePage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: user } = useQuery(meQueryOptions());
  const displayName = user?.name || user?.email;

  async function signOut() {
    clearToken();
    queryClient.setQueryData(meQueryKey, null);
    await queryClient.invalidateQueries({ queryKey: meQueryKey });
    await navigate({ to: "/login", replace: true });
  }

  return (
    <div className="min-h-svh bg-muted/40">
      <header className="border-b bg-background">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-6">
          <p className="font-semibold">ScoreHistory</p>
          <div className="flex items-center gap-3">
            <span className="hidden text-sm text-muted-foreground sm:inline">{user?.email}</span>
            <Button variant="outline" size="sm" onClick={() => void signOut()}>
              Sair
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto grid max-w-5xl gap-6 p-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Olá, {displayName}</h1>
          <p className="mt-1 text-muted-foreground">
            Esta é a tela inicial do sistema. Seus placares e históricos vão aparecer aqui.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Placares</CardTitle>
              <CardDescription>Acompanhe os resultados registrados.</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">Nenhum placar cadastrado ainda.</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Conta</CardTitle>
              <CardDescription>Sessão autenticada com JWT.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-1 text-sm">
              <p>
                <span className="text-muted-foreground">Nome: </span>
                {user?.name || "—"}
              </p>
              <p>
                <span className="text-muted-foreground">Email: </span>
                {user?.email}
              </p>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
