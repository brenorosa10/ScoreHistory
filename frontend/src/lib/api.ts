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
