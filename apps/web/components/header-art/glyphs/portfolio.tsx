import type {GlyphPaint} from '../orbit-art';
/** Session AE (Part 4, ADR-027 G5): Portfolio — a pie with one slice drawn out, held in a tilted orbit with a small planet. */
export function PortfolioGlyph({line, accent, fill}: GlyphPaint) {
  return <g>
    <path d="M61.1 127.8A52 14-20 0 1 158.9 92.2" stroke={accent} strokeWidth="1.4" opacity=".45"/>
    <path d="M106 114V84A30 30 0 1 0 136 114z" fill={fill} stroke={line} strokeWidth="2.1"/>
    <path d="M106 114 84.8 135.2" stroke={line} strokeWidth="1.7"/>
    <path d="M112 108V78a30 30 0 0 1 30 30z" fill={fill} stroke={accent} strokeWidth="2"/>
    <path d="M158.9 92.2A52 14-20 0 1 61.1 127.8" stroke={accent} strokeWidth="1.4" opacity=".85"/>
    <circle cx="148" cy="106.7" r="4.6" className="ha-ink-b" stroke="none"/>
  </g>;
}
