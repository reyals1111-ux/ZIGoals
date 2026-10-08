'use client';
import {SHELL_FRAME} from '../../lib/ai/zigi-look';
import {useZigiFrames, useZigiIdleVariant} from './bus';
import {ZigiImage} from './zigi-image';

/**
 * ZIGi in the launcher shell (Session V Part 12; Session X-Local Part 1): until the alive chunk has published the frames,
 * the original skin's idle still frame for every state, sized and centred by the launcher's CSS (its optical offset puts
 * the figure's visual centre on the circle's centre) and breathing through CSS alone. Once the frames are on the bus,
 * each state shows its own poster and, while motion is allowed, its animated clip; an idle variation (Part 3) replaces
 * idle's own frame while it plays. The full manifest never ships here. Decorative: the control around it carries the name.
 */
export function ZigiFigure({state}: {state: string}) {
  const frames = useZigiFrames(), variant = useZigiIdleVariant();
  const frame = state === 'idle' && variant ? variant : frames?.[state] ?? frames?.idle;
  const poster = frame ? {src: frame.poster.x1, srcSet: `${frame.poster.x1} 1x, ${frame.poster.x2} 2x`} : {src: SHELL_FRAME.x1, srcSet: `${SHELL_FRAME.x1} 1x, ${SHELL_FRAME.x2} 2x`};
  return <span className={`zigi zigi-${state} zigi-figure`} data-state={state} data-own={frame?.own ? '' : undefined} data-variant={state === 'idle' && variant ? '' : undefined}>
    <ZigiImage poster={poster} animated={frame?.animated ?? null} width={SHELL_FRAME.width} height={SHELL_FRAME.height} alt="" decorative/>
  </span>;
}
