import {useId} from 'react';

/** The streak's flame (P7.9): lit in the nebula's warm colours once today is complete, a quiet outline before. */
export function FlameMark({lit}: {lit: boolean}) {
  const id = useId().replace(/[^a-zA-Z0-9]/g, '');
  return <svg className="checklist-flame" viewBox="0 0 24 24" width="28" height="28" aria-hidden="true" focusable="false">
    <defs><linearGradient id={`flame-${id}`} x1="0" y1="1" x2="0" y2="0"><stop offset="0" stopColor="#ff74be"/><stop offset=".55" stopColor="#ffad87"/><stop offset="1" stopColor="#ffd27a"/></linearGradient></defs>
    <path d="M12 21.5c-4.1 0-7-2.9-7-6.6 0-3.3 2.2-5.4 3.9-7.3.4 1.6 1.3 2.7 2.3 3.2-.4-3.2 1-6.4 3.6-8.3-.2 2.9 1.2 4.6 2.8 6.4 1.4 1.6 2.4 3.4 2.4 5.8 0 3.9-3.3 6.8-8 6.8" fill={lit ? `url(#flame-${id})` : 'none'} stroke={lit ? 'none' : 'currentColor'} strokeWidth="1.6" strokeLinejoin="round"/>
    {lit && <path d="M12 21c-1.9 0-3.2-1.3-3.2-3 0-1.6 1.1-2.6 2.1-3.6.2 1 .8 1.6 1.4 1.8-.1-1.2.4-2.3 1.4-3.1.1 1.3.7 2.2 1.3 3 .5.7.9 1.4.9 2.2 0 1.6-1.6 2.7-3.9 2.7" fill="#fff6e8" opacity=".85"/>}
  </svg>;
}

/**
 * The Checklist's mark (P7.19): a rounded square holding three dots on a path and a check, in the music note's nebula
 * gradient (#63e7ff → #826cff → #c664ff → #ff74be). `draw` marks the check that draws once on the first view in a visit.
 */
export function ChecklistMark({size = 30, draw = false}: {size?: number; draw?: boolean}) {
  const id = useId().replace(/[^a-zA-Z0-9]/g, '');
  return <svg className="checklist-mark" data-draw={draw || undefined} viewBox="0 0 32 32" width={size} height={size} aria-hidden="true" focusable="false">
    <defs><linearGradient id={`ck-${id}`} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#63e7ff"/><stop offset=".38" stopColor="#826cff"/><stop offset=".7" stopColor="#c664ff"/><stop offset="1" stopColor="#ff74be"/></linearGradient></defs>
    <rect x="3.5" y="3.5" width="25" height="25" rx="8" fill="none" stroke={`url(#ck-${id})`} strokeWidth="2.2"/>
    <circle cx="10" cy="11" r="2.2" fill={`url(#ck-${id})`}/><circle cx="10" cy="21" r="2.2" fill={`url(#ck-${id})`} opacity=".7"/>
    <path d="M10 13.4v5.2" stroke={`url(#ck-${id})`} strokeWidth="1.4" strokeLinecap="round" opacity=".6"/>
    <path className="checklist-mark-check" d="m15.2 16.4 3.3 3.3 6.3-7.2" fill="none" stroke={`url(#ck-${id})`} strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" pathLength={1}/>
  </svg>;
}
