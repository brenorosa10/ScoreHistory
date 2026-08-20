const API_URL = import.meta.env.VITE_API_URL ?? "";
const TOKEN_KEY = "scorehistory.token";

export type AuthResponse = {
  accessToken: string;
  tokenType: string;
  expiresAtUtc: string;
  email: string;
};

export type MeResponse = {
  id: string;
  email: string;
  name: string | null;
};

export type UserResponse = {
  id: string;
  email: string;
  name: string | null;
};

async function readError(response: Response, fallback: string): Promise<string> {
  const error = (await response.json().catch(() => null)) as { message?: string } | null;
  return error?.message ?? fallback;
}

export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function storeToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

export async function createUser(
  email: string,
  password: string,
  name: string,
): Promise<UserResponse> {
  const response = await fetch(`${API_URL}/api/users`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, name }),
  });

  if (!response.ok) {
    throw new Error(await readError(response, "Não foi possível criar o usuário."));
  }

  return response.json() as Promise<UserResponse>;
}

export async function login(email: string, password: string): Promise<AuthResponse> {
  const response = await fetch(`${API_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  if (!response.ok) {
    throw new Error(await readError(response, "Falha no login."));
  }

  return response.json() as Promise<AuthResponse>;
}

export async function me(accessToken: string): Promise<MeResponse> {
  const response = await fetch(`${API_URL}/api/auth/me`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    throw new Error("Sessão inválida.");
  }

  return response.json() as Promise<MeResponse>;
}

export type Opponent = {
  id: string;
  name: string;
  handedness: string;
  strengths: string | null;
  weaknesses: string | null;
  notes: string | null;
  played?: number;
  wins?: number;
};

export type OpponentPayload = {
  name: string;
  handedness: string;
  strengths?: string;
  weaknesses?: string;
  notes?: string;
};

export type MatchRecord = {
  id: string;
  opponentId: string;
  opponentName: string;
  opponentHandedness: string;
  playedAt: string;
  score: string;
  won: boolean;
  courtType: string;
  notes: string | null;
  strengths: string | null;
  weaknesses: string | null;
  opponentStrengths: string | null;
  opponentWeaknesses: string | null;
};

export type MatchPayload = {
  opponentId: string;
  score: string;
  won: boolean;
  courtType: string;
  playedAt?: string;
  notes?: string;
  strengths?: string;
  weaknesses?: string;
  opponentStrengths?: string;
  opponentWeaknesses?: string;
};

export const DEFAULT_PAGE_SIZE = 10;

export type PagedResult<T> = {
  items: T[];
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
};

export type ListOpponentsParams = {
  page?: number;
  pageSize?: number;
  search?: string;
};

export type MatchFilter = "all" | "wins" | "losses";

export type ListMatchesParams = {
  page?: number;
  pageSize?: number;
  filter?: MatchFilter;
};

export type DashboardSummary = {
  matches: number;
  wins: number;
  losses: number;
  winRate: number;
  opponents: number;
  streakCount: number | null;
  streakWon: boolean | null;
  latestMatch: {
    id: string;
    opponentName: string;
    playedAt: string;
    courtType: string;
    score: string;
    won: boolean;
  } | null;
};

export type HeadToHead = {
  opponentId: string;
  name: string;
  played: number;
  wins: number;
  losses: number;
  lastScore: string;
};

export type RacketServiceKind = "Corda" | "Overgrip" | "Grip" | "Outro";

export type RacketServiceRecord = {
  id: string;
  kind: RacketServiceKind;
  changedAt: string;
  detail: string | null;
  tensionLb: number | null;
};

export type RacketRecord = {
  id: string;
  name: string;
  stringName: string | null;
  tensionLb: number | null;
  grip: string | null;
  notes: string | null;
  frameColor: string;
  stringColor: string;
  gripColor: string;
  services: RacketServiceRecord[];
};

export type RacketServicePayload = {
  id?: string;
  kind: RacketServiceKind;
  changedAt: string;
  detail?: string | null;
  tensionLb?: number | null;
};

export type RacketPayload = {
  name: string;
  stringName?: string;
  tensionLb?: number | null;
  grip?: string;
  notes?: string;
  frameColor?: string;
  stringColor?: string;
  gripColor?: string;
  services?: RacketServicePayload[];
};

function authHeaders(): HeadersInit {
  const token = getStoredToken();
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function parseJson<T>(response: Response, fallback: string): Promise<T> {
  if (!response.ok) {
    throw new Error(await readError(response, fallback));
  }

  return response.json() as Promise<T>;
}

function toQuery(params: Record<string, string | number | undefined>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === "") {
      continue;
    }
    search.set(key, String(value));
  }
  const query = search.toString();
  return query ? `?${query}` : "";
}

export async function listOpponents(params: ListOpponentsParams = {}): Promise<PagedResult<Opponent>> {
  const response = await fetch(
    `${API_URL}/api/opponents${toQuery({
      page: params.page ?? 1,
      pageSize: params.pageSize ?? DEFAULT_PAGE_SIZE,
      search: params.search?.trim() || undefined,
    })}`,
    { headers: authHeaders() },
  );
  return parseJson(response, "Não foi possível carregar os adversários.");
}

export async function createOpponent(payload: OpponentPayload): Promise<Opponent> {
  const response = await fetch(`${API_URL}/api/opponents`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(payload),
  });
  return parseJson(response, "Não foi possível cadastrar o adversário.");
}

export async function getOpponent(id: string): Promise<Opponent> {
  const response = await fetch(`${API_URL}/api/opponents/${id}`, { headers: authHeaders() });
  return parseJson(response, "Não foi possível carregar o adversário.");
}

export async function updateOpponent(id: string, payload: OpponentPayload): Promise<Opponent> {
  const response = await fetch(`${API_URL}/api/opponents/${id}`, {
    method: "PUT",
    headers: authHeaders(),
    body: JSON.stringify(payload),
  });
  return parseJson(response, "Não foi possível atualizar o adversário.");
}

export async function listMatches(params: ListMatchesParams = {}): Promise<PagedResult<MatchRecord>> {
  const response = await fetch(
    `${API_URL}/api/matches${toQuery({
      page: params.page ?? 1,
      pageSize: params.pageSize ?? DEFAULT_PAGE_SIZE,
      filter: params.filter && params.filter !== "all" ? params.filter : undefined,
    })}`,
    { headers: authHeaders() },
  );
  return parseJson(response, "Não foi possível carregar as partidas.");
}

export async function getDashboardSummary(): Promise<DashboardSummary> {
  const response = await fetch(`${API_URL}/api/dashboard/summary`, { headers: authHeaders() });
  return parseJson(response, "Não foi possível carregar o resumo.");
}

export async function getDashboardHeadToHead(): Promise<HeadToHead[]> {
  const response = await fetch(`${API_URL}/api/dashboard/head-to-head`, { headers: authHeaders() });
  return parseJson(response, "Não foi possível carregar o head to head.");
}

export async function getDashboardHeadToHeadByOpponent(opponentId: string): Promise<HeadToHead> {
  const response = await fetch(`${API_URL}/api/dashboard/head-to-head/${opponentId}`, {
    headers: authHeaders(),
  });
  return parseJson(response, "Não foi possível carregar o confronto.");
}

export async function getDashboardTips(): Promise<string[]> {
  const response = await fetch(`${API_URL}/api/dashboard/tips`, { headers: authHeaders() });
  const body = await parseJson<{ tips: string[] }>(response, "Não foi possível carregar os avisos.");
  return body.tips;
}

export async function getMatch(id: string): Promise<MatchRecord> {
  const response = await fetch(`${API_URL}/api/matches/${id}`, { headers: authHeaders() });
  return parseJson(response, "Não foi possível carregar a partida.");
}

export async function createMatch(payload: MatchPayload): Promise<MatchRecord> {
  const response = await fetch(`${API_URL}/api/matches`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(payload),
  });
  return parseJson(response, "Não foi possível cadastrar a partida.");
}

export async function updateMatch(id: string, payload: MatchPayload): Promise<MatchRecord> {
  const response = await fetch(`${API_URL}/api/matches/${id}`, {
    method: "PUT",
    headers: authHeaders(),
    body: JSON.stringify(payload),
  });
  return parseJson(response, "Não foi possível atualizar a partida.");
}

export async function listRackets(): Promise<RacketRecord[]> {
  const response = await fetch(`${API_URL}/api/rackets`, { headers: authHeaders() });
  return parseJson(response, "Não foi possível carregar as raquetes.");
}

export async function getRacket(id: string): Promise<RacketRecord> {
  const response = await fetch(`${API_URL}/api/rackets/${id}`, { headers: authHeaders() });
  return parseJson(response, "Não foi possível carregar a raquete.");
}

export async function createRacket(payload: RacketPayload): Promise<RacketRecord> {
  const response = await fetch(`${API_URL}/api/rackets`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(payload),
  });
  return parseJson(response, "Não foi possível cadastrar a raquete.");
}

export async function updateRacket(id: string, payload: RacketPayload): Promise<RacketRecord> {
  const response = await fetch(`${API_URL}/api/rackets/${id}`, {
    method: "PUT",
    headers: authHeaders(),
    body: JSON.stringify(payload),
  });
  return parseJson(response, "Não foi possível atualizar a raquete.");
}
