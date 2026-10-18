import type {GlyphPaint} from '../orbit-art';
/** Session AE (Part 4, ADR-027 G5): Devices — a watch and a phone joined by one pulse. */
export function DevicesGlyph({line, accent, fill}: GlyphPaint) {
  return <g>
    <path d="M69 94V82h18v12M69 126v12h18v-12" stroke={accent} strokeWidth="1.6" opacity=".7"/>
    <rect x="64" y="94" width="28" height="32" rx="8" fill={fill} stroke={line} strokeWidth="2.1"/>
    <circle cx="78" cy="110" r="7.5" stroke={accent} strokeWidth="1.3" opacity=".7"/>
    <circle cx="78" cy="110" r="2.6" className="ha-ink-a" stroke="none"/>
    <rect x="128" y="80" width="28" height="58" rx="6" fill={fill} stroke={line} strokeWidth="2.1"/>
    <path d="M138 87h8" stroke={accent} strokeWidth="1.4" opacity=".75"/>
    <path d="M135 120v-6M142 120v-12M149 120v-8" stroke={accent} strokeWidth="2"/>
    <circle cx="142" cy="130" r="1.8" className="ha-ink-c" stroke="none"/>
    <path d="M92 110h7l4-9 6 18 5-14 3 5h11" stroke={accent} strokeWidth="2.1"/>
  </g>;
}
