"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { ApiError } from "@/common/utils/api-client";
import { authService } from "../services/auth.service";
import type { Credentials } from "../types";

export const authKeys = {
  session: ["auth", "session"] as const,
};

/**
 * Current session, resolved from the server.
 *
 * Because the token lives in an httpOnly cookie the client cannot inspect
 * it, so "am I signed in?" is a server question. A 401 is a valid answer
 * ("signed out"), not an error to retry.
 */
export function useSession() {
  const query = useQuery({
    queryKey: authKeys.session,
    queryFn: () => authService.me(),
    retry: (failureCount, error) =>
      error instanceof ApiError && error.isUnauthorized
        ? false
        : failureCount < 1,
    staleTime: 5 * 60 * 1000,
  });

  const isUnauthenticated =
    query.error instanceof ApiError && query.error.isUnauthorized;

  return {
    user: query.data ?? null,
    isLoading: query.isPending,
    isAuthenticated: Boolean(query.data),
    isUnauthenticated,
  };
}

export function useLogin() {
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation({
    mutationFn: (credentials: Credentials) => authService.login(credentials),
    onSuccess: (result) => {
      // Seed the cache so the app shell renders immediately instead of
      // flashing a loading state while /auth/me round-trips.
      queryClient.setQueryData(authKeys.session, result.user);
      router.push("/files");
    },
  });
}

export function useRegister() {
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation({
    mutationFn: (credentials: Credentials) => authService.register(credentials),
    onSuccess: (result) => {
      queryClient.setQueryData(authKeys.session, result.user);
      router.push("/files");
    },
  });
}

export function useLogout() {
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation({
    mutationFn: () => authService.logout(),
    onSettled: () => {
      // Runs on failure too: if the logout request itself fails the user
      // still asked to leave, and the cookie may already be gone. Clearing
      // everything avoids leaving one account's files cached for the next
      // person to sign in on this device.
      queryClient.clear();
      router.push("/login");
    },
  });
}
