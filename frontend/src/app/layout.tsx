import type { Metadata } from "next";
import { Google_Sans, Google_Sans_Code } from "next/font/google";
import { Providers } from "./providers";
import "@/styles/globals.css";

// Google Sans is new enough that Next has no font-metric overrides for it
// yet, so it cannot synthesize a size-adjusted fallback face and warns at
// build time. Naming the fallback stack explicitly keeps the pre-swap
// render close in metrics instead of landing on Times New Roman.
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
  title: "File App",
  description: "File App frontend",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${googleSans.variable} ${googleSansCode.variable}`}
    >
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
