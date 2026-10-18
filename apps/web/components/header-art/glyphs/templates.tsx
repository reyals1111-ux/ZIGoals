import type {GlyphPaint} from '../orbit-art';
/** Session AE (Part 4, ADR-027 G5): Goal templates — a small stack of plan cards, the front one a blueprint with its star. */
export function TemplatesGlyph({line, accent, fill}: GlyphPaint) {
  return <g>
    <rect x="80" y="72" width="52" height="66" rx="7" transform="rotate(-14 106 105)" stroke={accent} strokeWidth="1.4" opacity=".45"/>
    <rect x="84" y="75" width="52" height="66" rx="7" transform="rotate(-6 110 108)" stroke={accent} strokeWidth="1.6" opacity=".7"/>
    <rect x="88" y="78" width="52" height="66" rx="7" fill={fill} stroke={line} strokeWidth="2.1"/>
    <path d="M97 127h34M97 135h22" stroke={accent} strokeWidth="1.6" opacity=".8"/>
    <path d="M114 88c1.6 9.4 3.6 11.4 13 13-9.4 1.6-11.4 3.6-13 13-1.6-9.4-3.6-11.4-13-13 9.4-1.6 11.4-3.6 13-13z" className="ha-ink-a" stroke={accent} strokeWidth="1"/>
  </g>;
}
