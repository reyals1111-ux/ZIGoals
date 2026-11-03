import type {GlyphPaint} from '../header-art/orbit-art';
/** Session AK (T1): the Tasks page's header mark — a note card with two lines ticked and one to go, a star where it ends. */
export function TasksGlyph({line, accent, fill}: GlyphPaint) {
  return <g>
    <rect x="80" y="70" width="60" height="78" rx="10" fill={fill} stroke={line} strokeWidth="2.1"/>
    <path d="M90 90l4 4 7-8M90 110l4 4 7-8" stroke={accent} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M108 91h22M108 111h22M108 131h16" stroke={line} strokeWidth="1.8" strokeLinecap="round" opacity=".8"/>
    <circle cx="95" cy="130" r="4.5" stroke={line} strokeWidth="1.7"/>
    <path d="M150 64q0 5 5 5-5 0-5 5 0-5-5-5 5 0 5-5z" className="ha-ink-a" stroke="none"/>
  </g>;
}
