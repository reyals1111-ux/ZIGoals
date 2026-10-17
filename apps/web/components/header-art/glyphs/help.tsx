import type {GlyphPaint} from '../orbit-art';
const STARS = [[90, 93, 2.2], [95, 75, 2.6], [111, 66, 3.2], [128, 73, 2.4], [132, 90, 2.8], [122, 103, 2.2], [111, 113, 2.6], [110, 127, 2.2]] as const;
/** Session AE (Part 4, ADR-027 G5): Help — a question mark drawn as a constellation, its dot the brightest star. */
export function HelpGlyph({accent}: GlyphPaint) {
  return <g>
    <path d={`M${STARS.map(([x, y]) => `${x} ${y}`).join('L')}`} stroke={accent} strokeWidth="1.4" opacity=".7"/>
    {STARS.map(([x, y, r]) => <circle key={`${x}-${y}`} cx={x} cy={y} r={r} className="ha-ink-a" stroke="none"/>)}
    <path d="M111 66v-6M111 66v6M111 66h-6M111 66h6" strokeWidth="1.4"/>
    <path d="M110 133c1.2 7.5 3.5 9.8 11 11-7.5 1.2-9.8 3.5-11 11-1.2-7.5-3.5-9.8-11-11 7.5-1.2 9.8-3.5 11-11z" className="ha-ink-a" strokeWidth="1.4"/>
  </g>;
}
