'use client';
import Link from 'next/link';
import {useEffect, useRef, useState} from 'react';
import {PageHeader} from '../page-header';
import {OrbitArt} from '../header-art/orbit-art';
import {ZigiGlyph} from '../header-art/glyphs/zigi';
import {AnimationChoice} from '../ai/zigi-customize';
import {ZIGI_MANIFEST, type ZigiState} from './manifest';
import {GALLERY_GROUPS, STATE_TEXT} from './state-gallery';
import {ZigiAvatar} from './zigi-avatar';
import './meet-zigi.css';

/**
 * Meet ZIGi (Session V Part 12): every state of every skin at the launcher's, the panel's and a large size, with its
 * code, whether it loops or plays once, and the state it falls back to while a skin has no drawing for it. One-shots
 * play again on request; loops move while they are in view (and never under reduced motion, Motion Off or Off). A
 * reference page: it reads no records and writes nothing but the animation choice. Session AD item 13 (ADR-026): each
 * card also says what the state means and when it appears (state-gallery.ts), grouped by when ZIGi shows them.
 */
const SIZES = [{name: 'Launcher', px: 44}, {name: 'Panel', px: 72}, {name: 'Large', px: 160}] as const;
/** The states in the gallery table's order (a conversation in the order it happens). */
const GALLERY_ORDER = Object.keys(STATE_TEXT) as ZigiState[];
function StateCard({state, skin}: {state: ZigiState; skin: string}) {
  const spec = ZIGI_MANIFEST.states[state]!, [play, setPlay] = useState(0), card = useRef<HTMLElement>(null);
  // A loop out of view waits (zigi.css pauses it), so a long page of figures costs nothing while scrolled away.
  useEffect(() => {
    const el = card.current; if (!el || typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(([entry]) => { if (entry?.isIntersecting) delete el.dataset.offscreen; else el.dataset.offscreen = ''; });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return <article ref={card} className="meet-zigi-card" aria-labelledby={`zigi-state-${state}`}>
    <header><h4 id={`zigi-state-${state}`}>{spec.label}</h4>{/* Session AH (TO9, D-249, M-030; owner note: the internal copy only): no frame ids or studio notes on the page. */}<p className="meet-zigi-meta"><span>{spec.kind === 'loop' ? 'Moves while it lasts' : `A short move, about ${Math.max(1, Math.round(spec.durationMs / 1000)).toLocaleString('en-US')} s`}</span></p><p className="meet-zigi-meaning">{STATE_TEXT[state].meaning}</p><p className="meet-zigi-when"><strong>When it appears:</strong> {STATE_TEXT[state].when}</p></header>
    <div className="meet-zigi-sizes" key={play}>{SIZES.map(size => <figure key={size.name}><ZigiAvatar state={state} size={size.px} skin={skin} className="zigi-play" decorative/><figcaption>{size.name}</figcaption></figure>)}</div>
    {spec.kind === 'one-shot' && <button type="button" className="secondary" onClick={() => setPlay(n => n + 1)} aria-label={`Play ${spec.label} again`}>Play again</button>}
  </article>;
}
export function MeetZigi() {
  return <div className="meet-zigi">
    <PageHeader titleId="meet-zigi-title" eyebrow="ZIGi · Your Personal AI Companion" title="Meet ZIGi." art={<OrbitArt glyph={ZigiGlyph} spin={-14}/>} lede={`Every way ZIGi can look: what each one means and when it appears.`}/>
    <p className="help-back"><Link className="text-link" href="/app/settings#zigi-look">← Back to Settings</Link></p>
    <section className="panel meet-zigi-motion" aria-labelledby="meet-zigi-motion"><h2 id="meet-zigi-motion">How much ZIGi moves</h2><AnimationChoice/><p className="ai-note">Your device&rsquo;s reduced-motion setting and Motion Off in Settings always come first: then every figure here holds still.</p></section>
    {Object.entries(ZIGI_MANIFEST.skins).map(([id, skin]) => <section key={id} className="panel meet-zigi-skin" aria-labelledby={`meet-zigi-skin-${id}`}>
      <h2 id={`meet-zigi-skin-${id}`}>{skin.label}</h2>
      {GALLERY_GROUPS.map(group => <section key={group.id} className="meet-zigi-group" aria-labelledby={`meet-zigi-${id}-${group.id}`}>
        <h3 id={`meet-zigi-${id}-${group.id}`}>{group.title}</h3><p className="meet-zigi-group-line">{group.line}</p>
        <div className="meet-zigi-grid">{GALLERY_ORDER.filter(state => STATE_TEXT[state].group === group.id).map(state => <StateCard key={state} state={state} skin={id}/>)}</div>
      </section>)}
    </section>)}
  </div>;
}
