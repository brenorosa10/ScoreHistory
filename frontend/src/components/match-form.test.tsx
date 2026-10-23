// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MatchForm } from "@/components/match-form";

vi.stubGlobal(
  "fetch",
  vi.fn(async () =>
    Response.json({
      items: [],
      page: 1,
      pageSize: 50,
      totalCount: 0,
      totalPages: 0,
    }),
  ),
);

function renderForm(onSubmit = vi.fn()) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <MatchForm submitLabel="Salvar partida" pending={false} onSubmit={onSubmit} />
    </QueryClientProvider>,
  );
  return onSubmit;
}

afterEach(() => {
  cleanup();
});

describe("MatchForm score feedback", () => {
  it("shows Placar inválido when saving 0-0", async () => {
    const onSubmit = renderForm();

    fireEvent.click(screen.getByRole("button", { name: "Salvar partida" }));

    expect(await screen.findByText("Placar inválido")).toBeTruthy();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("blocks a win that the score contradicts", async () => {
    const onSubmit = renderForm();

    fireEvent.change(screen.getByLabelText("1º set — games do adversário"), { target: { value: "6" } });
    fireEvent.click(screen.getByRole("button", { name: "Salvar partida" }));

    expect(await screen.findByText("O placar aponta derrota, mas você marcou vitória.")).toBeTruthy();
    expect(onSubmit).not.toHaveBeenCalled();
  });
});
