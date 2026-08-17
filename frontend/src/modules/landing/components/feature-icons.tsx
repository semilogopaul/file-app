/**
 * Line icons for the feature grid.
 *
 * Drawn on a 24-unit grid with a uniform 1.75 stroke and round caps, so a
 * row of them reads as one set. Sized and coloured by the caller through
 * currentColor.
 */

interface IconProps {
  readonly className?: string;
}

const base = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.75,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
};

/** Direct-to-storage upload: arrow rising into a tray. */
export function UploadIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M12 15V3m0 0L8 7m4-4 4 4" />
      <path d="M4 15v3a3 3 0 0 0 3 3h10a3 3 0 0 0 3-3v-3" />
    </svg>
  );
}

/** Nested folders. */
export function FolderTreeIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M3 7a2 2 0 0 1 2-2h3l2 2h6a2 2 0 0 1 2 2v2" />
      <path d="M3 7v10a2 2 0 0 0 2 2h9" />
      <rect x="14" y="14" width="7" height="6" rx="2" />
    </svg>
  );
}

/** Expiring share link. */
export function ShareIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M10 13a4 4 0 0 0 5.66 0l3-3A4 4 0 0 0 13 4.34l-1.5 1.5" />
      <path d="M14 11a4 4 0 0 0-5.66 0l-3 3A4 4 0 0 0 11 19.66l1.5-1.5" />
    </svg>
  );
}

/** Ownership / access control. */
export function ShieldIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M12 3l7 3v5.5c0 4.3-2.9 8.2-7 9.5-4.1-1.3-7-5.2-7-9.5V6l7-3Z" />
      <path d="m9.5 12 1.8 1.8 3.4-3.6" />
    </svg>
  );
}

/** Instant search. */
export function SearchIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <circle cx="11" cy="11" r="6.5" />
      <path d="m16 16 4 4" />
    </svg>
  );
}

/** Soft delete / restore. */
export function RestoreIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M4 10a8 8 0 1 1 1.4 5.6" />
      <path d="M4 5v5h5" />
    </svg>
  );
}
