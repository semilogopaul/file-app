import Link from "next/link";
import { Logo } from "@/common/components/logo";
import { Button } from "@/common/components/button";

const NAV_LINKS = [
  { href: "#features", label: "Features" },
  { href: "#how-it-works", label: "How it works" },
  { href: "#security", label: "Security" },
];

/**
 * Detached "floating pill" header.
 *
 * The bar is inset from every edge and fully rounded, so it reads as an
 * element sitting above the page rather than a band welded to the top of
 * it. The sticky wrapper is what scrolls; the pill inside keeps its margins,
 * which is what preserves the detached look while scrolling.
 *
 * A real border plus a solid-ish background rather than a blur-only
 * treatment: over a busy hero, backdrop blur alone leaves the text
 * insufficiently separated from what passes underneath.
 */
export function SiteHeader() {
  return (
    <div className="sticky top-0 z-40 px-3 pt-3 sm:px-5 sm:pt-5">
      <header className="mx-auto w-full max-w-5xl rounded-2xl border border-border bg-background/80 shadow-sm shadow-ink-900/5 backdrop-blur-xl">
        <div className="flex h-14 items-center justify-between gap-4 pl-5 pr-3 sm:pl-6 sm:pr-4">
          <Link href="/" className="shrink-0 rounded-md" aria-label="istore home">
            <Logo size="md" />
          </Link>

          <nav aria-label="Main" className="hidden md:block">
            <ul className="flex items-center gap-7">
              {NAV_LINKS.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <div className="flex shrink-0 items-center gap-1.5">
            <Link href="/login">
              <Button variant="ghost" size="sm">
                Sign in
              </Button>
            </Link>
            <Link href="/register">
              <Button size="sm" className="rounded-full px-4">
                Get started
              </Button>
            </Link>
          </div>
        </div>
      </header>
    </div>
  );
}
