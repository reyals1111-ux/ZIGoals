import type {GlyphPaint} from '../orbit-art';
/** Session AE (Part 4, ADR-027 G5): Shared with ZIGoals — three linked planets, the sender with its own small orbit. */
export function ShareGlyph({line, accent, fill}: GlyphPaint) {
  return <g>
    <path d="M91 106.5 127 87.5M91 117.5l36 19" stroke={accent} strokeWidth="1.9"/>
    <path d="M140 94c6 10 6 23 0 33" stroke={accent} strokeWidth="1.3" strokeDasharray="1 5" opacity=".8"/>
    <circle cx="82" cy="112" r="11" fill={fill} stroke={line} strokeWidth="2.1"/>
    <path d="M64 119.5c-1.5-4 6.5-11 18-15.5s21-5.5 22.5-1.5" stroke={accent} strokeWidth="1.3" opacity=".55"/>
    <path d="M104.5 102.5c1.5 4-6.5 11-18 15.5s-21 5.5-22.5 1.5" stroke={accent} strokeWidth="1.3"/>
    <circle cx="135" cy="83" r="8.5" fill={fill} stroke={line} strokeWidth="2"/>
    <circle cx="135" cy="141" r="8.5" fill={fill} stroke={line} strokeWidth="2"/>
    <circle cx="135" cy="83" r="2.4" className="ha-ink-a" stroke="none"/>
    <circle cx="135" cy="141" r="2.4" className="ha-ink-c" stroke="none"/>
  </g>;
}
