import { ApiStatus } from "@/common/components/api-status";

export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-2xl flex-col items-start justify-center gap-6 px-6 py-24 sm:px-16">
      <h1 className="text-4xl font-semibold tracking-tight">File App</h1>
      <p className="max-w-md text-lg leading-8 text-foreground/70">
        Next.js frontend, wired up and ready to build on.
      </p>
      <ApiStatus />
    </main>
  );
}
