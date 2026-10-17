'use client';
import Link from 'next/link';
import {useEffect, useRef, useState} from 'react';
import {PageHeader} from '../page-header';
import {OrbitArt} from '../header-art/orbit-art';
import {ZigiGlyph} from '../header-art/glyphs/zigi';
import {AnimationChoice} from '../ai/zigi-customize';
import {filesFor, ZIGI_MANIFEST, ZIGI_STATES, type ZigiState} from './manifest';
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
/** The states with their own clip in the default skin (the others wear one): the lede counts them from the manifest. */
const OWN_CLIPS = ZIGI_STATES.filter(state => { const files = ZIGI_MANIFEST.skins[ZIGI_MANIFEST.defaultSkin]?.states[state]; return files && !files.wears; }).length;
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
    <header><h4 id={`zigi-state-${state}`}>{spec.label}</h4><p className="meet-zigi-meta"><span>{spec.code}</span> · <span>{spec.kind === 'loop' ? 'Loops while it lasts' : `Plays once · ${(spec.durationMs / 1000).toLocaleString('en-US')} s`}</span></p><p className="meet-zigi-meaning">{STATE_TEXT[state].meaning}</p><p className="meet-zigi-when"><strong>When it appears:</strong> {STATE_TEXT[state].when}</p></header>
    <div className="meet-zigi-sizes" key={play}>{SIZES.map(size => <figure key={size.name}><ZigiAvatar state={state} size={size.px} skin={skin} className="zigi-play" decorative/><figcaption>{size.name}</figcaption></figure>)}</div>
    <p className="meet-zigi-meta">{files.files?.wears ? `Wears the ${ZIGI_MANIFEST.states[files.files.wears]?.label.toLowerCase()} clip for now, with this state’s own move.` : files.from ? files.from === state ? 'Its own clip.' : `Shows the ${ZIGI_MANIFEST.states[files.from]?.label.toLowerCase()} drawing for now.` : ZIGI_MANIFEST.skins[skin]?.placeholder ? 'The placeholder figure, with this state’s own move.' : 'The skin’s base drawing.'}{spec.fallback ? ` Falls back to ${ZIGI_MANIFEST.states[spec.fallback]?.label.toLowerCase()}.` : ''}</p>
    {spec.kind === 'one-shot' && <button type="button" className="secondary" onClick={() => setPlay(n => n + 1)} aria-label={`Play ${spec.label} again`}>Play again</button>}
  </article>;
}
export function MeetZigi() {
  return <div className="meet-zigi">
    <PageHeader titleId="meet-zigi-title" eyebrow="ZIGi · Your Personal AI Companion" title="Meet ZIGi." art={<OrbitArt glyph={ZigiGlyph} spin={-14}/>} lede={`Every state ZIGi can be in, as drawn by the studio: what each one means and when it appears. ${OWN_CLIPS} of the ${ZIGI_STATES.length} states have their own clip; the others wear one of them for now, each with its own small move on top.`}/>
    <p className="help-back"><Link className="text-link" href="/app/settings#zigi-look">← Back to Settings</Link></p>
    <section className="panel meet-zigi-motion" aria-labelledby="meet-zigi-motion"><h2 id="meet-zigi-motion">How much ZIGi moves</h2><AnimationChoice/><p className="ai-note">Your device&rsquo;s reduced-motion setting and Motion Off in Settings always come first: then every figure here holds still.</p></section>
    {Object.entries(ZIGI_MANIFEST.skins).map(([id, skin]) => <section key={id} className="panel meet-zigi-skin" aria-labelledby={`meet-zigi-skin-${id}`}>
      <h2 id={`meet-zigi-skin-${id}`}>{skin.label}{skin.placeholder ? ' (placeholder)' : ''}</h2>
      {GALLERY_GROUPS.map(group => <section key={group.id} className="meet-zigi-group" aria-labelledby={`meet-zigi-${id}-${group.id}`}>
        <h3 id={`meet-zigi-${id}-${group.id}`}>{group.title}</h3><p className="meet-zigi-group-line">{group.line}</p>
        <div className="meet-zigi-grid">{GALLERY_ORDER.filter(state => STATE_TEXT[state].group === group.id).map(state => <StateCard key={state} state={state} skin={id}/>)}</div>
      </section>)}
    </section>)}
  </div>;
}
