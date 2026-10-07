'use client';
import {useEffect, useRef, useState, useSyncExternalStore} from 'react';
import {filesFor, skinOf, ZIGI_MANIFEST, type Manifest, type SizeName, type StateFiles, type ZigiState} from './manifest';
import {motionAllowed, supportsAnimatedWebp, watchMotion} from './motion';
import {ZigiImage} from './zigi-image';
import './zigi.css';

export {ZIGI_MANIFEST, ZIGI_STATES, type ZigiState} from './manifest';
/**
 * The ZIGi figure (ADR-012; Session V Part 12; Session X-Local Part 1): a state of a skin from the static manifest, at any
 * size. The state's still frame (its poster) shows first; its animated clip is fetched and swapped in only while motion
 * is allowed (never under the device's reduced motion, the app's Motion Off or ZIGi's animation Off) and the figure is
 * on screen. A state without its own clip wears a delivered one (the manifest's `wears`); a state the skin has no files
 * for shows its fallback's, down to the skin's base frame. Each state also has a small CSS motion of its own (zigi.css).
 */
export type Picked = {src: string; srcSet?: string; width: number; height: number; animated: string | null; files: StateFiles | null};
/** The image for a state of a skin at a CSS size (pure; the manifest test checks every state of every skin). */
export function frameFor(skinName: string | null | undefined, state: string, size: number, motion: boolean, manifest: Manifest = ZIGI_MANIFEST, apng = false): Picked {
  const skin = skinOf(skinName, manifest), sizes = skin.sizes;
  const base: SizeName = size > sizes['2x'].width ? 'large' : '1x', proportion = sizes[base].height / sizes[base].width;
  const height = Math.round(size * proportion), {files} = filesFor(skin, state, manifest);
  const animated = motion ? (apng ? files?.animatedFallback : files?.animated) ?? null : null;
  const one = files?.['1x'] ?? sizes['1x'].file, two = files?.['2x'] ?? sizes['2x'].file, large = files?.large ?? sizes.large.file;
  return base === '1x' ? {src: one, srcSet: `${one} 1x, ${two} 2x`, width: size, height, animated, files} : {src: large, width: size, height, animated, files};
}
const still = () => false;
let apngNeeded = false;
void supportsAnimatedWebp().then(ok => { apngNeeded = !ok; });
export function ZigiAvatar({state = 'idle', size = 56, className = '', decorative = false, skin, play = true}: {state?: ZigiState; size?: number; className?: string; decorative?: boolean; skin?: string; play?: boolean}) {
  const motion = useSyncExternalStore(watchMotion, motionAllowed, still);
  const box = useRef<HTMLSpanElement>(null), [onScreen, setOnScreen] = useState(true);
  // A figure scrolled out of view (Meet ZIGi's long page) keeps its poster; the clip loads when it comes back.
  useEffect(() => {
    const el = box.current; if (!el || typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(([entry]) => setOnScreen(!!entry?.isIntersecting));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  const spec = ZIGI_MANIFEST.states[state] ?? ZIGI_MANIFEST.states.idle!, frame = frameFor(skin, state, size, motion && play && onScreen, ZIGI_MANIFEST, apngNeeded);
  return <span ref={box} className={`zigi zigi-${state}${className ? ` ${className}` : ''}`} data-state={state} data-code={spec.code} data-wears={frame.files?.wears} data-own={frame.files && !frame.files.wears ? '' : undefined} style={{width: size, height: frame.height}}>
    <ZigiImage poster={{src: frame.src, srcSet: frame.srcSet}} animated={frame.animated} width={size} height={frame.height} alt={ZIGI_MANIFEST.alt} decorative={decorative}/>
  </span>;
}
