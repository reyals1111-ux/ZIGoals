'use client';
import Link from 'next/link';
import {useEffect, useRef, useState} from 'react';
import {PageHeader} from '../page-header';
import {AnimationChoice} from '../ai/zigi-customize';
import {filesFor, ZIGI_MANIFEST, ZIGI_STATES, type ZigiState} from './manifest';
import {ZigiAvatar} from './zigi-avatar';
import './meet-zigi.css';

/**
 * Meet ZIGi (Session V Part 12): every state of every skin at the launcher's, the panel's and a large size, with its
 * code, whether it loops or plays once, and the state it falls back to while a skin has no drawing for it. One-shots
 * play again on request; loops move while they are in view (and never under reduced motion, Motion Off or Off). A
 * reference page: it reads no records and writes nothing but the animation choice.
 */
const SIZES = [{name: 'Launcher', px: 44}, {name: 'Panel', px: 72}, {name: 'Large', px: 160}] as const;
function StateCard({state, skin}: {state: ZigiState; skin: string}) {
  const spec = ZIGI_MANIFEST.states[state]!, [play, setPlay] = useState(0), card = useRef<HTMLElement>(null);
  const files = filesFor(ZIGI_MANIFEST.skins[skin]!, state);
  // A loop out of view waits (zigi.css pauses it), so a long page of figures costs nothing while scrolled away.
  useEffect(() => {
    const el = card.current; if (!el || typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(([entry]) => { if (entry?.isIntersecting) delete el.dataset.offscreen; else el.dataset.offscreen = ''; });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return <article ref={card} className="meet-zigi-card" aria-labelledby={`zigi-state-${state}`}>
    <header><h3 id={`zigi-state-${state}`}>{spec.label}</h3><p className="meet-zigi-meta"><span>{spec.code}</span> · <span>{spec.kind === 'loop' ? 'Loops while it lasts' : `Plays once · ${(spec.durationMs / 1000).toLocaleString('en-US')} s`}</span></p></header>
    <div className="meet-zigi-sizes" key={play}>{SIZES.map(size => <figure key={size.name}><ZigiAvatar state={state} size={size.px} skin={skin} className="zigi-play" decorative/><figcaption>{size.name}</figcaption></figure>)}</div>
    <p className="meet-zigi-meta">{files.files?.wears ? `Wears the ${ZIGI_MANIFEST.states[files.files.wears]?.label.toLowerCase()} clip for now, with this state’s own move.` : files.from ? files.from === state ? 'Its own clip.' : `Shows the ${ZIGI_MANIFEST.states[files.from]?.label.toLowerCase()} drawing for now.` : ZIGI_MANIFEST.skins[skin]?.placeholder ? 'The placeholder figure, with this state’s own move.' : 'The skin’s base drawing.'}{spec.fallback ? ` Falls back to ${ZIGI_MANIFEST.states[spec.fallback]?.label.toLowerCase()}.` : ''}</p>
    {spec.kind === 'one-shot' && <button type="button" className="secondary" onClick={() => setPlay(n => n + 1)} aria-label={`Play ${spec.label} again`}>Play again</button>}
  </article>;
}
export function MeetZigi() {
  return <div className="meet-zigi">
    <PageHeader titleId="meet-zigi-title" eyebrow="ZIGi · your AI" title="Meet ZIGi." lede="Every state ZIGi can be in, as drawn by the studio. Eleven states have their own clip; the others wear one of them for now, each with its own small move on top."/>
    <p className="help-back"><Link className="text-link" href="/app/settings#zigi-look">← Back to Settings</Link></p>
    <section className="panel meet-zigi-motion" aria-labelledby="meet-zigi-motion"><h2 id="meet-zigi-motion">How much ZIGi moves</h2><AnimationChoice/><p className="ai-note">Your device&rsquo;s reduced-motion setting and Motion Off in Settings always come first: then every figure here holds still.</p></section>
    {Object.entries(ZIGI_MANIFEST.skins).map(([id, skin]) => <section key={id} className="panel meet-zigi-skin" aria-labelledby={`meet-zigi-skin-${id}`}>
      <h2 id={`meet-zigi-skin-${id}`}>{skin.label}{skin.placeholder ? ' (placeholder)' : ''}</h2>
      <div className="meet-zigi-grid">{ZIGI_STATES.map(state => <StateCard key={state} state={state} skin={id}/>)}</div>
    </section>)}
  </div>;
}
