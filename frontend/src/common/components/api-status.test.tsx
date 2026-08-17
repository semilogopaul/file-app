import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiStatus } from "./api-status";

function renderWithQuery(ui: ReactNode) {
  // retry: false so a rejected fetch surfaces the error state immediately
  // instead of burning the test's time on TanStack Query's retry backoff.
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>,
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("ApiStatus", () => {
  it("shows a pending state before the request settles", () => {
    vi.stubGlobal("fetch", vi.fn(() => new Promise(() => {})));

    renderWithQuery(<ApiStatus />);

    expect(screen.getByText(/checking api status/i)).toBeInTheDocument();
  });

  it("reports the status returned by the API", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ status: "ok" }),
        }),
      ),
    );

    renderWithQuery(<ApiStatus />);

    expect(await screen.findByText(/api status: ok/i)).toBeInTheDocument();
  });

  it("surfaces an unreachable state when the API responds with an error", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() => Promise.resolve({ ok: false, status: 500 })),
    );

    renderWithQuery(<ApiStatus />);

    // ApiStatus sets its own `retry: 1`, which overrides the client-level
    // `retry: false` above, so the error state only appears after one
    // backoff cycle - longer than findByText's 1s default.
    expect(
      await screen.findByText(/api unreachable/i, undefined, { timeout: 3000 }),
    ).toBeInTheDocument();
  });
});
