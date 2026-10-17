import type {GlyphPaint} from '../orbit-art';
/** Session AE (Part 4, ADR-027 G5): Goals — a lotus opening in the middle of a target (the pillar's mark, aimed). */
export function GoalsGlyph({line, accent, fill}: GlyphPaint) {
  return <g>
    <circle cx="110" cy="110" r="47" stroke={accent} strokeWidth="1.4" opacity=".7"/>
    <circle cx="110" cy="110" r="36" stroke={accent} strokeWidth="1.2" opacity=".32" strokeDasharray="2 5"/>
    <path d="M110 57v8M110 155v8M57 110h8M155 110h8" stroke={accent} strokeWidth="1.6" opacity=".8"/>
    <path d="M110 80c9.5 8.5 14 19 14 30.5 0 9.5-5 17-14 22.5-9-5.5-14-13-14-22.5C96 99 100.5 88.5 110 80z" fill={fill} stroke={line} strokeWidth="2.1"/>
    <path d="M106.5 132c-12.5-2-22-11.5-24-30 11 1.5 19.5 8 23.5 17M113.5 132c12.5-2 22-11.5 24-30-11 1.5-19.5 8-23.5 17"/>
    <path d="M104 134.5c-14 3.5-28-1.5-36.5-13 11-3 22.5-.5 31 6.5M116 134.5c14 3.5 28-1.5 36.5-13-11-3-22.5-.5-31 6.5" strokeWidth="1.8"/>
    <path d="M84 142c17 4.5 35 4.5 52 0" stroke={accent} strokeWidth="1.5" opacity=".75"/>
    <circle cx="110" cy="101" r="2.4" className="ha-ink-a" stroke="none"/>
  </g>;
}
