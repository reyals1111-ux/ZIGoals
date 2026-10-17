import type {GlyphPaint} from '../orbit-art';
/** Session AE (Part 4, ADR-027 G5): Meet ZIGi — a bright nebula sparkle with a small companion star and a dotted path between
 * them (a star, never ZIGi's own figure). */
export function ZigiGlyph({line, accent, fill}: GlyphPaint) {
  return <g>
    <path d="M150 97c2 31-24 55-62 53" stroke={accent} strokeWidth="1.6" strokeDasharray="1 6" opacity=".8"/>
    <path d="M104 76c3 22 9 30 35 34-26 4-32 12-35 34-3-22-9-30-35-34 26-4 32-12 35-34z" fill={fill} stroke={line} strokeWidth="2.1"/>
    <path d="M104 96c1 7 3 10 11 12-8 2-10 5-11 12-1-7-3-10-11-12 8-2 10-5 11-12z" className="ha-ink-a" stroke="none"/>
    <path d="M144 66c.9 6.2 2.8 8.1 9 9-6.2.9-8.1 2.8-9 9-.9-6.2-2.8-8.1-9-9 6.2-.9 8.1-2.8 9-9z" className="ha-ink-b" stroke={accent} strokeWidth="1"/>
    <path d="M80 148c.5 3.5 1.5 4.5 5 5-3.5.5-4.5 1.5-5 5-.5-3.5-1.5-4.5-5-5 3.5-.5 4.5-1.5 5-5z" className="ha-ink-c" stroke="none"/>
  </g>;
}
