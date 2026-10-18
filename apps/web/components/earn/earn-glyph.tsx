import {useId} from 'react';
import type {GlyphPaint} from '../header-art/orbit-art';

/**
 * Session AF (L1): Earn's header-art glyph — a coin with a rising sprout of rewards inside a tilted orbit, a small reward
 * planet riding the ring in front (drawn in the 220 box around (110, 110), as every OrbitArt glyph is). `EarnGlyphMark`
 * is the same mark on its own for the native-staking medallion; both are decorative.
 */
export function EarnGlyph({line, accent, fill}: GlyphPaint) {
  return <g>
    <path d="M56.4 124.6A55 15-13 0 1 163.6 95.4" stroke={accent} strokeWidth="1.4" opacity=".45"/>
    <circle cx="110" cy="112" r="33" fill={fill} stroke={line} strokeWidth="2.1"/>
    <circle cx="110" cy="112" r="26" stroke={accent} strokeWidth="1.2" opacity=".55"/>
    <path d="M110 128v-22" strokeWidth="2.4"/>
    <path d="M110 112c-9 0-14-6-14-14 8 0 14 5 14 14zM110 106c8 0 13-5 13-12-7 0-13 4-13 12z" fill={fill} stroke={line} strokeWidth="1.8"/>
    <path d="M99 128h22" stroke={accent} strokeWidth="1.8"/>
    <path d="M163.6 95.4A55 15-13 0 1 56.4 124.6" stroke={accent} strokeWidth="1.4" opacity=".85"/>
    <circle cx="151" cy="117.5" r="5" className="ha-ink-c" stroke="none"/>
    <circle cx="151" cy="117.5" r="8.5" stroke={accent} strokeWidth="1" opacity=".5"/>
  </g>;
}
export function EarnGlyphMark() {
  const id = `eg${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  return <svg className="earn-glyph-mark" viewBox="60 60 100 100" width="56" height="56" aria-hidden="true" focusable="false">
    <defs><linearGradient id={`${id}-l`} x1="70" y1="62" x2="152" y2="160" gradientUnits="userSpaceOnUse"><stop offset="0" stopColor="var(--accent-cyan)"/><stop offset="1" stopColor="var(--accent-violet)"/></linearGradient></defs>
    <g fill="none" stroke={`url(#${id}-l)`} strokeLinecap="round" strokeLinejoin="round">
      <EarnGlyph line={`url(#${id}-l)`} accent="var(--accent-teal)" fill="none"/>
    </g>
  </svg>;
}
