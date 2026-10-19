'use client';
import {SHELL_FRAME} from '../../lib/ai/zigi-look';
import type {ZigiMood} from '../../lib/path/model';
import {useZigiFrames} from '../zigi/bus';
import {ZigiFigure} from '../zigi/zigi-figure';
import {ZigiImage} from '../zigi/zigi-image';
import '../zigi/zigi.css';

/** ZIGi's existing states for each moment of the path (P7.6): encouraging at the first dot, presenting (pointing at) the
 *  next one, proud half way, celebrating when all are lit, a quick success right after a tick. Every one of them is a
 *  one-shot in ZIGi's manifest and its CSS move plays once (zigi.css), so nothing on the path loops. */
export const ZIGI_PATH_STATES: Record<ZigiMood | 'tick', string> = {empty: 'encouraging', start: 'encouraging', going: 'presenting', half: 'proud', done: 'celebrate', tick: 'success'};

/**
 * ZIGi on the path: the state's still frame (never its animated clip, so the path keeps to one-time motion) beside the
 * next dot with a small nebula arrow pointing at it, or beside the end when every dot is lit, and a short line in a bubble
 * when the caller gives one. The figure is keyed by its state, so each change plays its one CSS move once; reduced motion,
 * Motion Off and ZIGi's own animation Off show the still (zigi.css). Decorative: the dots name themselves and the page
 * announces each tick.
 *
 * Session AF (L3b): `alive` (the Checklist's full-screen path, where the owner allowed motion) draws ZIGi as a large
 * figure with its animated clips (ZigiFigure: the clip only while motion is allowed, else the still), standing in the
 * open sky beside the next dot (`centred`: a dot in the middle of the path, ZIGi stands a little higher).
 */
export function PathZigi({state, side, say, alive = false, centred = false}: {state: string; side: 'left' | 'right'; say?: string; alive?: boolean; centred?: boolean}) {
  const frames = useZigiFrames(), frame = frames?.[state] ?? frames?.idle;
  const poster = frame ? {src: frame.poster.x1, srcSet: `${frame.poster.x1} 1x, ${frame.poster.x2} 2x`} : {src: SHELL_FRAME.x1, srcSet: `${SHELL_FRAME.x1} 1x, ${SHELL_FRAME.x2} 2x`};
  return <span className="path-zigi" data-side={side} data-zigi-state={state} data-alive={alive || undefined} data-centred={centred || undefined} aria-hidden="true">
    {alive ? <span key={state} className="path-zigi-figure"><ZigiFigure state={state}/></span>
      : <span key={state} className={`zigi zigi-${state} path-zigi-figure`} data-state={state}><ZigiImage poster={poster} width={SHELL_FRAME.width} height={SHELL_FRAME.height} alt="" decorative/></span>}
    {alive ? <span className="path-zigi-ground"/> : <span className="path-zigi-arrow"/>}
    {say && <span className="path-zigi-say">{say}</span>}
  </span>;
}
