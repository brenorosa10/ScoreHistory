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
    body: JSON.stringify({ email, password, name: name || null }),
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

export async function listOpponents(): Promise<Opponent[]> {
  const response = await fetch(`${API_URL}/api/opponents`, { headers: authHeaders() });
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

export async function listMatches(): Promise<MatchRecord[]> {
  const response = await fetch(`${API_URL}/api/matches`, { headers: authHeaders() });
  return parseJson(response, "Não foi possível carregar as partidas.");
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
