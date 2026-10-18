import type {GlyphPaint} from '../orbit-art';
/** Session AE (Part 4, ADR-027 G5): Staking — a cube held in a tilted orbit, a small reward planet riding the ring in front. */
export function StakingGlyph({line, accent, fill}: GlyphPaint) {
  return <g>
    <path d="M57.2 121.2A54 15-12 0 1 162.8 98.8" stroke={accent} strokeWidth="1.4" opacity=".45"/>
    <path d="M110 76 138 92v33l-28 16-28-16V92z" fill={fill} stroke={line} strokeWidth="2.1"/>
    <path d="M82 92l28 16 28-16M110 108v33" stroke={line} strokeWidth="1.8"/>
    <path d="M96 84l28 16" stroke={accent} strokeWidth="1.2" opacity=".5"/>
    <path d="M162.8 98.8A54 15-12 0 1 57.2 121.2" stroke={accent} strokeWidth="1.4" opacity=".85"/>
    <circle cx="146.3" cy="114" r="5" className="ha-ink-c" stroke="none"/>
    <circle cx="146.3" cy="114" r="8.5" stroke={accent} strokeWidth="1" opacity=".5"/>
  </g>;
}
