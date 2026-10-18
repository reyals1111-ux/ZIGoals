import type {GlyphPaint} from '../orbit-art';
/** Session AE (Part 4, ADR-027 G5): Chess — a knight in profile on its base, its eye a small star. */
export function ChessGlyph({line, accent, fill}: GlyphPaint) {
  return <g>
    <path d="M88 138C90 126 98 118 102 108 96 112 88 114 80 111 76 109 74 104 77 100L92 82C98 75 104 71 111 70L116 61 120 71C133 77 140 92 139 110 138 122 136 130 134 138z" fill={fill} stroke={line} strokeWidth="2.1"/>
    <path d="M121 78c8 6 12 15 12.5 26M126 92l5-3M128.5 103l5-1.5" stroke={accent} strokeWidth="1.5" opacity=".75"/>
    <circle cx="100" cy="86" r="2.6" className="ha-ink-a" stroke="none"/>
    <path d="M84 138h52l4 10H80z" fill={fill} stroke={line} strokeWidth="2"/>
    <path d="M74 152h72" stroke={accent} strokeWidth="1.8"/>
  </g>;
}
