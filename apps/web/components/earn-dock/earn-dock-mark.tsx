'use client';
import {useId} from 'react';

/**
 * Session AF chunk 2 (Part 5): the Earn dock's mark, drawn in the nebula colours of ZIGi's and the music button's marks:
 * a coin seen at an angle with a rising spark — "your money at work". Still; no motion of its own.
 */
export function EarnDockMark({size}: {size?: number}) {
  const id = `edm${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  return <svg className="earn-dock-mark" viewBox="0 0 32 32" width={size} height={size} aria-hidden="true" focusable="false">
    <defs><linearGradient id={id} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#ffd27a"/><stop offset=".55" stopColor="#c664ff"/><stop offset="1" stopColor="#63e7ff"/></linearGradient></defs>
    <ellipse cx="14" cy="19" rx="9.5" ry="7" fill="none" stroke={`url(#${id})`} strokeWidth="2.4"/>
    <path d="M9.5 19.2c1.4 1.6 3.1 2.4 4.5 2.4s3.1-.8 4.5-2.4" fill="none" stroke={`url(#${id})`} strokeWidth="1.8" strokeLinecap="round"/>
    <path d="M22 4.5l1.3 3 3 1.3-3 1.3-1.3 3-1.3-3-3-1.3 3-1.3z" fill={`url(#${id})`}/>
  </svg>;
}
