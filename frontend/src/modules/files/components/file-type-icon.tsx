import { cn } from "@/common/utils/cn";

/**
 * Distinguishes folders from files, and PDFs from images, by shape as well
 * as colour - so the type is still legible in greyscale or to someone who
 * cannot separate the hues.
 */
export function FolderIcon({ className }: { readonly className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className={cn("text-brand-500", className)}
      aria-hidden="true"
    >
      <path
        d="M3 7.5A2.5 2.5 0 0 1 5.5 5h3.1a2 2 0 0 1 1.5.7l1.1 1.3h7.3A2.5 2.5 0 0 1 21 9.5v7A2.5 2.5 0 0 1 18.5 19h-13A2.5 2.5 0 0 1 3 16.5v-9Z"
        fill="currentColor"
        fillOpacity="0.18"
      />
      <path
        d="M3 7.5A2.5 2.5 0 0 1 5.5 5h3.1a2 2 0 0 1 1.5.7l1.1 1.3h7.3A2.5 2.5 0 0 1 21 9.5v7A2.5 2.5 0 0 1 18.5 19h-13A2.5 2.5 0 0 1 3 16.5v-9Z"
        stroke="currentColor"
        strokeWidth="1.6"
      />
    </svg>
  );
}

export function FileIcon({
  contentType,
  className,
}: {
  readonly contentType: string;
  readonly className?: string;
}) {
  const isImage = contentType.startsWith("image/");

  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className={cn(isImage ? "text-brand-400" : "text-ink-400", className)}
      aria-hidden="true"
    >
      <path
        d="M6 3.5h7L19 9v11.5a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1v-16a1 1 0 0 1 1-1Z"
        fill="currentColor"
        fillOpacity="0.14"
      />
      <path
        d="M6 3.5h7L19 9v11.5a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1v-16a1 1 0 0 1 1-1Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path
        d="M13 3.5V8a1 1 0 0 0 1 1h4.5"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      {isImage ? (
        // Mountain + sun, the universal "picture" glyph.
        <>
          <circle cx="9.5" cy="13" r="1.4" fill="currentColor" />
          <path
            d="m7 18 3-3.2 2.2 2.3L14.6 15l2.4 3H7Z"
            fill="currentColor"
            fillOpacity="0.5"
          />
        </>
      ) : (
        // Text lines, for documents.
        <>
          <path
            d="M8 13h8M8 16.5h5"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
          />
        </>
      )}
    </svg>
  );
}
