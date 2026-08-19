import { QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider } from "@tanstack/react-router";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { registerSW } from "virtual:pwa-register";
import { PwaProvider } from "@/components/pwa-provider";
import { applyTheme, getStoredTheme } from "@/lib/theme";
import { queryClient, router } from "@/router";
import "./index.css";

applyTheme(getStoredTheme());
registerSW({ immediate: true });

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <PwaProvider>
        <RouterProvider router={router} />
      </PwaProvider>
    </QueryClientProvider>
  </StrictMode>,
);
