import { apiRequest } from "@/common/utils/api-client";
import type { AuthenticatedUser, AuthResponse, Credentials } from "../types";

/**
 * All network access for the auth feature lives here, so components and
 * hooks never call fetch directly. The access token in the response is
 * ignored on purpose - the backend also sets it as an httpOnly cookie, and
 * putting it anywhere JavaScript can read would defeat that.
 */
export const authService = {
  register(credentials: Credentials): Promise<AuthResponse> {
    return apiRequest<AuthResponse>("/v1/auth/register", {
      method: "POST",
      body: credentials,
    });
  },

  login(credentials: Credentials): Promise<AuthResponse> {
    return apiRequest<AuthResponse>("/v1/auth/login", {
      method: "POST",
      body: credentials,
    });
  },

  logout(): Promise<void> {
    return apiRequest<void>("/v1/auth/logout", { method: "POST" });
  },

  /** Resolves the current session; rejects with a 401 when signed out. */
  me(): Promise<AuthenticatedUser> {
    return apiRequest<AuthenticatedUser>("/v1/auth/me");
  },
};
