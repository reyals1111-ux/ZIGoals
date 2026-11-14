import type {ReactElement} from 'react';

/**
 * Session AK (owner follow-up 2, N2; lane NA): NOVA's line icons, drawn by hand on a 24 grid with a 1.8 stroke and round
 * ends, like the theme bar's sun and moon. Decorative: every control that shows one also has its name in words.
 */
const P = {fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round'} as const;
const ICONS: Record<string, () => ReactElement> = {
  exit: () => <g {...P}><path d="M14 4h4.5A1.5 1.5 0 0 1 20 5.5v13a1.5 1.5 0 0 1-1.5 1.5H14"/><path d="M10 8l-4 4 4 4M6 12h10"/></g>,
  widgets: () => <g {...P}><rect x="4" y="4" width="7" height="7" rx="2"/><rect x="13" y="4" width="7" height="4.5" rx="2"/><rect x="13" y="10.5" width="7" height="9.5" rx="2"/><rect x="4" y="13" width="7" height="7" rx="2"/></g>,
  arrange: () => <g {...P}><path d="M12 3v18M3 12h18"/><path d="M9.5 5.5 12 3l2.5 2.5M9.5 18.5 12 21l2.5-2.5M5.5 9.5 3 12l2.5 2.5M18.5 9.5 21 12l-2.5 2.5"/></g>,
  yours: () => <g {...P}><circle cx="12" cy="12" r="3.2"/><path d="M12 3.5v2.2M12 18.3v2.2M3.5 12h2.2M18.3 12h2.2M6 6l1.6 1.6M16.4 16.4 18 18M6 18l1.6-1.6M16.4 7.6 18 6"/></g>,
  mini: () => <g {...P}><rect x="3" y="5" width="18" height="14" rx="2.5"/><rect x="12" y="11" width="7" height="6" rx="1.5"/></g>,
  plus: () => <g {...P}><path d="M12 5v14M5 12h14"/></g>,
  close: () => <g {...P}><path d="M6 6l12 12M18 6 6 18"/></g>,
  left: () => <g {...P}><path d="m14.5 6-6 6 6 6"/></g>,
  right: () => <g {...P}><path d="m9.5 6 6 6-6 6"/></g>,
  up: () => <g {...P}><path d="m6 14.5 6-6 6 6"/></g>,
  down: () => <g {...P}><path d="m6 9.5 6 6 6-6"/></g>,
  grip: () => <g fill="currentColor"><circle cx="9" cy="7" r="1.4"/><circle cx="15" cy="7" r="1.4"/><circle cx="9" cy="12" r="1.4"/><circle cx="15" cy="12" r="1.4"/><circle cx="9" cy="17" r="1.4"/><circle cx="15" cy="17" r="1.4"/></g>,
  star: () => <path d="M12 3c.7 5 3.4 7.6 8.5 8.5-5.1.9-7.8 3.5-8.5 8.5-.7-5-3.4-7.6-8.5-8.5C8.6 10.6 11.3 8 12 3Z" fill="currentColor"/>,
  zigi: () => <g {...P}><path d="M5 7.5 7 5h11L6 17l2 2h7.5q3.5 0 3.5-3.5V13.5h-4"/></g>,
  checklist: () => <g {...P}><circle cx="12" cy="12" r="8.5" strokeDasharray="2 2.6"/><path d="m8.5 12.2 2.4 2.4 4.6-4.9"/></g>,
  music: () => <g {...P}><path d="M9 17.5V6.5l10-2v11"/><circle cx="6.5" cy="17.5" r="2.5"/><circle cx="16.5" cy="15.5" r="2.5"/></g>,
  focus: () => <g {...P}><circle cx="12" cy="13" r="7.5"/><path d="M12 9v4l2.5 2M9.5 3h5"/></g>,
  'quick-add': () => <g {...P}><circle cx="12" cy="12" r="8.5"/><path d="M12 8v8M8 12h8"/></g>,
  agenda: () => <g {...P}><rect x="4" y="5" width="16" height="15" rx="2.5"/><path d="M4 10h16M8.5 3v4M15.5 3v4M8 14h3M8 17h6"/></g>,
  tasks: () => <g {...P}><rect x="4" y="5" width="4.5" height="4.5" rx="1"/><path d="M11.5 7.2H20M11.5 16.8H20"/><path d="m4.4 16.6 1.6 1.6 3-3.2"/></g>,
  notes: () => <g {...P}><path d="M6 3.5h8.5L19 8v12.5H6z"/><path d="M14 3.5V8h5M9 12.5h7M9 16h5"/></g>,
  review: () => <g {...P}><path d="M4.5 12a7.5 7.5 0 1 0 2.2-5.3"/><path d="M4 4.5v3.5h3.5"/><path d="M12 8.5V12l2.5 1.6"/></g>,
  goals: () => <g {...P}><path d="M4 19 10.5 9l3 4.5 2-2.5L20 19z"/><path d="M10.5 9V4l4 1.6-4 1.6"/></g>,
  habits: () => <g {...P}><circle cx="12" cy="12" r="8.5"/><path d="m8.2 12.3 2.6 2.6 5-5.3"/></g>,
  health: () => <g {...P}><path d="M3 12.5h4l2-4.5 3 9 2.4-6 1.6 1.5H21"/></g>,
  wealth: () => <g {...P}><ellipse cx="12" cy="7" rx="7" ry="3"/><path d="M5 7v5c0 1.7 3.1 3 7 3s7-1.3 7-3V7M5 12v5c0 1.7 3.1 3 7 3s7-1.3 7-3v-5"/></g>,
  earn: () => <g {...P}><circle cx="12" cy="12" r="8.5"/><path d="M12 7.5v9M14.6 9.6c-.5-.9-1.5-1.4-2.6-1.4-1.5 0-2.6.8-2.6 1.9 0 2.6 5.4 1.3 5.4 4 0 1.1-1.2 1.9-2.8 1.9-1.2 0-2.2-.5-2.7-1.4"/></g>,
  chess: () => <g {...P}><path d="M7 20h10M8.5 20l.8-6h5.4l.8 6M9 14l-1-4.5h8L15 14M8 6.5V4h2v1.5h1.5V4h1v1.5H14V4h2v2.5"/></g>,
  settings: () => <g {...P}><circle cx="12" cy="12" r="3"/><path d="M12 2.8v2.4M12 18.8v2.4M2.8 12h2.4M18.8 12h2.4M5.5 5.5l1.7 1.7M16.8 16.8l1.7 1.7M5.5 18.5l1.7-1.7M16.8 7.2l1.7-1.7"/></g>,
  test: () => <g {...P}><path d="M9 3.5h6M10 3.5v5.5L5 18a2 2 0 0 0 1.8 3h10.4A2 2 0 0 0 19 18l-5-9V3.5"/><path d="M7.5 14h9"/></g>,
  // Session AM: the side bars' own icons (every page of the app in the left bar; the stage's actions in the right bar).
  today: () => <g {...P}><path d="M4 11.5 12 4.5l8 7"/><path d="M6.5 10v9.5h11V10"/><path d="M10 19.5V14h4v5.5"/></g>,
  journal: () => <g {...P}><path d="M6.5 3.5H18V20.5H6.5a1.5 1.5 0 0 1-1.5-1.5V5a1.5 1.5 0 0 1 1.5-1.5z"/><path d="M9 3.5v17M12.5 8.5h2.5M12.5 12h2.5"/></g>,
  bills: () => <g {...P}><path d="M6.5 3.5h11v17l-1.9-1.4-1.8 1.4-1.8-1.4-1.8 1.4-1.8-1.4-1.9 1.4z"/><path d="M9.5 8.5h5M9.5 12h5"/></g>,
  budgets: () => <g {...P}><path d="M4.5 7h9M17.5 7h2M4.5 12h3M11.5 12h8M4.5 17h7M15.5 17h4"/><circle cx="15.5" cy="7" r="2"/><circle cx="9.5" cy="12" r="2"/><circle cx="13.5" cy="17" r="2"/></g>,
  markets: () => <g {...P}><path d="M4 20h16"/><path d="m4.5 15.5 4.5-5 3.5 3 6.5-8"/><path d="M15 5.5h4v4"/></g>,
  portfolio: () => <g {...P}><path d="M11 4.5a8 8 0 1 0 8.5 8.5H11z"/><path d="M14.5 3.6a8 8 0 0 1 5.9 5.9h-5.9z"/></g>,
  staking: () => <g {...P}><path d="m12 3.5 8 4-8 4-8-4z"/><path d="m4 12 8 4 8-4M4 16.5l8 4 8-4"/></g>,
  governance: () => <g {...P}><path d="M4.5 11.5h15v8.5h-15z"/><path d="M8.5 11.5V4.5h7v7"/><path d="m10.5 7.8 1.2 1.2 2-2.2"/></g>,
  ecosystem: () => <g {...P}><circle cx="12" cy="5.8" r="2.3"/><circle cx="5.8" cy="17.5" r="2.3"/><circle cx="18.2" cy="17.5" r="2.3"/><path d="m10.9 7.8-4 7.6M13.1 7.8l4 7.6M8.1 17.5h7.8"/></g>,
  journey: () => <g {...P}><path d="M6 20.5v-17"/><path d="M6 4.5h11.5l-2.5 3.5 2.5 3.5H6"/></g>,
  stories: () => <g {...P}><rect x="6" y="3.5" width="12" height="17" rx="2.5"/><path d="m10.5 9.3 4.2 2.7-4.2 2.7z"/><path d="M3 7v10M21 7v10"/></g>,
  timeline: () => <g {...P}><path d="M7 3.5v17"/><circle cx="7" cy="7" r="1.8" fill="currentColor"/><circle cx="7" cy="12.5" r="1.8" fill="currentColor"/><circle cx="7" cy="18" r="1.8" fill="currentColor"/><path d="M11.5 7H20M11.5 12.5h5.5M11.5 18H20"/></g>,
  activity: () => <g {...P}><path d="M8 4.5v15m0 0-3.2-3.2M8 19.5l3.2-3.2M16 19.5v-15m0 0-3.2 3.2M16 4.5l3.2 3.2"/></g>,
  plans: () => <g {...P}><path d="M4 12.5V4.5h8l8.5 8.5-8 8z"/><circle cx="8.6" cy="9" r="1.4"/></g>,
  help: () => <g {...P}><circle cx="12" cy="12" r="8.5"/><path d="M9.6 9.6a2.5 2.5 0 1 1 3.7 2.2c-.8.5-1.3 1-1.3 2"/><path d="M12 17v.2"/></g>,
  search: () => <g {...P}><circle cx="11" cy="11" r="6.5"/><path d="m16 16 4.5 4.5"/></g>,
  pin: () => <g {...P}><path d="M9 4h6l-1 6 3.5 3.5h-11L10 10z"/><path d="M12 13.5V20"/></g>,
  pinned: () => <g {...P}><path d="M9 4h6l-1 6 3.5 3.5h-11L10 10z" fill="currentColor"/><path d="M12 13.5V20"/></g>,
  hide: () => <g {...P}><path d="M6 17.5h12"/><path d="m8.5 9.5 3.5 3.5 3.5-3.5"/></g>,
  show: () => <g {...P}><path d="M6 6.5h12"/><path d="m8.5 14.5 3.5-3.5 3.5 3.5"/></g>,
  phone: () => <g {...P}><rect x="7.5" y="3" width="9" height="18" rx="2.3"/><path d="M11 17.8h2"/></g>,
};
export function NovaIcon({name, size = 22}: {name: string; size?: number}) {
  const draw = ICONS[name] ?? ICONS.star!;
  return <svg className="nova-icon" viewBox="0 0 24 24" width={size} height={size} aria-hidden="true" focusable="false">{draw()}</svg>;
}
