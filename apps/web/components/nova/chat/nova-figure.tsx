'use client';
import {useId} from 'react';
import {ZigiAvatar} from '../../zigi/zigi-avatar';

/**
 * Who speaks in NOVA's chat (Session AK, owner follow-up 2 N1): NOVA's small star mark (a still, hand-drawn SVG in the
 * nebula palette; it only breathes where motion is allowed, see nova-chat.css), or ZIGi's own figure, unchanged (the
 * locked ZIGi look), when the person chose ZIGi as NOVA's avatar or when ZIGi answers a page task. Decorative: the words
 * beside it always name the speaker.
 */
export type NovaPersona = {name: string; avatar: 'orb' | 'zigi'};
export type FigureState = 'idle' | 'thinking' | 'speaking' | 'listening';
export function NovaMark({size = 28, state = 'idle'}: {size?: number; state?: FigureState}) {
  const id = `nova-mark-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;
  return <span className="nova-mark" data-state={state} style={{width: size, height: size}} aria-hidden="true">
    <svg viewBox="0 0 48 48" width={size} height={size} focusable="false">
      <defs>
        <radialGradient id={`${id}-core`} cx="50%" cy="45%" r="55%"><stop offset="0" className="nova-mark-core-0"/><stop offset=".55" className="nova-mark-core-1"/><stop offset="1" className="nova-mark-core-2"/></radialGradient>
        <linearGradient id={`${id}-ring`} x1="0" x2="1" y1="0" y2="1"><stop offset="0" className="nova-mark-ring-0"/><stop offset="1" className="nova-mark-ring-1"/></linearGradient>
      </defs>
      <circle className="nova-mark-halo" cx="24" cy="24" r="22" fill={`url(#${id}-core)`}/>
      <circle cx="24" cy="24" r="17" fill="none" stroke={`url(#${id}-ring)`} strokeWidth="1.2" opacity=".75"/>
      <path className="nova-mark-star" d="M24 11.5c1 6.3 3.2 8.5 9.5 9.5-6.3 1-8.5 3.2-9.5 9.5-1-6.3-3.2-8.5-9.5-9.5 6.3-1 8.5-3.2 9.5-9.5z" transform="translate(0 3)"/>
    </svg>
  </span>;
}
/** NOVA's figure as the person chose it: the star mark, or ZIGi. */
export function PersonaFigure({persona, size = 28, state = 'idle'}: {persona: NovaPersona; size?: number; state?: FigureState}) {
  return persona.avatar === 'zigi' ? <ZigiAvatar state={state} size={size} decorative/> : <NovaMark size={size} state={state}/>;
}
/**
 * The person's own agent (Hermes Agent, owner follow-up 3 N11): a neutral glyph of our own (a node with three links in the
 * app's stroke), never another project's logo or branding.
 */
export function AgentGlyph({size = 28}: {size?: number}) {
  return <span className="nova-agent" style={{width: size, height: size}} aria-hidden="true">
    <svg viewBox="0 0 32 32" width={size} height={size} focusable="false">
      <rect x="1.5" y="1.5" width="29" height="29" rx="9" fill="none" stroke="currentColor" strokeWidth="1.4" opacity=".55"/>
      <path d="M16 16L9 10M16 16l8-5M16 16v8" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
      <circle cx="16" cy="16" r="3.2" fill="currentColor"/><circle cx="9" cy="10" r="2" fill="currentColor"/><circle cx="24" cy="11" r="2" fill="currentColor"/><circle cx="16" cy="24" r="2" fill="currentColor"/>
    </svg>
  </span>;
}
