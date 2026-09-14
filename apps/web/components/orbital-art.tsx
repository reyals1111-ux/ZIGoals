import { useId } from "react";

/** Decorative brand art, kept separate from Goal data and progress calculations. */
export function OrbitalArt({ className = "" }: { className?: string }) {
  const id = useId();
  return (
    <svg className={`orbital-art ${className}`} viewBox="0 0 480 240" fill="none" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id={`${id}-spectrum`} x1="170" y1="70" x2="310" y2="170" gradientUnits="userSpaceOnUse">
          <stop stopColor="var(--brand-cyan)" />
          <stop offset=".36" stopColor="var(--brand-blue)" />
          <stop offset=".68" stopColor="var(--brand-violet)" />
          <stop offset="1" stopColor="var(--brand-magenta)" />
        </linearGradient>
        <radialGradient id={`${id}-glow`}>
          <stop stopColor="var(--brand-blue)" stopOpacity=".16" />
          <stop offset="1" stopColor="var(--brand-violet)" stopOpacity="0" />
        </radialGradient>
      </defs>
      <ellipse cx="240" cy="120" rx="230" ry="118" fill={`url(#${id}-glow)`} />
      <g stroke={`url(#${id}-spectrum)`} strokeOpacity=".2">
        <ellipse cx="240" cy="120" rx="215" ry="55" transform="rotate(-12 240 120)" />
        <ellipse cx="240" cy="120" rx="170" ry="92" transform="rotate(16 240 120)" />
        <circle cx="240" cy="120" r="92" strokeDasharray="2 7" />
        <circle cx="240" cy="120" r="58" />
      </g>
      <circle cx="240" cy="120" r="73" stroke={`url(#${id}-spectrum)`} strokeWidth="15" opacity=".06" />
      <circle className="orbital-art-ring" cx="240" cy="120" r="73" stroke={`url(#${id}-spectrum)`} strokeWidth="4" />
      <path d="M240 94L246 114L266 120L246 126L240 146L234 126L214 120L234 114Z" fill={`url(#${id}-spectrum)`} />
      <g fill="var(--brand-cyan)"><circle cx="87" cy="158" r="3" /><circle cx="185" cy="38" r="2" /><circle cx="44" cy="79" r="1.5" /></g>
      <g fill="var(--brand-violet)"><circle cx="383" cy="57" r="3" /><circle cx="152" cy="202" r="1.5" /></g>
      <g fill="var(--brand-magenta)"><circle cx="415" cy="151" r="2" /><circle cx="312" cy="184" r="3" /><circle cx="359" cy="216" r="1" /></g>
    </svg>
  );
}
