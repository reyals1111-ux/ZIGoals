import type {GlyphPaint} from '../orbit-art';
/** Session AE (Part 4, ADR-027 G5): Your data — a shield holding three rows of data, each with its own small light. */
export function DataGlyph({line, accent, fill}: GlyphPaint) {
  return <g>
    <path d="M110 66c10 6 22 9 36 10v28c0 24-15 41-36 50-21-9-36-26-36-50V76c14-1 26-4 36-10z" fill={fill} stroke={line} strokeWidth="2.1"/>
    <path d="M110 75c8 4.5 17.5 7 28 8v21c0 19-11.5 32.5-28 40" stroke={accent} strokeWidth="1.2" opacity=".45"/>
    <path d="M100 97h26M100 111h20M100 125h24" stroke={accent} strokeWidth="2"/>
    <circle cx="92" cy="97" r="2.8" className="ha-ink-a" stroke="none"/>
    <circle cx="92" cy="111" r="2.8" className="ha-ink-b" stroke="none"/>
    <circle cx="92" cy="125" r="2.8" className="ha-ink-c" stroke="none"/>
  </g>;
}
