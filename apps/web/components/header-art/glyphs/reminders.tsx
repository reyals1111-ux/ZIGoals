import type {GlyphPaint} from '../orbit-art';
/** Session AE (Part 4, ADR-027 G5): Reminders — a bell with soft rings on either side, a small star where it chimes. */
export function RemindersGlyph({line, accent, fill}: GlyphPaint) {
  return <g>
    <path d="M73 94c-5 9-5 21 0 30M147 94c5 9 5 21 0 30" stroke={accent} strokeWidth="1.7" opacity=".8"/>
    <path d="M63 88c-8 13-8 29 0 42M157 88c8 13 8 29 0 42" stroke={accent} strokeWidth="1.4" opacity=".45"/>
    <path d="M110 75c-14.5 0-24 10.5-24 25v15l-8 12.5h64l-8-12.5v-15c0-14.5-9.5-25-24-25z" fill={fill} stroke={line} strokeWidth="2.1"/>
    <path d="M97 86c-3.5 3-5 7-5 12" stroke={line} strokeWidth="1.6" opacity=".7"/>
    <circle cx="110" cy="71" r="3.6" strokeWidth="1.8"/>
    <path d="M102 132.5a8 8 0 0 0 16 0" stroke={accent} strokeWidth="2"/>
    <path d="M138 66q0 5 5 5-5 0-5 5 0-5-5-5 5 0 5-5z" className="ha-ink-a" stroke="none"/>
  </g>;
}
