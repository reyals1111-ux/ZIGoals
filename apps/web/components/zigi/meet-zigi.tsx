'use client';
import Link from 'next/link';
import {useEffect, useRef, useState, useSyncExternalStore} from 'react';
import {PageHeader} from '../page-header';
import {OrbitArt} from '../header-art/orbit-art';
import {ZigiGlyph} from '../header-art/glyphs/zigi';
import {AnimationChoice} from '../ai/zigi-customize';
import {extraClipsOf, ZIGI_MANIFEST, type ExtraClip, type Skin, type ZigiState} from './manifest';
import {GALLERY_GROUPS, MOVE_GROUPS, MOVE_TEXT, STATE_TEXT} from './state-gallery';
import {motionAllowed, supportsAnimatedWebp, watchMotion} from './motion';
import {ZigiImage} from './zigi-image';
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
/** Session AK Part 13: the Studio-4 moves of a skin that the gallery has words for, by code. */
const movesOf = (skin: Skin) => extraClipsOf(skin).filter(m => MOVE_TEXT[m.code]);
const still = () => false;
let apng = false;
if (typeof window !== 'undefined') void supportsAnimatedWebp().then(ok => { apng = !ok; });
/** Session AK Part 13: one Studio-4 move at the three sizes; its clip only while motion is allowed and it is in view, else its stills. */
function MoveCard({code, clip}: {code: string; clip: ExtraClip}) {
  const text = MOVE_TEXT[code]!, [play, setPlay] = useState(0), card = useRef<HTMLElement>(null), [onScreen, setOnScreen] = useState(true);
  const motion = useSyncExternalStore(watchMotion, motionAllowed, still);
  useEffect(() => {
    const el = card.current; if (!el || typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(([entry]) => setOnScreen(!!entry?.isIntersecting));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  const animated = motion && onScreen ? (apng ? clip.files.animatedFallback : clip.files.animated) ?? null : null;
  const one = clip.files['1x']!, two = clip.files['2x'] ?? one;
  return <article ref={card} className="meet-zigi-move" data-move={code} aria-labelledby={`zigi-move-${code}`}>
    <header><h4 id={`zigi-move-${code}`}>{text.label}</h4><p className="meet-zigi-meta"><span>{clip.kind === 'loop' ? 'Moves while it lasts' : `A short move, about ${Math.max(1, Math.round(clip.durationMs / 1000)).toLocaleString('en-US')} s`}</span></p><p className="meet-zigi-meaning">{text.meaning}</p><p className="meet-zigi-when"><strong>When it appears:</strong> {text.when}</p></header>
    <div className="meet-zigi-sizes" key={play}>{SIZES.map(size => <figure key={size.name}><span className="zigi zigi-move" style={{width: size.px, height: Math.round(size.px * 126 / 96)}}><ZigiImage poster={{src: one, srcSet: `${one} 1x, ${two} 2x`}} animated={animated} width={size.px} height={Math.round(size.px * 126 / 96)} alt="" decorative/></span><figcaption>{size.name}</figcaption></figure>)}</div>
    {clip.kind === 'one-shot' && <button type="button" className="secondary" onClick={() => setPlay(n => n + 1)} aria-label={`Play again: ${text.label}`}>Play again</button>}
  </article>;
}
/** Session AK G2 (RELEASE_REVIEW R26): the address that opens the gallery on arrival. */
const GALLERY_HASH = '#every-look';
export function MeetZigi() {
  // The gallery (every state of every skin, three sizes each) mounts when it is opened, so the page leads with what ZIGi
  // does and loads no figure until the person asks to see them.
  const [gallery, setGallery] = useState(false);
  useEffect(() => { const open = () => { if (window.location.hash === GALLERY_HASH) setGallery(true); }; open(); window.addEventListener('hashchange', open); return () => window.removeEventListener('hashchange', open); }, []);
  return <div className="meet-zigi">
    <PageHeader titleId="meet-zigi-title" eyebrow="ZIGi · Your Personal AI Companion" title="Meet ZIGi." art={<OrbitArt glyph={ZigiGlyph} spin={-14}/>} lede="Your companion on every page: it answers from your own records and proposes changes you confirm."/>
    <p className="help-back"><Link className="text-link" href="/app/settings#zigi-look">← Back to Settings</Link></p>
    {/* Session AK G2 (RELEASE_REVIEW R26): what ZIGi does and the privacy line first; the state gallery under a fold. */}
    <section className="panel meet-zigi-about" aria-labelledby="meet-zigi-about">
      <h2 id="meet-zigi-about">What ZIGi can do</h2>
      <ul className="meet-zigi-can">
        <li><strong>Answers about your day.</strong> Ask how your goals, habits, health or money are going; simple questions are answered on this device.</li>
        <li><strong>Helps you log and plan.</strong> When you ask it to log or create something, it shows a card first. You add it, edit it or dismiss it; ZIGi never writes anything by itself.</li>
        <li><strong>Uses the AI you choose.</strong> Connect your own key or a model running on your computer in Settings.</li>
      </ul>
      <p className="meet-zigi-privacy"><strong>Private by design.</strong> Your records stay on this device. A question goes only to the AI you connected, straight from this browser; ZIGoals never sees it and logs nothing.</p>
      <p className="meet-zigi-setup"><Link className="text-link" href="/app/settings#your-ai">Set up ZIGi in Settings →</Link></p>
    </section>
    <section className="panel meet-zigi-motion" aria-labelledby="meet-zigi-motion"><h2 id="meet-zigi-motion">How much ZIGi moves</h2><AnimationChoice/><p className="ai-note">Your device&rsquo;s reduced-motion setting and Motion Off in Settings always come first: then every figure here holds still.</p></section>
    <details className="panel meet-zigi-gallery" id="every-look" open={gallery} onToggle={e => setGallery(e.currentTarget.open)}>
      <summary><span><strong>Every way ZIGi can look</strong><small>What each look means and when it appears.</small></span></summary>
      {gallery && Object.entries(ZIGI_MANIFEST.skins).map(([id, skin]) => <section key={id} className="meet-zigi-skin" aria-labelledby={`meet-zigi-skin-${id}`}>
        <h2 id={`meet-zigi-skin-${id}`}>{skin.label}</h2>
        {GALLERY_GROUPS.map(group => <section key={group.id} className="meet-zigi-group" aria-labelledby={`meet-zigi-${id}-${group.id}`}>
          <h3 id={`meet-zigi-${id}-${group.id}`}>{group.title}</h3><p className="meet-zigi-group-line">{group.line}</p>
          <div className="meet-zigi-grid">{GALLERY_ORDER.filter(state => STATE_TEXT[state].group === group.id).map(state => <StateCard key={state} state={state} skin={id}/>)}</div>
        </section>)}
        {/* Session AK Part 13: Studio-4's extra moves, each group in the table's order. */}
        {MOVE_GROUPS.map(group => { const moves = movesOf(skin).filter(m => MOVE_TEXT[m.code]!.group === group.id).sort((a, b) => a.code.localeCompare(b.code)); return moves.length ? <section key={group.id} className="meet-zigi-group" aria-labelledby={`meet-zigi-${id}-move-${group.id}`}>
          <h3 id={`meet-zigi-${id}-move-${group.id}`}>{group.title}</h3><p className="meet-zigi-group-line">{group.line}</p>
          <div className="meet-zigi-grid">{moves.map(m => <MoveCard key={m.code} code={m.code} clip={m.clip}/>)}</div>
        </section> : null; })}
      </section>)}
    </details>
  </div>;
}
