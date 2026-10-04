import manifest from './manifest.json';
import './zigi.css';

/**
 * The ZIGi figure (ADR-012). States come from the static manifest (a build-time import, nothing fetched); every state
 * shows the placeholder frame until the figure set lands. Any motion is CSS only, and none under reduced motion or
 * Motion Off. ZIGi never notifies: it only reacts to what happens in the chat.
 */
export type ZigiState = keyof typeof manifest.states;
export const ZIGI_STATES = Object.keys(manifest.states) as ZigiState[];
export const ZIGI_MANIFEST = manifest;
type Size = keyof typeof manifest.sizes;
export function ZigiAvatar({state = 'idle', size = 56, className = '', decorative = false}: {state?: ZigiState; size?: number; className?: string; decorative?: boolean}) {
  const frame = manifest.states[state] ?? manifest.states.idle, sizes = manifest.sizes;
  const base: Size = size > sizes['2x'].width ? 'large' : '1x';
  const file = sizes[base], height = Math.round(size * file.height / file.width);
  const srcSet = base === '1x' ? `${sizes['1x'].file} 1x, ${sizes['2x'].file} 2x` : undefined;
  return <span className={`zigi zigi-${state}${className ? ` ${className}` : ''}`} data-state={state} data-code={frame.code} style={{width: size, height}}>
    {/* A static figure from /public, like the brand mark: no optimizer, no loader, nothing fetched beyond the file. */}
    {/* eslint-disable-next-line @next/next/no-img-element */}
    <img src={file.file} srcSet={srcSet} width={size} height={height} alt={decorative ? '' : manifest.alt} aria-hidden={decorative || undefined} draggable={false} decoding="async"/>
  </span>;
}
