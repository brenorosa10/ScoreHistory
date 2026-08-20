import { QueryClient } from "@tanstack/react-query";
import {
  Outlet,
  createRootRouteWithContext,
  createRoute,
  createRouter,
  redirect,
} from "@tanstack/react-router";
import { AppLayout } from "@/components/app-layout";
import { getStoredToken } from "@/lib/api";
import { meQueryOptions } from "@/lib/queries";
import { EditMatchPage } from "@/pages/edit-match-page";
import { EditOpponentPage } from "@/pages/edit-opponent-page";
import { HomePage } from "@/pages/home-page";
import { HistoryPage } from "@/pages/history-page";
import { LoginPage } from "@/pages/login-page";
import { MatchDetailPage } from "@/pages/match-detail-page";
import { NewMatchPage } from "@/pages/new-match-page";
import { NewOpponentPage } from "@/pages/new-opponent-page";
import { OpponentsPage } from "@/pages/opponents-page";
import { ProfilePage } from "@/pages/profile-page";
import { RegisterPage } from "@/pages/register-page";
import { NewRacketPage } from "@/pages/new-racket-page";
import { EditRacketPage } from "@/pages/edit-racket-page";

export interface RouterContext {
  queryClient: QueryClient;
}

async function ensureSession(queryClient: QueryClient) {
  const token = getStoredToken();
  if (!token) {
    return null;
  }

  try {
    return await queryClient.ensureQueryData(meQueryOptions());
  } catch {
    return null;
  }
}

const rootRoute = createRootRouteWithContext<RouterContext>()({
  component: () => <Outlet />,
});

const appRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: "app",
  beforeLoad: async ({ context }) => {
    const user = await ensureSession(context.queryClient);
    if (!user) {
      throw redirect({ to: "/login" });
    }
  },
  component: AppLayout,
});

const indexRoute = createRoute({
  getParentRoute: () => appRoute,
  path: "/",
  component: HomePage,
});

const historyRoute = createRoute({
  getParentRoute: () => appRoute,
  path: "/historico",
  validateSearch: (search: Record<string, unknown>): { page?: number; filtro?: "wins" | "losses" } => {
    const page = Number(search.page);
    const next: { page?: number; filtro?: "wins" | "losses" } = {};
    if (Number.isFinite(page) && page > 0) {
      next.page = Math.floor(page);
    }
    if (search.filtro === "wins" || search.filtro === "losses") {
      next.filtro = search.filtro;
    }
    return next;
  },
  component: HistoryPage,
});

const profileRoute = createRoute({
  getParentRoute: () => appRoute,
  path: "/perfil",
  component: ProfilePage,
});

const newRacketRoute = createRoute({
  getParentRoute: () => appRoute,
  path: "/perfil/raquetes/novo",
  component: NewRacketPage,
});

const editRacketRoute = createRoute({
  getParentRoute: () => appRoute,
  path: "/perfil/raquetes/$racketId/editar",
  component: EditRacketPage,
});

const opponentsRoute = createRoute({
  getParentRoute: () => appRoute,
  path: "/adversarios",
  validateSearch: (search: Record<string, unknown>): { page?: number; q?: string } => {
    const page = Number(search.page);
    const next: { page?: number; q?: string } = {};
    if (Number.isFinite(page) && page > 0) {
      next.page = Math.floor(page);
    }
    if (typeof search.q === "string" && search.q) {
      next.q = search.q;
    }
    return next;
  },
  component: OpponentsPage,
});

const newOpponentRoute = createRoute({
  getParentRoute: () => appRoute,
  path: "/adversarios/novo",
  component: NewOpponentPage,
});

const editOpponentRoute = createRoute({
  getParentRoute: () => appRoute,
  path: "/adversarios/$opponentId/editar",
  component: EditOpponentPage,
});

const newMatchRoute = createRoute({
  getParentRoute: () => appRoute,
  path: "/partidas/nova",
  component: NewMatchPage,
});

const matchDetailRoute = createRoute({
  getParentRoute: () => appRoute,
  path: "/partidas/$matchId",
  component: MatchDetailPage,
});

const editMatchRoute = createRoute({
  getParentRoute: () => appRoute,
  path: "/partidas/$matchId/editar",
  component: EditMatchPage,
});

const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/login",
  beforeLoad: async ({ context }) => {
    const user = await ensureSession(context.queryClient);
    if (user) {
      throw redirect({ to: "/" });
    }
  },
  component: LoginPage,
});

const registerRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/cadastro",
  beforeLoad: async ({ context }) => {
    const user = await ensureSession(context.queryClient);
    if (user) {
      throw redirect({ to: "/" });
    }
  },
  component: RegisterPage,
});

const routeTree = rootRoute.addChildren([
  appRoute.addChildren([
    indexRoute,
    historyRoute,
    profileRoute,
    newRacketRoute,
    editRacketRoute,
    opponentsRoute,
    newOpponentRoute,
    editOpponentRoute,
    newMatchRoute,
    matchDetailRoute,
    editMatchRoute,
  ]),
  loginRoute,
  registerRoute,
]);

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      refetchOnWindowFocus: false,
    },
  },
});

export const router = createRouter({
  routeTree,
  context: { queryClient },
  defaultPreload: "intent",
  defaultPreloadStaleTime: 0,
  scrollRestoration: true,
});

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
