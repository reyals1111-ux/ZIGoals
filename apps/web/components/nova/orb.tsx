'use client';
import {useId} from 'react';
import {ORB_STATE_LABEL, type NovaOrbState} from '../../lib/nova/orb';
import './orb.css';

export type {NovaOrbState} from '../../lib/nova/orb';
export {ORB_STATES, ORB_STATE_LABEL} from '../../lib/nova/orb';

/**
 * Session AK (owner follow-up 2, N2 and M3; lane NA): the NOVA orb, hand-made SVG in the nebula palette. A star core with
 * a soft halo, nebula arms inside it, a dial of fine ticks, an inner arc and a four-point glint at its heart. It breathes
 * while idle, sends out ripples while listening, swirls while thinking and pulses while speaking (orb.css). Under reduced
 * motion or Motion Off each state is a still frame of its own, and the state is always said in words by whoever shows it.
 * NB's chat drives `state`; the accent comes from the page's `--nova-a` / `--nova-b` (nova.css), so it follows the
 * person's accent and every theme.
 */
export function NovaOrb({state = 'idle', size = 200, label, className = ''}: {state?: NovaOrbState; size?: number; label?: string; className?: string}) {
  const id = `nova-orb-${useId().replace(/[^a-zA-Z0-9]/g, '')}`, url = (name: string) => `url(#${id}-${name})`;
  const named = label !== undefined;
  return <svg className={`nova-orb ${className}`.trim()} data-state={state} viewBox="-100 -100 200 200" width={size} height={size}
    {...(named ? {role: 'img', 'aria-label': label || `NOVA · ${ORB_STATE_LABEL[state]}`} : {'aria-hidden': true})} focusable="false">
    <defs>
      <radialGradient id={`${id}-core`} cx=".4" cy=".34" r=".78" fx=".34" fy=".28">
        <stop offset="0" className="nova-orb-s-white"/><stop offset=".22" className="nova-orb-s-hi"/><stop offset=".62" className="nova-orb-s-a"/><stop offset="1" className="nova-orb-s-deep"/>
      </radialGradient>
      <radialGradient id={`${id}-halo`}><stop offset=".3" className="nova-orb-s-a nova-orb-s-strong"/><stop offset=".62" className="nova-orb-s-b nova-orb-s-soft"/><stop offset="1" className="nova-orb-s-b nova-orb-s-clear"/></radialGradient>
      <linearGradient id={`${id}-ring`} x1="-1" y1="-1" x2="1" y2="1" gradientUnits="userSpaceOnUse" gradientTransform="scale(80)"><stop offset="0" className="nova-orb-s-b"/><stop offset=".5" className="nova-orb-s-hi"/><stop offset="1" className="nova-orb-s-a"/></linearGradient>
      <clipPath id={`${id}-clip`}><circle r="45"/></clipPath>
    </defs>
    <circle className="nova-orb-halo" r="98" fill={url('halo')}/>
    <g className="nova-orb-ripples" fill="none" stroke={url('ring')}>
      <circle className="nova-orb-ripple" r="50"/><circle className="nova-orb-ripple" r="50"/><circle className="nova-orb-ripple" r="50"/>
    </g>
    <circle className="nova-orb-outer" r="88" fill="none"/>
    <circle className="nova-orb-dial" r="78" fill="none" pathLength="360"/>
    <g className="nova-orb-arc-turn"><circle className="nova-orb-arc" r="64" fill="none" stroke={url('ring')} pathLength="360"/><circle className="nova-orb-arc nova-orb-tail" r="64" fill="none" pathLength="360"/></g>
    <g className="nova-orb-body">
      <circle className="nova-orb-core" r="46" fill={url('core')}/>
      <g clipPath={url('clip')}>
        <g className="nova-orb-swirl" fill="none">
          <path d="M-40 6C-26-22 4-30 22-16S30 22 4 30"/>
          <path d="M38-8C26 20-6 30-24 16S-30-22-4-30"/>
          <path d="M-8 40C-30 22-28-8-10-22" className="nova-orb-swirl-faint"/>
        </g>
      </g>
      <path className="nova-orb-rim" d="M-33-24A42 42 0 0 1 10-41" fill="none"/>
      <path className="nova-orb-star" d="M0-17C1.6-4.6 4.6-1.6 17 0 4.6 1.6 1.6 4.6 0 17-1.6 4.6-4.6 1.6-17 0-4.6-1.6-1.6-4.6 0-17Z"/>
    </g>
  </svg>;
}
export default NovaOrb;
