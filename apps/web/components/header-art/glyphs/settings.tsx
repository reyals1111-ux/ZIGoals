import type {GlyphPaint} from '../orbit-art';
// Eight rounded teeth on a 28.5 root and a 36 tip, the first at the top.
const GEAR = 'M103.1 82.3L104.4 74.4A36 36 0 0 1 115.6 74.4L116.9 82.3A28.5 28.5 0 0 1 124.7 85.6L131.2 80.9A36 36 0 0 1 139.1 88.8L134.4 95.3A28.5 28.5 0 0 1 137.7 103.1L145.6 104.4A36 36 0 0 1 145.6 115.6L137.7 116.9A28.5 28.5 0 0 1 134.4 124.7L139.1 131.2A36 36 0 0 1 131.2 139.1L124.7 134.4A28.5 28.5 0 0 1 116.9 137.7L115.6 145.6A36 36 0 0 1 104.4 145.6L103.1 137.7A28.5 28.5 0 0 1 95.3 134.4L88.8 139.1A36 36 0 0 1 80.9 131.2L85.6 124.7A28.5 28.5 0 0 1 82.3 116.9L74.4 115.6A36 36 0 0 1 74.4 104.4L82.3 103.1A28.5 28.5 0 0 1 85.6 95.3L80.9 88.8A36 36 0 0 1 88.8 80.9L95.3 85.6A28.5 28.5 0 0 1 103.1 82.3Z';
/** Session AE (Part 4, ADR-027 G5): Settings — a gear with its own small orbit, a planet riding the ring in front of it. */
export function SettingsGlyph({line, accent, fill}: GlyphPaint) {
  return <g>
    <path d="M56.2 94.6A56 15 16 0 1 163.8 125.4" stroke={accent} strokeWidth="1.4" opacity=".45"/>
    <path d={GEAR} fill={fill} stroke={line} strokeWidth="2.1"/>
    <circle cx="110" cy="110" r="13" stroke={accent} strokeWidth="1.8"/>
    <circle cx="110" cy="110" r="4" className="ha-ink-a" stroke="none"/>
    <path d="M163.8 125.4A56 15 16 0 1 56.2 94.6" stroke={accent} strokeWidth="1.4" opacity=".85"/>
    <circle cx="148.6" cy="131.1" r="4.6" className="ha-ink-b" stroke="none"/>
  </g>;
}
