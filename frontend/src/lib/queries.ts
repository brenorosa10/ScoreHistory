import { queryOptions } from "@tanstack/react-query";
import {
  clearToken,
  createUser,
  getMatch,
  getStoredToken,
  listMatches,
  listOpponents,
  login,
  me,
  storeToken,
} from "@/lib/api";

export const meQueryKey = ["auth", "me"] as const;

export const meQueryOptions = () =>
  queryOptions({
    queryKey: meQueryKey,
    queryFn: async () => {
      const token = getStoredToken();
      if (!token) {
        return null;
      }

      try {
        return await me(token);
      } catch {
        clearToken();
        return null;
      }
    },
  });

export async function loginAndLoadUser(email: string, password: string) {
  const auth = await login(email, password);
  storeToken(auth.accessToken);
  return me(auth.accessToken);
}

export async function registerAndLoadUser(email: string, password: string, name: string) {
  await createUser(email, password, name);
  return loginAndLoadUser(email, password);
}

export const opponentsQueryKey = ["opponents"] as const;
export const matchesQueryKey = ["matches"] as const;

export const opponentsQueryOptions = () =>
  queryOptions({
    queryKey: opponentsQueryKey,
    queryFn: listOpponents,
  });

export const matchesQueryOptions = () =>
  queryOptions({
    queryKey: matchesQueryKey,
    queryFn: listMatches,
  });

export const matchQueryOptions = (id: string) =>
  queryOptions({
    queryKey: [...matchesQueryKey, id] as const,
    queryFn: () => getMatch(id),
  });
