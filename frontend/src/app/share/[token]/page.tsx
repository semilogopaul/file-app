"use client";

import Link from "next/link";
import { use } from "react";
import { useQuery } from "@tanstack/react-query";
import { Logo } from "@/common/components/logo";
import { Button } from "@/common/components/button";
import { EmptyState } from "@/common/components/empty-state";
import { BrokenLinkIllustration } from "@/common/components/illustrations/spot-illustrations";
import { FileIcon } from "@/modules/files/components/file-type-icon";
import { formatBytes } from "@/modules/uploads/hooks/use-uploads";
import { apiRequest } from "@/common/utils/api-client";

interface SharedFile {
  readonly name: string;
  readonly sizeBytes: number;
  readonly contentType: string;
  readonly downloadUrl: string;
  readonly expiresAt: string;
}

/**
 * Public landing page for a share link.
 *
 * Deliberately requires no session: this is the page someone opens in a
 * private window from a link a friend pasted. It shows what the file is
 * before they download it, rather than dumping raw JSON or triggering an
 * unexplained download.
 */
export default function SharePage({
  params,
}: {
  readonly params: Promise<{ token: string }>;
}) {
  const { token } = use(params);

  const { data, isPending, isError } = useQuery({
    queryKey: ["share", token],
    queryFn: () => apiRequest<SharedFile>(`/share/${token}`),
    // An invalid or expired link is a final answer, not a transient fault.
    retry: false,
  });

  return (
    <main id="main" className="flex min-h-screen flex-col">
      <header className="border-b border-border">
        <div className="mx-auto flex h-16 w-full max-w-3xl items-center px-5 sm:px-8">
          <Link href="/" aria-label="istore home">
            <Logo size="sm" />
          </Link>
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-3xl flex-1 items-center justify-center px-5 py-12 sm:px-8">
        {isPending ? (
          <div aria-busy="true" className="flex flex-col items-center gap-3">
            <span className="h-6 w-6 animate-spin rounded-full border-2 border-brand-200 border-t-brand-600" />
            <p className="text-sm text-muted-foreground">Opening shared file…</p>
          </div>
        ) : isError || !data ? (
          <EmptyState
            illustration={<BrokenLinkIllustration />}
            title="This link isn't available"
            description="It may have expired, been turned off by its owner, or the file may have been deleted."
            action={
              <Link href="/">
                <Button variant="secondary">Go to istore</Button>
              </Link>
            }
          />
        ) : (
          <SharedFileCard file={data} />
        )}
      </div>
    </main>
  );
}

function SharedFileCard({ file }: { readonly file: SharedFile }) {
  const isImage = file.contentType.startsWith("image/");

  return (
    <div className="w-full max-w-md rounded-2xl border border-border bg-surface p-8 text-center">
      <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-surface">
        <FileIcon contentType={file.contentType} className="h-8 w-8" />
      </span>

      <h1 className="mt-5 break-words text-lg font-semibold text-foreground">
        {file.name}
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">
        {formatBytes(file.sizeBytes)} · shared with you
      </p>

      {isImage && (
        /* next/image is deliberately not used here: its optimiser needs a
           stable, pre-configured remote host, and this src is a short-lived
           presigned storage URL that changes every request. */
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={file.downloadUrl}
          alt={file.name}
          className="mt-6 max-h-64 w-full rounded-xl border border-border object-contain"
        />
      )}

      <a href={file.downloadUrl} download={file.name} className="mt-6 block">
        <Button size="lg" className="w-full">
          Download
        </Button>
      </a>

      <p className="mt-4 text-xs text-muted-foreground">
        This link expires {formatExpiry(file.expiresAt)}.
      </p>
    </div>
  );
}

function formatExpiry(iso: string): string {
  const expires = new Date(iso);
  const hoursLeft = Math.round((expires.getTime() - Date.now()) / 3_600_000);

  if (hoursLeft < 1) return "in less than an hour";
  if (hoursLeft < 24) return `in ${hoursLeft} hour${hoursLeft === 1 ? "" : "s"}`;

  const days = Math.round(hoursLeft / 24);
  return `in ${days} day${days === 1 ? "" : "s"}`;
}
