// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ProfilePage } from "@/pages/profile-page";

vi.mock("@tanstack/react-router", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@tanstack/react-router")>();
  return {
    ...actual,
    useNavigate: () => vi.fn(),
  };
});

vi.mock("@/components/equipment-section", () => ({
  EquipmentSection: () => null,
}));

vi.mock("@/components/finance-section", () => ({
  FinanceSection: () => null,
}));

vi.mock("@/components/page-header", () => ({
  PageHeader: () => null,
}));

vi.mock("@/components/install-app-button", () => ({
  InstallAppButton: () => null,
}));

vi.mock("@/components/theme-toggle", () => ({
  ThemeToggle: () => null,
}));

describe("Perfil sports for an existing account", () => {
  afterEach(() => {
    cleanup();
    localStorage.clear();
    vi.unstubAllGlobals();
  });

  it("lets a user who only has the tennis default add and save other sports", async () => {
    let saved: { sports?: string[] } | null = null;
    localStorage.setItem("scorehistory.token", "token");
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input);
        if (url.includes("/api/users/me/sports")) {
          saved = JSON.parse(String(init?.body ?? "{}")) as { sports?: string[] };
          return Response.json({
            id: "user-1",
            email: "ana@example.com",
            name: "Ana",
            sports: saved.sports,
            sportsConfirmed: true,
          });
        }
        if (url.includes("/api/auth/me")) {
          return Response.json({
            id: "user-1",
            email: "ana@example.com",
            name: "Ana",
            sportsConfirmed: true,
          });
        }
        return Response.json({
          matches: 0,
          wins: 0,
          losses: 0,
          draws: 0,
          winRate: 0,
          opponents: 0,
          streakCount: null,
          streakWon: null,
          latestMatch: null,
          bySport: [],
        });
      }),
    );

    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={client}>
        <ProfilePage />
      </QueryClientProvider>,
    );

    expect(await screen.findByRole("button", { name: "Tênis", pressed: true })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Padel" }));
    fireEvent.click(screen.getByRole("button", { name: "Beach tennis" }));
    fireEvent.click(screen.getByRole("button", { name: "Tênis" }));
    fireEvent.click(screen.getByRole("button", { name: "Salvar esportes" }));

    await waitFor(() => expect(saved?.sports).toEqual(["Padel", "Beach tennis"]));
    expect(screen.getByRole("button", { name: "Padel", pressed: true })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Tênis", pressed: false })).toBeTruthy();
  });
});