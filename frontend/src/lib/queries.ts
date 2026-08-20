import { keepPreviousData, queryOptions } from "@tanstack/react-query";
import {
  clearToken,
  createUser,
  getDashboardHeadToHead,
  getDashboardHeadToHeadByOpponent,
  getDashboardSummary,
  getDashboardTips,
  getMatch,
  getOpponent,
  getRacket,
  getStoredToken,
  listMatches,
  listOpponents,
  listRackets,
  login,
  me,
  storeToken,
  type ListMatchesParams,
  type ListOpponentsParams,
} from "@/lib/api";

export const meQueryKey = ["auth", "me"] as const;
export const opponentsQueryKey = ["opponents"] as const;
export const matchesQueryKey = ["matches"] as const;
export const dashboardQueryKey = ["dashboard"] as const;
export const racketsQueryKey = ["rackets"] as const;

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

export const opponentsQueryOptions = (params: ListOpponentsParams = {}) =>
  queryOptions({
    queryKey: [...opponentsQueryKey, params] as const,
    queryFn: () => listOpponents(params),
    placeholderData: keepPreviousData,
  });

export const opponentQueryOptions = (id: string) =>
  queryOptions({
    queryKey: [...opponentsQueryKey, id] as const,
    queryFn: () => getOpponent(id),
  });

export const matchesQueryOptions = (params: ListMatchesParams = {}) =>
  queryOptions({
    queryKey: [...matchesQueryKey, params] as const,
    queryFn: () => listMatches(params),
    placeholderData: keepPreviousData,
  });

export const matchQueryOptions = (id: string) =>
  queryOptions({
    queryKey: [...matchesQueryKey, id] as const,
    queryFn: () => getMatch(id),
  });

export const dashboardSummaryQueryOptions = () =>
  queryOptions({
    queryKey: [...dashboardQueryKey, "summary"] as const,
    queryFn: getDashboardSummary,
  });

export const dashboardHeadToHeadQueryOptions = () =>
  queryOptions({
    queryKey: [...dashboardQueryKey, "head-to-head"] as const,
    queryFn: getDashboardHeadToHead,
  });

export const dashboardHeadToHeadByOpponentQueryOptions = (opponentId: string) =>
  queryOptions({
    queryKey: [...dashboardQueryKey, "head-to-head", opponentId] as const,
    queryFn: () => getDashboardHeadToHeadByOpponent(opponentId),
    enabled: Boolean(opponentId),
  });

export const dashboardTipsQueryOptions = () =>
  queryOptions({
    queryKey: [...dashboardQueryKey, "tips"] as const,
    queryFn: getDashboardTips,
  });

export const racketsQueryOptions = () =>
  queryOptions({
    queryKey: racketsQueryKey,
    queryFn: listRackets,
  });

export const racketQueryOptions = (id: string) =>
  queryOptions({
    queryKey: [...racketsQueryKey, id] as const,
    queryFn: () => getRacket(id),
  });
