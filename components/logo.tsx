import { useId } from "react";

/** PIC REF mark: an ink tile with a die-cut photo frame. Adapts to light/dark via tokens. */
export function Logo({ className }: { className?: string }) {
  const id = useId();
  // SVG presentation attributes don't support var() — the token colors go through style.
  const ink = { fill: "var(--fg-strong, #0a140a)" };
  const paper = { fill: "var(--bg, #f0f0ec)" };
  const cut = { fill: "none", stroke: "var(--bg, #f0f0ec)" };
  return (
    <svg viewBox="0 0 512 512" className={className} aria-hidden>
      <defs>
        <clipPath id={id}>
          <rect x="140" y="140" width="232" height="232" rx="28" />
        </clipPath>
      </defs>
      <rect width="512" height="512" rx="96" style={ink} />
      <g strokeWidth="30" strokeLinecap="round" strokeLinejoin="round">
        <rect x="140" y="140" width="232" height="232" rx="28" style={cut} />
        <path d="M150 340 L244 246 L300 302 L332 270 L368 306" clipPath={`url(#${id})`} style={cut} />
      </g>
      <circle cx="212" cy="208" r="24" style={paper} />
    </svg>
  );
}
