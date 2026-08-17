"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Logo } from "@/common/components/logo";
import { Button } from "@/common/components/button";
import { useLogout, useSession } from "@/modules/auth/hooks/use-auth";
import { SearchBar } from "./search-bar";

/**
 * Authenticated shell.
 *
 * Guards its children client-side: the session lives in an httpOnly cookie
 * the browser cannot read, so "signed in?" is a server question and the
 * answer arrives asynchronously. A signed-out user is redirected rather than
 * shown an empty dashboard.
 */
export function AppShell({ children }: { readonly children: React.ReactNode }) {
  const { user, isLoading, isUnauthenticated } = useSession();
  const logout = useLogout();
  const router = useRouter();

  useEffect(() => {
    if (isUnauthenticated) router.replace("/login");
  }, [isUnauthenticated, router]);

  if (isLoading || isUnauthenticated) {
    return (
      <div
        className="flex min-h-screen items-center justify-center"
        aria-busy="true"
      >
        <span className="sr-only">Checking your session…</span>
        <span className="h-6 w-6 animate-spin rounded-full border-2 border-brand-200 border-t-brand-600" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-30 border-b border-border bg-background/90 backdrop-blur-md">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center gap-4 px-5 sm:px-8">
          <Link href="/files" aria-label="istore home">
            <Logo size="sm" />
          </Link>

          <div className="ml-2 hidden flex-1 sm:block">
            <SearchBar />
          </div>

          <div className="ml-auto flex items-center gap-3">
            <span className="hidden text-sm text-muted-foreground md:inline">
              {user?.email}
            </span>
            <Button
              variant="ghost"
              size="sm"
              loading={logout.isPending}
              onClick={() => logout.mutate()}
            >
              Sign out
            </Button>
          </div>
        </div>

        <div className="px-5 pb-3 sm:hidden">
          <SearchBar />
        </div>
      </header>

      <main id="main" className="mx-auto w-full max-w-6xl flex-1 px-5 py-6 sm:px-8">
        {children}
      </main>
    </div>
  );
}
