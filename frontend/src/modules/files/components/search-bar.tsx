"use client";

import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { EmptyState } from "@/common/components/empty-state";
import { NoResultsIllustration } from "@/common/components/illustrations/spot-illustrations";
import { formatBytes } from "@/modules/uploads/hooks/use-uploads";
import { fileKeys } from "../hooks/use-folder-contents";
import { filesService } from "../services/files.service";
import { FileIcon } from "./file-type-icon";

const DEBOUNCE_MS = 250;

export function SearchBar() {
  const [term, setTerm] = useState("");
  const [debounced, setDebounced] = useState("");
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Debounced so a query is not fired on every keystroke; the search index
  // is a LIKE scan, and this keeps it to one request per pause in typing.
  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(term.trim()), DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [term]);

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, []);

  const { data, isFetching } = useQuery({
    queryKey: fileKeys.search(debounced),
    queryFn: ({ signal }) => filesService.search(debounced, signal),
    // Skipped entirely for an empty term, so opening the box costs nothing.
    enabled: debounced.length > 0,
  });

  const showPanel = open && debounced.length > 0;

  return (
    <div ref={containerRef} className="relative w-full max-w-sm">
      <label htmlFor="file-search" className="sr-only">
        Search your files
      </label>
      <div className="relative">
        <svg
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400"
          viewBox="0 0 16 16"
          fill="none"
          aria-hidden="true"
        >
          <circle cx="7" cy="7" r="4.5" stroke="currentColor" strokeWidth="1.5" />
          <path d="m10.5 10.5 3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
        <input
          id="file-search"
          type="search"
          value={term}
          placeholder="Search files"
          onChange={(event) => {
            setTerm(event.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          className="h-9 w-full rounded-lg border border-border bg-surface pl-9 pr-3 text-sm text-foreground placeholder:text-ink-400"
        />
      </div>

      {showPanel && (
        <div className="absolute left-0 right-0 top-11 z-40 overflow-hidden rounded-xl border border-border bg-surface shadow-lg">
          {isFetching && !data ? (
            <p className="px-4 py-6 text-center text-sm text-muted-foreground">
              Searching…
            </p>
          ) : data && data.length > 0 ? (
            <ul className="max-h-80 divide-y divide-border overflow-y-auto">
              {data.map((file) => (
                <li key={file.id}>
                  <button
                    type="button"
                    onClick={async () => {
                      const target = await filesService.getDownloadUrl(
                        file.id,
                        file.contentType.startsWith("image/"),
                      );
                      window.open(target.url, "_blank", "noopener,noreferrer");
                      setOpen(false);
                    }}
                    className="flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-surface-muted"
                  >
                    <FileIcon contentType={file.contentType} className="h-5 w-5 shrink-0" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm text-foreground">
                        {file.name}
                      </span>
                      <span className="block text-xs text-muted-foreground">
                        {formatBytes(file.sizeBytes)}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            // A zero-result search is its own empty state, with a way out -
            // not a blank dropdown.
            <EmptyState
              illustration={<NoResultsIllustration />}
              title="No files match that"
              description={`Nothing found for "${debounced}". Try part of a filename.`}
              action={
                <button
                  type="button"
                  onClick={() => {
                    setTerm("");
                    setOpen(false);
                  }}
                  className="text-sm font-medium text-brand-600 hover:underline"
                >
                  Clear search
                </button>
              }
            />
          )}
        </div>
      )}
    </div>
  );
}
