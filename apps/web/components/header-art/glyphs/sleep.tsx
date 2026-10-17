import type {GlyphPaint} from '../orbit-art';
/** Session AE (Part 4, ADR-027 G5): Sleep — a crescent moon, two Z's drifting up out of its hollow and a small star. */
export function SleepGlyph({line, accent, fill}: GlyphPaint) {
  return <g>
    <path d="M102.4 80A34 34 0 1 0 136.5 123.9 28 28 0 0 1 102.4 80z" fill={fill} stroke={line} strokeWidth="2.1"/>
    <path d="M89 96c-6 5-9 12-9 20" stroke={line} strokeWidth="1.6" opacity=".7"/>
    <path d="M124 82h13l-13 14h13" stroke={accent} strokeWidth="2"/>
    <path d="M145 64h9l-9 10h9" stroke={accent} strokeWidth="1.7" opacity=".8"/>
    <path d="M74 68q0 5 5 5-5 0-5 5 0-5-5-5 5 0 5-5z" className="ha-ink-a" stroke="none"/>
    <circle cx="150" cy="104" r="1.8" className="ha-ink-c" stroke="none"/>
  </g>;
}
