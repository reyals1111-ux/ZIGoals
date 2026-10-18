import type {GlyphPaint} from '../orbit-art';
/** Session AE (Part 4, ADR-027 G5): Meditation — a small lotus with three slow breaths rising from it as arcs. */
export function MeditationGlyph({line, accent, fill}: GlyphPaint) {
  return <g>
    <path d="M64 114a46 46 0 0 1 92 0" stroke={accent} strokeWidth="1.3" opacity=".32"/>
    <path d="M76 114a34 34 0 0 1 68 0" stroke={accent} strokeWidth="1.5" opacity=".58"/>
    <path d="M88 114a22 22 0 0 1 44 0" stroke={accent} strokeWidth="1.8" opacity=".88"/>
    <circle cx="110" cy="99" r="3.2" className="ha-ink-a" stroke="none"/>
    <path d="M110 112c6.5 6 9.5 12.5 9.5 19 0 6-3.5 10.5-9.5 13.5-6-3-9.5-7.5-9.5-13.5 0-6.5 3-13 9.5-19z" fill={fill} stroke={line} strokeWidth="2.1"/>
    <path d="M104 145c-11-1.5-19-8.5-21-21 9 1 16 5.5 19.5 12M116 145c11-1.5 19-8.5 21-21-9 1-16 5.5-19.5 12" strokeWidth="1.9"/>
    <path d="M80 152c20 3 40 3 60 0" stroke={accent} strokeWidth="1.5" opacity=".7"/>
  </g>;
}
