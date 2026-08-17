/**
 * Spot illustrations for empty and error states.
 *
 * All share the hero's language - 2px strokes, 8px radii, one pink hue over
 * ink neutrals - so a user moving between screens sees one system rather
 * than a pile of unrelated drawings. Every one is decorative; the adjacent
 * heading and action carry the meaning.
 */

interface SpotProps {
  readonly className?: string;
}

const svgProps = {
  viewBox: "0 0 200 160",
  fill: "none",
  role: "presentation" as const,
  "aria-hidden": true,
};

/** Nothing in this folder yet. An open, waiting folder. */
export function EmptyFolderIllustration({ className }: SpotProps) {
  return (
    <svg {...svgProps} className={className}>
      <ellipse cx="100" cy="132" rx="66" ry="14" className="fill-brand-surface-strong" />
      {/* Back panel */}
      <path
        d="M42 52h34l10 12h72a10 10 0 0 1 10 10v46a10 10 0 0 1-10 10H42a10 10 0 0 1-10-10V62a10 10 0 0 1 10-10Z"
        className="fill-surface stroke-border"
        strokeWidth="2"
      />
      {/* Front flap, tilted open */}
      <path
        d="M32 82h136l-12 44a10 10 0 0 1-9.6 7H42a10 10 0 0 1-9.7-7.4L32 82Z"
        className="fill-brand-200"
      />
      {/* Rising placeholder card, hinting at what goes here */}
      <g transform="translate(84 34)">
        <rect
          width="34"
          height="42"
          rx="7"
          className="fill-surface stroke-border"
          strokeWidth="2"
        />
        <rect x="8" y="10" width="18" height="4" rx="2" className="fill-brand-300" />
        <rect x="8" y="20" width="12" height="4" rx="2" className="fill-ink-200" />
      </g>
      <circle cx="150" cy="40" r="4" className="fill-brand-300" />
      <circle cx="46" cy="34" r="3" className="fill-brand-200" />
    </svg>
  );
}

/** No search results. A magnifier over an empty field. */
export function NoResultsIllustration({ className }: SpotProps) {
  return (
    <svg {...svgProps} className={className}>
      <ellipse cx="100" cy="134" rx="58" ry="12" className="fill-brand-surface-strong" />
      <g transform="translate(46 26)">
        <circle
          cx="44"
          cy="44"
          r="40"
          className="fill-surface stroke-border"
          strokeWidth="2"
        />
        <circle cx="44" cy="44" r="28" className="fill-brand-surface" />
        {/* Empty rows inside the lens - the "nothing found" beat */}
        <rect x="28" y="38" width="32" height="5" rx="2.5" className="fill-ink-200" />
        <rect x="34" y="50" width="20" height="5" rx="2.5" className="fill-ink-200" />
        <path
          d="M74 74 96 96"
          className="stroke-brand-500"
          strokeWidth="8"
          strokeLinecap="round"
        />
      </g>
      <circle cx="42" cy="40" r="4" className="fill-brand-300" />
      <circle cx="160" cy="52" r="3" className="fill-brand-200" />
    </svg>
  );
}

/** Upload zone / no files at all. Documents rising into a tray. */
export function UploadIllustration({ className }: SpotProps) {
  return (
    <svg {...svgProps} className={className}>
      <ellipse cx="100" cy="136" rx="62" ry="12" className="fill-brand-surface-strong" />
      <path
        d="M40 96v20a10 10 0 0 0 10 10h100a10 10 0 0 0 10-10V96"
        className="stroke-ink-300"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <g transform="translate(74 20)">
        <rect
          width="52"
          height="66"
          rx="10"
          className="fill-surface stroke-border"
          strokeWidth="2"
        />
        <rect x="12" y="16" width="28" height="5" rx="2.5" className="fill-brand-300" />
        <rect x="12" y="28" width="20" height="5" rx="2.5" className="fill-ink-200" />
      </g>
      {/* Arrow up, the action being invited */}
      <g transform="translate(100 96)">
        <circle r="20" className="fill-brand-600" />
        <path
          d="M0 8V-8m0 0-7 7m7-7 7 7"
          className="stroke-white"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </g>
      <circle cx="52" cy="42" r="4" className="fill-brand-300" />
      <circle cx="150" cy="34" r="3.5" className="fill-brand-200" />
    </svg>
  );
}

/** Something went wrong. A card with a broken corner. */
export function ErrorIllustration({ className }: SpotProps) {
  return (
    <svg {...svgProps} className={className}>
      <ellipse cx="100" cy="134" rx="58" ry="12" className="fill-brand-surface-strong" />
      <g transform="translate(62 26)">
        <path
          d="M0 10A10 10 0 0 1 10 0h34l32 30v56a10 10 0 0 1-10 10H10A10 10 0 0 1 0 86V10Z"
          className="fill-surface stroke-border"
          strokeWidth="2"
        />
        {/* Folded corner */}
        <path d="M44 0l32 30H50a6 6 0 0 1-6-6V0Z" className="fill-brand-200" />
        <path
          d="M38 40v18"
          className="stroke-brand-600"
          strokeWidth="4"
          strokeLinecap="round"
        />
        <circle cx="38" cy="70" r="3" className="fill-brand-600" />
      </g>
      <circle cx="48" cy="44" r="4" className="fill-brand-300" />
      <circle cx="154" cy="60" r="3" className="fill-brand-200" />
    </svg>
  );
}

/** Share link expired or invalid. A broken chain. */
export function BrokenLinkIllustration({ className }: SpotProps) {
  return (
    <svg {...svgProps} className={className}>
      <ellipse cx="100" cy="132" rx="60" ry="12" className="fill-brand-surface-strong" />
      <g
        transform="translate(100 68)"
        className="stroke-brand-500"
        strokeWidth="9"
        strokeLinecap="round"
        fill="none"
      >
        {/* Two link halves, pulled apart */}
        <path d="M-14 -14a20 20 0 0 0-28 28l10 10a20 20 0 0 0 28 0" />
        <path d="M14 14a20 20 0 0 0 28-28l-10-10a20 20 0 0 0-28 0" />
      </g>
      {/* Break marks */}
      <g
        transform="translate(100 68)"
        className="stroke-brand-300"
        strokeWidth="3"
        strokeLinecap="round"
      >
        <path d="M-4 -12 4 -20M-4 12 4 4M-14 2 -22 8" />
      </g>
      <circle cx="46" cy="42" r="4" className="fill-brand-300" />
      <circle cx="156" cy="96" r="3" className="fill-brand-200" />
    </svg>
  );
}
