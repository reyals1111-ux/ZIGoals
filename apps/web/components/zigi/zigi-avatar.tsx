'use client';
import {useSyncExternalStore} from 'react';
import {filesFor, skinOf, ZIGI_MANIFEST, type Manifest, type SizeName, type ZigiState} from './manifest';
import './zigi.css';

export {ZIGI_MANIFEST, ZIGI_STATES, type ZigiState} from './manifest';
/**
 * The ZIGi figure (ADR-012; Session V Part 12): a state of a skin from the static manifest, at any size. A state the
 * skin has no file for shows its fallback's file, down to the skin's base frame (the placeholder, today, for every
 * state); each state also has a small CSS motion of its own (zigi.css). An animated file, once a skin has one, plays
 * only while motion is allowed: never under the device's reduced motion, the app's Motion Off or ZIGi's animation Off,
 * where the state's still frame shows instead.
 */
type Picked = {src: string; srcSet?: string; width: number; height: number};
/** The image for a state of a skin at a CSS size (pure; the manifest test checks every state of every skin). */
export function frameFor(skinName: string | null | undefined, state: string, size: number, motion: boolean, manifest: Manifest = ZIGI_MANIFEST): Picked {
  const skin = skinOf(skinName, manifest), sizes = skin.sizes;
  const base: SizeName = size > sizes['2x'].width ? 'large' : '1x', proportion = sizes[base].height / sizes[base].width;
  const height = Math.round(size * proportion), {files} = filesFor(skin, state, manifest);
  if (files?.animated && motion) return {src: files.animated, width: size, height};
  const one = files?.['1x'] ?? sizes['1x'].file, two = files?.['2x'] ?? sizes['2x'].file, large = files?.large ?? sizes.large.file;
  return base === '1x' ? {src: one, srcSet: `${one} 1x, ${two} 2x`, width: size, height} : {src: large, width: size, height};
}
/** Motion for ZIGi's own animated files: off under reduced motion, Motion Off or ZIGi's animation Off. */
function motionAllowed(): boolean {
  const root = document.documentElement.dataset;
  return root.appMotion !== 'off' && root.zigiMotion !== 'off' && !window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
}
function watchMotion(change: () => void): () => void {
  const observer = new MutationObserver(change), query = window.matchMedia?.('(prefers-reduced-motion: reduce)');
  observer.observe(document.documentElement, {attributes: true, attributeFilter: ['data-app-motion', 'data-zigi-motion']});
  query?.addEventListener('change', change);
  return () => { observer.disconnect(); query?.removeEventListener('change', change); };
}
const still = () => false;
export function ZigiAvatar({state = 'idle', size = 56, className = '', decorative = false, skin}: {state?: ZigiState; size?: number; className?: string; decorative?: boolean; skin?: string}) {
  const motion = useSyncExternalStore(watchMotion, motionAllowed, still);
  const spec = ZIGI_MANIFEST.states[state] ?? ZIGI_MANIFEST.states.idle!, frame = frameFor(skin, state, size, motion);
  return <span className={`zigi zigi-${state}${className ? ` ${className}` : ''}`} data-state={state} data-code={spec.code} style={{width: size, height: frame.height}}>
    {/* A static figure from /public, like the brand mark: no optimizer, no loader, nothing fetched beyond the file. */}
    {/* eslint-disable-next-line @next/next/no-img-element */}
    <img src={frame.src} srcSet={frame.srcSet} width={size} height={frame.height} alt={decorative ? '' : ZIGI_MANIFEST.alt} aria-hidden={decorative || undefined} draggable={false} decoding="async"/>
  </span>;
}
