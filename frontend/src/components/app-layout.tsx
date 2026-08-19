import { Link, Outlet, useRouterState } from "@tanstack/react-router";
import { History, Home, Plus, Swords, UserRound } from "lucide-react";
import { cn } from "@/lib/utils";

export function AppLayout() {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const onNewMatch = pathname.startsWith("/partidas/nova");

  return (
    <div className="mx-auto min-h-svh w-full max-w-md bg-background shadow-sm sm:my-6 sm:min-h-[calc(100svh-3rem)] sm:rounded-3xl sm:border">
      <div className="pb-28">
        <Outlet />
      </div>

      <nav
        aria-label="Navegação principal"
        className="fixed inset-x-0 bottom-0 z-40 mx-auto max-w-md border-t bg-background/90 backdrop-blur-md sm:rounded-b-3xl sm:border-x"
      >
        <div className="relative grid h-16 grid-cols-5 items-center px-1 pb-[env(safe-area-inset-bottom)]">
          <NavTab to="/" label="Início" icon={Home} active={pathname === "/"} />
          <NavTab
            to="/adversarios"
            label="Adversários"
            icon={Swords}
            active={pathname.startsWith("/adversarios")}
          />

          <div className="flex justify-center">
            <Link
              to="/partidas/nova"
              aria-label="Registrar partida"
              aria-current={onNewMatch ? "page" : undefined}
              className={cn(
                "flex size-15 -translate-y-6 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-md transition-transform active:scale-95",
                onNewMatch && "ring-4 ring-primary/25",
              )}
            >
              <Plus className="size-7" strokeWidth={2.5} />
            </Link>
          </div>

          <NavTab
            to="/historico"
            label="Histórico"
            icon={History}
            active={
              pathname.startsWith("/historico") ||
              (pathname.startsWith("/partidas/") && !onNewMatch)
            }
          />
          <NavTab
            to="/perfil"
            label="Perfil"
            icon={UserRound}
            active={pathname.startsWith("/perfil")}
          />
        </div>
      </nav>
    </div>
  );
}

function NavTab({
  to,
  label,
  icon: Icon,
  active,
}: {
  to: "/" | "/perfil" | "/historico" | "/adversarios";
  label: string;
  icon: typeof UserRound;
  active: boolean;
}) {
  return (
    <Link
      to={to}
      aria-current={active ? "page" : undefined}
      className={cn(
        "mx-auto flex h-full w-full flex-col items-center justify-center gap-1 rounded-xl text-[0.65rem] font-medium transition-colors",
        active ? "text-primary" : "text-muted-foreground",
      )}
    >
      <span
        className={cn(
          "flex h-7 w-10 items-center justify-center rounded-full transition-colors",
          active && "bg-primary/12",
        )}
      >
        <Icon className="size-5" />
      </span>
      {label}
    </Link>
  );
}
