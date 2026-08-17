/**
 * Landing hero: documents arcing into a storage vault.
 *
 * Shared language across every illustration in the app - 8px corner radii,
 * 2px strokes, one pink hue plus ink neutrals, and depth built from
 * overlapping flat shapes rather than gradients or drop shadows. Decorative,
 * so it is hidden from assistive tech; the headline beside it carries the
 * meaning.
 */
export function HeroIllustration({ className }: { readonly className?: string }) {
  return (
    <svg
      viewBox="0 0 480 380"
      fill="none"
      className={className}
      role="presentation"
      aria-hidden="true"
    >
      {/* Soft field behind the composition, giving the scene a centre of
          gravity without a drop shadow. */}
      <ellipse cx="240" cy="300" rx="180" ry="46" className="fill-brand-100/70" />
      <circle cx="240" cy="176" r="132" className="fill-brand-50" />

      {/* Orbit arc - dashed so it reads as motion rather than structure. */}
      <ellipse
        cx="240"
        cy="176"
        rx="176"
        ry="92"
        className="stroke-brand-200"
        strokeWidth="2"
        strokeDasharray="6 10"
        strokeLinecap="round"
      />

      {/* Documents in flight, rotated along the arc. */}
      <g transform="translate(52 118) rotate(-14)">
        <Doc accent="fill-brand-300" />
      </g>
      <g transform="translate(372 96) rotate(12)">
        <Doc accent="fill-brand-200" />
      </g>

      {/* The vault: a rounded container with a lifted lid. */}
      <g transform="translate(148 132)">
        <rect
          x="0"
          y="26"
          width="184"
          height="132"
          rx="20"
          className="fill-surface stroke-ink-200"
          strokeWidth="2"
        />
        {/* Lid, offset to suggest it is open. */}
        <rect
          x="10"
          y="0"
          width="164"
          height="42"
          rx="16"
          className="fill-brand-500"
        />
        <rect x="72" y="14" width="40" height="7" rx="3.5" className="fill-white/70" />

        {/* Contents: file rows. Varying widths so it reads as real content
            rather than a placeholder pattern. */}
        <g transform="translate(26 62)">
          <Row width={132} />
          <g transform="translate(0 26)">
            <Row width={104} />
          </g>
          <g transform="translate(0 52)">
            <Row width={118} />
          </g>
        </g>
      </g>

      {/* Padlock badge - the one place a second shape language is allowed,
          because security is the message the hero is making. */}
      <g transform="translate(300 226)">
        <circle r="28" className="fill-brand-600" />
        <path
          d="M-9 -2v-6a9 9 0 0 1 18 0v6"
          className="stroke-white"
          strokeWidth="3.5"
          strokeLinecap="round"
        />
        <rect x="-13" y="-2" width="26" height="20" rx="6" className="fill-white" />
      </g>

      {/* Scattered accents, sized down as they move outward. */}
      <circle cx="92" cy="252" r="7" className="fill-brand-400" />
      <circle cx="404" cy="212" r="5" className="fill-brand-300" />
      <circle cx="136" cy="70" r="4" className="fill-brand-400" />
      <circle cx="356" cy="286" r="3.5" className="fill-brand-200" />
    </svg>
  );
}

/** A single document card, reused at both ends of the arc. */
function Doc({ accent }: { readonly accent: string }) {
  return (
    <g>
      <rect
        width="64"
        height="82"
        rx="10"
        className="fill-surface stroke-ink-200"
        strokeWidth="2"
      />
      <rect x="12" y="16" width="40" height="6" rx="3" className={accent} />
      <rect x="12" y="30" width="28" height="6" rx="3" className="fill-ink-200" />
      <rect x="12" y="44" width="34" height="6" rx="3" className="fill-ink-200" />
    </g>
  );
}

function Row({ width }: { readonly width: number }) {
  return (
    <g>
      <rect width="14" height="14" rx="4" className="fill-brand-200" />
      <rect
        x="24"
        y="4"
        width={width}
        height="7"
        rx="3.5"
        className="fill-ink-200"
      />
    </g>
  );
}
