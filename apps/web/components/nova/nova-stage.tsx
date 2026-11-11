'use client';
import Link from 'next/link';
import {Suspense, lazy, useEffect, useState, type CSSProperties, type ReactNode} from 'react';
import {LoadBoundary} from '../load-boundary';
import {useDeviceRecord} from '../ai/use-device-record';
import {NOVA_SETUP, setupProgress, showSetupCard, setCardHidden} from '../../lib/nova/setup';
import {ORB_STATE_LABEL, typedLength, type NovaOrbState} from '../../lib/nova/orb';
import {formatDate, formatTime} from '../../lib/visual-format';
import {NovaOrb} from './orb';
import {PersonaMark} from './persona-mark';
import type {Brain} from './status-chips';
import type {Persona} from '../../lib/nova/store';
import type {NovaCounts} from './use-counts';

/** Session AK P3 (ND-3): the day line, its own chunk (it reads today's orbit). */
const NovaDayLine = lazy(() => import('./day-line'));

/**
 * Session AK (owner follow-up 2, N2; lane NA): the heart of the star system. NOVA's name, the orb (or ZIGi, if the person
 * chose ZIGi as NOVA's avatar) inside its rings, its state in words, the greeting that types in once, and the local time.
 * The orb is a button: it opens the conversation ("Tap to talk"). Without a model, a calm card invites building the NOVA
 * brain with the guide (NC's progress, lib/nova/setup.ts); on-device answers work from minute one.
 */
export function NovaClock({now, compact = false}: {now: Date | null; compact?: boolean}) {
  return <p className={`nova-clock${compact ? ' nova-clock-compact' : ''}`} aria-live="off">
    <span className="nova-clock-label">Local time</span>
    <time className="nova-clock-time" dateTime={now ? now.toISOString() : undefined}>{now ? formatTime(now) : ' '}</time>
    <span className="nova-clock-date">{now ? formatDate(now, {weekday: true, year: false}) : ' '}</span>
  </p>;
}
/** The greeting, typed in once while the opening plays (`typingFrom`: when it started; null: shown whole). It keeps its
 *  own clock, so only this line re-renders as it types (Session AK P8, lane M7: the whole dashboard used to, every 32 ms). */
function NovaGreeting({greeting, typingFrom}: {greeting: string; typingFrom: number | null}) {
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    if (typingFrom === null) return;
    const id = window.setInterval(() => setElapsed(performance.now() - typingFrom), 32);
    return () => window.clearInterval(id);
  }, [typingFrom]);
  // Design review AM-D34: the line is revealed word by word (the caret never stands inside a word, which read as broken spacing).
  const raw = typingFrom === null ? greeting.length : typedLength(greeting, elapsed), typed = raw >= greeting.length ? greeting.length : Math.max(0, greeting.lastIndexOf(' ', raw));
  return <p className="nova-greeting">{greeting.slice(0, typed)}<span className="nova-caret" aria-hidden="true" data-done={typed >= greeting.length || undefined}/>{typed < greeting.length && <span className="nova-greeting-rest">{greeting.slice(typed)}</span>}</p>;
}
/**
 * Session AK P3 (ND-1, ND-23): a fixed stack with the orb at its middle — the name above it; its state, the greeting, the
 * day line and the Showcase label below — so the star sits at the optical centre of whatever holds it (the window, on the
 * Orbit, Minimal and phone layouts). The setup invitation left the stack: it is the slim banner under the status chips.
 */
