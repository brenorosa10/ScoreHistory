import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { getStoredToken } from "@/lib/api";

export function NotFoundPage() {
  const signedIn = Boolean(getStoredToken());

  return (
    <main className="mx-auto flex min-h-svh w-full max-w-md flex-col justify-center bg-background px-6 sm:my-6 sm:min-h-[calc(100svh-3rem)] sm:rounded-3xl sm:border sm:shadow-sm">
      <div className="grid justify-items-center gap-3 text-center">
        <p className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">404</p>
        <h1 className="text-2xl font-bold tracking-tight">Página não encontrada</h1>
        <p className="max-w-sm text-sm text-balance text-muted-foreground">
          Esse endereço não existe. Volte para continuar de onde parou.
        </p>
        <Button asChild className="mt-2">
          <Link to={signedIn ? "/" : "/login"}>{signedIn ? "Ir para o início" : "Ir para o login"}</Link>
        </Button>
      </div>
    </main>
  );
}
