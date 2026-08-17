"use client";

import { useQuery } from "@tanstack/react-query";
import env from "@/config/env";

interface HealthResponse {
  readonly status: string;
}

async function fetchApiHealth(): Promise<HealthResponse> {
  const response = await fetch(`${env.apiUrl}/health`);

  if (!response.ok) {
    throw new Error(`API responded with ${response.status}`);
  }

  return (await response.json()) as HealthResponse;
}

const STATE_STYLES = {
  pending: "text-gray-500",
  ok: "text-green-600",
  error: "text-red-600",
} as const;

/**
 * Small proof-of-wiring widget: confirms the frontend can reach the backend
 * through whatever path is active (nginx same-origin proxy in production,
 * direct cross-origin call in local dev). Real features should follow this
 * same fetch-via-services + TanStack Query pattern rather than fetching
 * inside components directly.
 */
export function ApiStatus() {
  const { data, isPending, isError } = useQuery({
    queryKey: ["api-health"],
    queryFn: fetchApiHealth,
    retry: 1,
  });

  const state = isPending ? "pending" : isError ? "error" : "ok";
  const label = isPending
    ? "Checking API status…"
    : isError
      ? "API unreachable"
      : `API status: ${data.status}`;

  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full border border-current px-3.5 py-2 text-sm font-medium ${STATE_STYLES[state]}`}
    >
      <span className="h-2 w-2 shrink-0 rounded-full bg-current" />
      {label}
    </span>
  );
}
