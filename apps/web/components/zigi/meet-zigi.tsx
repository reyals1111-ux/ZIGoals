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
/** Session X-Local Part 4 (owner addition 10): what each state means, in plain words, and when ZIGi shows it. */
const MEANINGS: Record<string, string> = {
  idle: 'At rest. Under Full, a rare glance or thought comes between.', greeting: 'Hello: the panel’s first open of the day.', insight: 'Got it: an answer arrived.', listening: 'The microphone is on, or you are typing.',
  speaking: 'Your AI is answering.', presenting: 'Cards to look at: an answer with proposals.', attention: 'Not connected yet, or a knock.', sleepy: 'The panel has been quiet for a while.',
  celebrate: 'A moment the app confirmed: all of today’s habits done, a goal milestone or funding, a challenge finished, a meditation finished, the first sleep log of a day.', thinking: 'Waiting for your AI’s first words.',
  error: 'Something went wrong; it can be tried again.', 'reading-your-data': 'Your AI is looking at your records through ZIGi’s tools.', 'writing-proposal': 'A card is being written.',
  success: 'A small success: an answer on the device, an accepted card, a logged entry.', proud: 'A streak milestone the habit engine counted.', curious: 'ZIGi needs you to choose which one.',
  surprised: 'Your AI hinted at a surprise.', confused: 'ZIGi could not answer that here.', empathetic: 'A gentle look after a sensitive topic.', encouraging: 'Your week with ZIGi opens.',
  'wave-goodbye': 'The panel closes.', reminder: 'A reminder is due (the knock).', offline: 'The device is offline.', peek: 'The edge tab while ZIGi is hidden.', 'loading-model': 'Chrome’s on-device model is loading.',
};
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
    <header><h3 id={`zigi-state-${state}`}>{spec.label}</h3><p className="meet-zigi-meta"><span>{spec.code}</span> · <span>{spec.kind === 'loop' ? 'Loops while it lasts' : `Plays once · ${(spec.durationMs / 1000).toLocaleString('en-US')} s`}</span></p><p className="meet-zigi-meaning">{MEANINGS[state]}</p></header>
    <div className="meet-zigi-sizes" key={play}>{SIZES.map(size => <figure key={size.name}><ZigiAvatar state={state} size={size.px} skin={skin} className="zigi-play" decorative/><figcaption>{size.name}</figcaption></figure>)}</div>
    <p className="meet-zigi-meta">{files.files?.wears ? `Wears the ${ZIGI_MANIFEST.states[files.files.wears]?.label.toLowerCase()} clip for now, with this state’s own move.` : files.from ? files.from === state ? 'Its own clip.' : `Shows the ${ZIGI_MANIFEST.states[files.from]?.label.toLowerCase()} drawing for now.` : ZIGI_MANIFEST.skins[skin]?.placeholder ? 'The placeholder figure, with this state’s own move.' : 'The skin’s base drawing.'}{spec.fallback ? ` Falls back to ${ZIGI_MANIFEST.states[spec.fallback]?.label.toLowerCase()}.` : ''}</p>
    {spec.kind === 'one-shot' && <button type="button" className="secondary" onClick={() => setPlay(n => n + 1)} aria-label={`Play ${spec.label} again`}>Play again</button>}
  </article>;
}
export function MeetZigi() {
  return <div className="meet-zigi">
    <PageHeader titleId="meet-zigi-title" eyebrow="ZIGi · Your Personal AI Companion" title="Meet ZIGi." lede="Every state ZIGi can be in, as drawn by the studio. Eleven states have their own clip; the others wear one of them for now, each with its own small move on top."/>
    <p className="help-back"><Link className="text-link" href="/app/settings#zigi-look">← Back to Settings</Link></p>
    <section className="panel meet-zigi-motion" aria-labelledby="meet-zigi-motion"><h2 id="meet-zigi-motion">How much ZIGi moves</h2><AnimationChoice/><p className="ai-note">Your device&rsquo;s reduced-motion setting and Motion Off in Settings always come first: then every figure here holds still.</p></section>
    {Object.entries(ZIGI_MANIFEST.skins).map(([id, skin]) => <section key={id} className="panel meet-zigi-skin" aria-labelledby={`meet-zigi-skin-${id}`}>
      <h2 id={`meet-zigi-skin-${id}`}>{skin.label}{skin.placeholder ? ' (placeholder)' : ''}</h2>
      <div className="meet-zigi-grid">{ZIGI_STATES.map(state => <StateCard key={state} state={state} skin={id}/>)}</div>
    </section>)}
  </div>;
}
