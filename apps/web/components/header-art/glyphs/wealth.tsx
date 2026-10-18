import type {GlyphPaint} from '../orbit-art';
/** Session AE (Part 4, ADR-027 G5): Wealth — a coin with three rising bars and the trend's arrow, a small coin orbiting it. */
export function WealthGlyph({line, accent, fill}: GlyphPaint) {
  return <g>
    <path d="M57.6 126.1A54 14-14 0 1 162.4 99.9" stroke={accent} strokeWidth="1.4" opacity=".5"/>
    <circle cx="110" cy="110" r="34" fill={fill} stroke={line} strokeWidth="2.1"/>
    <circle cx="110" cy="110" r="27.5" stroke={accent} strokeWidth="1.2" opacity=".55"/>
    <path d="M99 122v-7M110 122v-13M121 122v-21" strokeWidth="5.5"/>
    <path d="M95 106l10-9 6.5 4.5 11.5-12M117 89.5h6v6" stroke={accent} strokeWidth="1.8"/>
    <path d="M162.4 99.9A54 14-14 0 1 57.6 126.1" stroke={accent} strokeWidth="1.4" opacity=".85"/>
    <circle cx="157" cy="108.5" r="5" className="ha-ink-c" stroke="none"/>
    <circle cx="157" cy="108.5" r="8" stroke={accent} strokeWidth="1" opacity=".5"/>
  </g>;
}
