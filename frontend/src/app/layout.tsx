import type { Metadata } from "next";
import { Google_Sans, Google_Sans_Code } from "next/font/google";
import { Providers } from "./providers";
import "@/styles/globals.css";

// Google Sans became available under the SIL Open Font License in Dec 2025
// and is served through next/font/google, so it is self-hosted at build
// time - no runtime request to fonts.googleapis.com, and no CSP exception.
//
// The arrays below must stay inline literals - next/font reads these at
// build time and rejects values referenced through a variable.
const googleSans = Google_Sans({
  variable: "--font-google-sans",
  subsets: ["latin"],
  display: "swap",
  fallback: ["system-ui", "-apple-system", "Segoe UI", "Arial"],
});

const googleSansCode = Google_Sans_Code({
  variable: "--font-google-sans-code",
  fallback: ["ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "istore — your files, organised and actually private",
  description:
    "Upload, organise into folders, and share files with links that expire. Files go straight to storage and never through our servers.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${googleSans.variable} ${googleSansCode.variable}`}
    >
      <body className="min-h-screen antialiased">
        {/* First focusable element on the page, so keyboard users can jump
            past the nav instead of tabbing through it on every route. */}
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-brand-600 focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-white"
        >
          Skip to content
        </a>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
