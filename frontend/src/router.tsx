import { QueryClient } from "@tanstack/react-query";
import {
  Outlet,
  createRootRouteWithContext,
  createRoute,
  createRouter,
  redirect,
} from "@tanstack/react-router";
import { getStoredToken } from "@/lib/api";
import { meQueryOptions } from "@/lib/queries";
import { HomePage } from "@/pages/home-page";
import { LoginPage } from "@/pages/login-page";
import { RegisterPage } from "@/pages/register-page";

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

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  beforeLoad: async ({ context }) => {
    const user = await ensureSession(context.queryClient);
    if (!user) {
      throw redirect({ to: "/login" });
    }
  },
  loader: ({ context }) => context.queryClient.ensureQueryData(meQueryOptions()),
  component: HomePage,
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

const routeTree = rootRoute.addChildren([indexRoute, loginRoute, registerRoute]);

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
