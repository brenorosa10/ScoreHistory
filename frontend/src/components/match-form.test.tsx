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

function renderForm(
  onSubmit = vi.fn(),
  defaultValues?: { opponentId: string },
) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <MatchForm
        submitLabel="Salvar partida"
        pending={false}
        onSubmit={onSubmit}
        defaultValues={defaultValues}
      />
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

  it("warns and still saves when the marked result disagrees with the sets", async () => {
    const onSubmit = renderForm(vi.fn(), { opponentId: "ana" });

    fireEvent.change(screen.getByLabelText("1º set — seus games"), { target: { value: "1" } });
    fireEvent.change(screen.getByLabelText("1º set — games do adversário"), { target: { value: "2" } });
    fireEvent.click(screen.getByRole("button", { name: "Set" }));
    fireEvent.change(screen.getByLabelText("2º set — seus games"), { target: { value: "5" } });
    fireEvent.change(screen.getByLabelText("2º set — games do adversário"), { target: { value: "3" } });
    fireEvent.click(screen.getByRole("button", { name: "Salvar partida" }));

    expect(
      await screen.findByText("O placar está empatado. Marque empate ou ajuste os games."),
    ).toBeTruthy();
    expect(screen.queryByText("Placar inválido")).toBeNull();
    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit.mock.calls[0][0]).toMatchObject({ score: "1-2 5-3", won: true });
  });
});
