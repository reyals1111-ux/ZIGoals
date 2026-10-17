import type {GlyphPaint} from '../orbit-art';
/** Session AE (Part 4, ADR-027 G5): the Life review — a crescent moon over an open magazine, two stars beside it. */
export function ReviewGlyph({line, accent, fill}: GlyphPaint) {
  return <g>
    <path d="M118.5 64A18 18 0 1 0 134.4 89.4 15 15 0 0 1 118.5 64z" fill={fill} stroke={line} strokeWidth="2"/>
    <path d="M90 72.5q0 5 5 5-5 0-5 5 0-5-5-5 5 0 5-5z" className="ha-ink-a" stroke="none"/>
    <circle cx="99" cy="95" r="1.6" className="ha-ink-c" stroke="none"/>
    <path d="M110 122c-10.5-7-25-9-40-6v30c15-3 29.5-1 40 6 10.5-7 25-9 40-6v-30c-15-3-29.5-1-40 6z" fill={fill} stroke={line} strokeWidth="2.1"/>
    <path d="M110 122v29.5" stroke={accent} strokeWidth="1.6"/>
    <path d="M78 125.5c8.5-1.3 16.5-.5 24 2.5M78 133.5c8.5-1.3 16.5-.5 24 2.5M118 128c7.5-3 15.5-3.8 24-2.5M118 136c7.5-3 15.5-3.8 24-2.5" stroke={accent} strokeWidth="1.4" opacity=".75"/>
  </g>;
}
