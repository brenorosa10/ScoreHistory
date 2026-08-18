import { queryOptions } from "@tanstack/react-query";
import { clearToken, createUser, getStoredToken, login, me, storeToken } from "@/lib/api";

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
