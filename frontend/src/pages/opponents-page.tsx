import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate, useSearch } from "@tanstack/react-router";
import { Pencil, Plus, Search, Users } from "lucide-react";
import { useEffect, useState } from "react";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { Pagination } from "@/components/pagination";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { DEFAULT_PAGE_SIZE } from "@/lib/api";
import { toInitials } from "@/lib/format";
import { opponentsQueryOptions } from "@/lib/queries";

export function OpponentsPage() {
  const navigate = useNavigate({ from: "/adversarios" });
  const search = useSearch({ from: "/app/adversarios" });
  const page = search.page ?? 1;
  const q = search.q ?? "";
  const [query, setQuery] = useState(q);
  const debouncedQuery = useDebouncedValue(query);
  const { data, isPending, isFetching } = useQuery(
    opponentsQueryOptions({
      page,
      pageSize: DEFAULT_PAGE_SIZE,
      search: q,
    }),
  );

  const opponents = data?.items ?? [];
  const totalCount = data?.totalCount ?? 0;
  const totalPages = data?.totalPages ?? 0;

  useEffect(() => {
    setQuery(q);
  }, [q]);

  useEffect(() => {
    if (debouncedQuery === q) {
      return;
    }

    void navigate({
      search: { page: 1, q: debouncedQuery || undefined },
      replace: true,
    });
  }, [debouncedQuery, navigate, q]);

  useEffect(() => {
    if (data && data.totalPages > 0 && page > data.totalPages) {
      void navigate({ search: { page: data.totalPages, q: q || undefined }, replace: true });
    }
  }, [data, navigate, page, q]);

  function goToPage(nextPage: number) {
    void navigate({ search: { page: nextPage, q: q || undefined } });
  }

  return (
    <>
      <PageHeader
        title="Adversários"
        description="Perfis, características e confrontos"
        back
        action={
          <Button asChild size="sm">
            <Link to="/adversarios/novo">
              <Plus />
              Novo
            </Link>
          </Button>
        }
      />

      <main className="grid gap-3 px-4 pt-4">
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pr-9 pl-9"
            type="search"
            placeholder="Buscar por nome"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            aria-label="Buscar adversário"
          />
          {isFetching ? (
            <Spinner className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-muted-foreground" />
          ) : null}
        </div>

        {isPending && !data ? (
          <div className="grid gap-3">
            <Skeleton className="h-28 rounded-2xl" />
            <Skeleton className="h-28 rounded-2xl" />
            <Skeleton className="h-28 rounded-2xl" />
          </div>
        ) : totalCount === 0 ? (
          <EmptyState
            icon={Users}
            title={q ? "Nenhum adversário encontrado" : "Nenhum adversário"}
            description={
              q
                ? "Tente outro nome ou limpe a busca para ver todos os perfis."
                : "Cadastre quem você enfrenta para acompanhar o head to head e os pontos a explorar."
            }
            action={
              q ? undefined : (
                <Button asChild size="sm" className="mt-1">
                  <Link to="/adversarios/novo">Cadastrar adversário</Link>
                </Button>
              )
            }
          />
        ) : (
          <>
            {opponents.map((opponent) => {
              const played = opponent.played ?? 0;
              const wins = opponent.wins ?? 0;

              return (
                <article
                  key={opponent.id}
                  className="grid gap-3 rounded-2xl border bg-card p-4 shadow-xs"
                >
                  <div className="flex items-center gap-3">
                    <span className="grid size-11 shrink-0 place-items-center rounded-full bg-accent text-sm font-semibold text-accent-foreground">
                      {toInitials(opponent.name)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{opponent.name}</p>
                      <p className="text-xs text-muted-foreground">{opponent.handedness}</p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      {played > 0 ? (
                        <Badge variant="outline">
                          H2H {wins}-{played - wins}
                        </Badge>
                      ) : (
                        <Badge variant="outline">Sem jogos</Badge>
                      )}
                      <Button asChild variant="outline" size="sm">
                        <Link
                          to="/adversarios/$opponentId/editar"
                          params={{ opponentId: opponent.id }}
                        >
                          <Pencil />
                          Editar
                        </Link>
                      </Button>
                    </div>
                  </div>

                  {opponent.strengths || opponent.weaknesses ? (
                    <div className="grid gap-1 border-t pt-3 text-sm">
                      {opponent.strengths ? (
                        <p>
                          <span className="font-medium text-success">Forte: </span>
                          <span className="text-muted-foreground">{opponent.strengths}</span>
                        </p>
                      ) : null}
                      {opponent.weaknesses ? (
                        <p>
                          <span className="font-medium text-destructive">Fraco: </span>
                          <span className="text-muted-foreground">{opponent.weaknesses}</span>
                        </p>
                      ) : null}
                    </div>
                  ) : null}

                  {opponent.notes ? (
                    <p className="text-sm text-muted-foreground">{opponent.notes}</p>
                  ) : null}
                </article>
              );
            })}

            <Pagination
              page={page}
              totalPages={totalPages}
              totalCount={totalCount}
              pageSize={DEFAULT_PAGE_SIZE}
              loading={isFetching}
              onPageChange={goToPage}
            />
          </>
        )}
      </main>
    </>
  );
}
