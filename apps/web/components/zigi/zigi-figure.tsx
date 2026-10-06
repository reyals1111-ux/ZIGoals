import {SHELL_FRAME} from '../../lib/ai/zigi-look';

/**
 * ZIGi in the launcher shell (Session V Part 12): the original skin's still frame for every state, sized and centred by
 * the launcher's CSS (its optical offset puts the figure's visual centre on the circle's centre) and breathing through
 * CSS alone. The full manifest, the per-state files and the state motions arrive with the chat chunk. Decorative: the
 * control around it carries the name.
 */
export function ZigiFigure({state}: {state: string}) {
  return <span className={`zigi zigi-${state} zigi-figure`} data-state={state}>
    {/* eslint-disable-next-line @next/next/no-img-element */}
    <img src={SHELL_FRAME.x1} srcSet={`${SHELL_FRAME.x1} 1x, ${SHELL_FRAME.x2} 2x`} width={SHELL_FRAME.width} height={SHELL_FRAME.height} alt="" aria-hidden draggable={false} decoding="async"/>
  </span>;
}
