import {AppIcon} from '../app-icon';
import {GLYPHS} from './glyph-paths';
export {PATH_GLYPH_NAMES} from './glyph-paths';

/**
 * The marks drawn inside the path's dots, on the 24-unit grid the app's icons use (stroke 1.9, round ends). A name this
 * set does not know is drawn by `AppIcon` (so the Earn lane may pass any app icon name). Decorative: the dot carries the name.
 */
export function PathGlyph({name, size = 28}: {name: string; size?: number}) {
  const d = GLYPHS[name];
  if (!d) return <AppIcon name={name} size={size}/>;
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={name === 'check' ? 2.6 : 1.9} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false"><path d={d}/></svg>;
}
