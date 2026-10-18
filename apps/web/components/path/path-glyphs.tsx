import {AppIcon} from '../app-icon';

/**
 * The marks drawn inside the path's dots, on the 24-unit grid the app's icons use (stroke 1.9, round ends). A name this
 * set does not know is drawn by `AppIcon` (so the Earn lane may pass any app icon name). Decorative: the dot carries the name.
 */
const GLYPHS: Record<string, string> = {
  check: 'm5 12.5 4.5 4.5L19 7.5',
  lock: 'M7 11V8a5 5 0 0 1 10 0v3M5.5 11h13v9.5h-13zM12 15v2.5',
  drop: 'M12 3.5c3.4 4.2 6 7.6 6 10.8a6 6 0 0 1-12 0c0-3.2 2.6-6.6 6-10.8M9.2 14.6a2.9 2.9 0 0 0 2.6 2.7',
  moon: 'M19.5 14.8A8 8 0 0 1 9.2 4.5a8 8 0 1 0 10.3 10.3',
  lotus: 'M12 20c-4.6 0-8.5-2.4-9-5.6 2.7-.4 5.2.4 7 2M12 20c4.6 0 8.5-2.4 9-5.6-2.7-.4-5.2.4-7 2M12 20c-2.6-2.1-3.8-4.8-3.8-7.6S9.4 6.9 12 4.5c2.6 2.4 3.8 5.1 3.8 7.9S14.6 17.9 12 20',
  hourglass: 'M7 3.5h10M7 20.5h10M8 3.5c0 4 4 5.2 4 8.5s-4 4.5-4 8.5M16 3.5c0 4-4 5.2-4 8.5s4 4.5 4 8.5',
  scale: 'M4.5 7h15l-1.6 12.5H6.1zM9 7a3 3 0 0 1 6 0M12 11.5l1.6-2',
  leaf: 'M5 19c0-8 5-13.5 14-14 .4 9-5 14-12.5 14M5 19c2.5-4.5 5.5-7.4 9-9.5',
  flag: 'M6 21V4M6 4.5h10.5l-2 4 2 4H6',
  sparkle: 'M12 3.5 13.9 10l6.6 2-6.6 2L12 20.5 10.1 14l-6.6-2 6.6-2zM19 3.5v3M17.5 5h3',
  heart: 'M12 20s-7.5-4.6-7.5-10.2A4.3 4.3 0 0 1 12 7.2a4.3 4.3 0 0 1 7.5 2.6C19.5 15.4 12 20 12 20',
  meal: 'M7 3.5v7M5 3.5v4.5a2 2 0 0 0 4 0V3.5M7 10.5v10M16.5 20.5V3.5c-2.2 1.3-3.5 4-3.5 7.3h3.5',
  pill: 'M9.2 18.8 18.8 9.2a3.9 3.9 0 0 0-5.5-5.5L3.7 13.3a3.9 3.9 0 0 0 5.5 5.5M8.5 8.5l7 7',
  focus: 'M12 7v5l3 2M20.5 12a8.5 8.5 0 1 1-17 0 8.5 8.5 0 0 1 17 0',
  chest: 'M4 10.5h16v9H4zM4 10.5c0-3.6 2-5.5 8-5.5s8 1.9 8 5.5M10.5 13h3v2.5h-3z',
};
export const PATH_GLYPH_NAMES = Object.keys(GLYPHS);
export function PathGlyph({name, size = 28}: {name: string; size?: number}) {
  const d = GLYPHS[name];
  if (!d) return <AppIcon name={name} size={size}/>;
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={name === 'check' ? 2.6 : 1.9} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false"><path d={d}/></svg>;
}