export function NovaStage({persona, orb, greeting, typingFrom, counts, showcase, onTalk, talkOpen, core, star, starOn = false, starBox, answer}: {
  persona: Persona; orb: NovaOrbState; greeting: string; typingFrom: number | null; counts: NovaCounts; showcase: boolean; onTalk: () => void; talkOpen: boolean;
  /** Session AM (ADR-038 D10): the nebula star system's canvas, and whether it is drawing (then the SVG orb gives way to it). */
  star?: ReactNode; starOn?: boolean;
  /** The height the star's disc needs inside the stack (CSS px), so the words under it never sit on the nebula. */
  starBox?: number;
  /** Session AM (D7): NOVA's newest words, shown in place of the greeting and the day line while there is an answer. */
  answer?: ReactNode;
  /** Session AL Part 11 (lane L8): the Holo core — four pillar rings around the orb and their readout under its state. */
  core?: {rings: ReactNode; readout: ReactNode};
}) {
  const letters = persona.name.toUpperCase().split('').join('·').replace(/·\s·/g, ' ');
  // Design review AM-D14: the words under the star live in a slot of fixed height (nova.css), so the star's centre is the
  // same with the greeting, a one-line answer or a long one; `data-answer` lets the sheet size what stands in the slot.
  return <div className="nova-stage" data-holo-core={core ? '' : undefined} data-answer={answer ? '' : undefined}>
    <svg className="nova-rings" viewBox="-500 -500 1000 1000" aria-hidden="true" focusable="false" preserveAspectRatio="xMidYMid meet">
      <circle className="nova-ring nova-ring-1" r="190"/><circle className="nova-ring nova-ring-2" r="300"/><circle className="nova-ring nova-ring-3" r="420"/>
      {/* ND-16: both moons ride the middle ring, on arcs the side columns leave open. */}
      <circle className="nova-ring-moon" cx="300" cy="0" r="5"/><circle className="nova-ring-moon nova-ring-moon-2" cx="-150" cy="-260" r="3.5"/>
    </svg>
    <div className="nova-stage-above"><p className="nova-name" aria-hidden="true">{letters}</p></div>
    <button type="button" className="nova-orb-button" onClick={onTalk} aria-expanded={talkOpen} aria-controls={talkOpen ? "nova-talk" : undefined} aria-describedby="nova-orb-state" data-star={starOn && persona.avatar !== 'zigi' ? '' : undefined} style={starOn && starBox && persona.avatar !== 'zigi' ? {'--star-box': `${starBox}px`} as CSSProperties : undefined}>
      {persona.avatar !== 'zigi' && star}
      {persona.avatar === 'zigi' ? <PersonaMark avatar="zigi" size={170} state={orb}/> : <NovaOrb state={orb} size={220}/>}
      <span className="sr-only">Talk to {persona.name}</span>
      {core?.rings}
    </button>
    <div className="nova-stage-below">
      <p className="nova-orb-state" id="nova-orb-state" data-state={orb}><span className="nova-orb-state-word">{ORB_STATE_LABEL[orb]}</span><span className="nova-orb-state-hint">{orb === 'idle' ? 'Tap to talk' : orb === 'listening' ? 'Speak now' : orb === 'thinking' ? 'Working on it' : 'Answering'}</span></p>
      {/* Review M4, B2 (lane L8d): the core's readout — its legend — sits right under the orb's state, ordered as the rings
          are (outer to inner), above the greeting; it used to fall under the command field at 1440 px. */}
      {!answer && core?.readout}
      {/* Release review 2 (R2-22): the greeting is in the page once; the part still to type waits invisible in place (read by
          assistive technology as one sentence, and the line keeps its width while it types). */}
      {answer ?? <>
        <NovaGreeting key={typingFrom ?? 'done'} greeting={greeting} typingFrom={typingFrom}/>
        <LoadBoundary quiet><Suspense fallback={<p className="nova-dayline"> </p>}><NovaDayLine counts={counts}/></Suspense></LoadBoundary>
      </>}
      {showcase && <p className="nova-showcase"><span className="nova-chip-dot" aria-hidden="true"/>Showcase · fictional example data</p>}
    </div>
  </div>;
}

/**
 * Session AK P3 (ND-23, ND-1): the invitation to build NOVA's brain, as one slim line under the status chips (it used to
 * sit in the star's stack, four lines long, and pushed the star down). What NOVA is next to ZIGi is said on the guide's
 * first planet, "Meet NOVA", and in the conversation's welcome. "Not now" hides it on this device (NC's setup record).
 */
export function NovaSetupBanner({persona, brain}: {persona: string; brain: Brain}) {
  const setup = useDeviceRecord(NOVA_SETUP), progress = setupProgress(setup.data);
  if (!setup.loaded || setup.unreadable || !showSetupCard(setup.data)) return null;
  const title = brain.kind === 'none' ? `Give ${persona} a brain of its own` : `Finish building ${persona}`;
  return <section className="nova-setup-banner" aria-labelledby="nova-setup-title">
    <div className="nova-setup-banner-text"><h2 id="nova-setup-title">{title}</h2>
      <p>{brain.kind === 'none' ? 'It already answers simple questions on this device.' : `${progress.done} of ${progress.total} steps done.`}</p></div>
    <div className="nova-setup-actions">
      <Link className="nova-btn nova-btn-primary" href="/app/nova/setup" prefetch={false}>{progress.done ? 'Continue the guide' : 'Start the guide'}</Link>
      <button type="button" className="nova-btn" onClick={() => { try { setup.update(r => setCardHidden(r, true)); } catch { /* storage refused: the banner simply stays */ } }}>Not now</button>
    </div>
  </section>;
}
