import type {GlyphPaint} from '../orbit-art';
/** Session AE (Part 4, ADR-027 G5): Create a goal — a target with a plus at its heart and a new spark beside it. */
export function NewGoalGlyph({line, accent, fill}: GlyphPaint) {
  return <g>
    <circle cx="110" cy="112" r="42" stroke={accent} strokeWidth="1.3" opacity=".45"/>
    <circle cx="110" cy="112" r="29" stroke={accent} strokeWidth="1.6" opacity=".72"/>
    <circle cx="110" cy="112" r="16" fill={fill} stroke={line} strokeWidth="2.1"/>
    <path d="M110 104v16M102 112h16" stroke={line} strokeWidth="2.2"/>
    <path d="M146 62c1.2 7.5 3.5 9.8 11 11-7.5 1.2-9.8 3.5-11 11-1.2-7.5-3.5-9.8-11-11 7.5-1.2 9.8-3.5 11-11z" className="ha-ink-a" stroke={accent} strokeWidth="1"/>
    <circle cx="160" cy="90" r="1.8" className="ha-ink-c" stroke="none"/>
  </g>;
}
