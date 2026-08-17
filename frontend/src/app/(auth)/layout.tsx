import type { ReactNode } from "react";
import { HeroIllustration } from "@/common/components/illustrations/hero-illustration";

/**
 * Split layout for the auth screens: form on the left, brand panel on the
 * right. The panel is hidden below `lg` rather than stacked, so a phone
 * shows the form immediately instead of a screenful of decoration.
 */
export default function AuthLayout({
  children,
}: {
  // Explicit rather than Next's generated LayoutProps: this layout serves a
  // route group, which the generated union does not model.
  readonly children: ReactNode;
}) {
  return (
    <main id="main" className="grid min-h-screen lg:grid-cols-2">
      <div className="flex items-center justify-center px-6 py-12 sm:px-10">
        {children}
      </div>

      <aside
        aria-hidden="true"
        className="relative hidden items-center justify-center overflow-hidden bg-brand-50 lg:flex"
      >
        <div className="pointer-events-none absolute -right-24 top-1/4 h-72 w-72 rounded-full bg-brand-200/50 blur-3xl" />
        <div className="relative flex flex-col items-center gap-8 px-12 text-center">
          <HeroIllustration className="w-full max-w-md" />
          <div>
            <p className="text-lg font-medium text-ink-800">
              Files that go straight to storage
            </p>
            <p className="mt-2 max-w-sm text-sm text-ink-600">
              Uploads never pass through our servers, and every file stays
              scoped to your account alone.
            </p>
          </div>
        </div>
      </aside>
    </main>
  );
}
