import type {GlyphPaint} from '../orbit-art';
/** Session AE (Part 4, ADR-027 G5): the Journey — a rocket climbing to the upper right, its flame and a short wake of sparks. */
export function JourneyGlyph({line, accent, fill}: GlyphPaint) {
  return <g transform="rotate(40 110 110)">
    <path d="M110 64c12 9.5 18.5 25 18.5 42v18.5c0 2.5-2 4.5-4.5 4.5h-28c-2.5 0-4.5-2-4.5-4.5V106c0-17 6.5-32.5 18.5-42z" fill={fill} stroke={line} strokeWidth="2.1"/>
    <path d="M97 85.5c8.5 3 17.5 3 26 0" stroke={accent} strokeWidth="1.5" opacity=".8"/>
    <circle cx="110" cy="103" r="7.5" stroke={accent} strokeWidth="1.8"/>
    <circle cx="107.5" cy="100.5" r="1.8" className="ha-ink-a" stroke="none"/>
    <path d="M91.5 111.5 79.8 125c-1.5 1.8-.3 4.5 2.1 4.5h9.6M128.5 111.5l11.7 13.5c1.5 1.8.3 4.5-2.1 4.5h-9.6" strokeWidth="1.9"/>
    <path d="M102 129v4.5h16V129" strokeWidth="1.6"/>
    <path d="M101.5 139c0 8.5 3.8 15 8.5 21.5 4.7-6.5 8.5-13 8.5-21.5" stroke={accent} strokeWidth="1.9"/>
    <path d="M106.5 139.5c0 4.5 1.6 7.8 3.5 10.5 1.9-2.7 3.5-6 3.5-10.5" strokeWidth="1.5"/>
    <path d="M97 146v9M123 146v7" stroke={accent} strokeWidth="1.4" opacity=".5"/>
    <circle cx="110" cy="170" r="1.9" className="ha-ink-a" stroke="none" opacity=".85"/>
    <circle cx="104.5" cy="178" r="1.3" className="ha-ink-c" stroke="none" opacity=".7"/>
  </g>;
}
