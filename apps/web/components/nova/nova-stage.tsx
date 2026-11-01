'use client';
import Link from 'next/link';
import {useDeviceRecord} from '../ai/use-device-record';
import {NOVA_SETUP, setupProgress, showSetupCard, setCardHidden} from '../../lib/nova/setup';
import {ORB_STATE_LABEL, type NovaOrbState} from '../../lib/nova/orb';
import {formatDate, formatTime} from '../../lib/visual-format';
import {novaAndZigi} from '../../lib/nova/one-line';
import {NovaOrb} from './orb';
import {PersonaMark} from './persona-mark';
import type {Brain} from './status-chips';
import type {Persona} from '../../lib/nova/store';

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
export function NovaStage({persona, orb, greeting, typed, brain, showcase, onTalk, talkOpen}: {
  persona: Persona; orb: NovaOrbState; greeting: string; typed: number; brain: Brain; showcase: boolean; onTalk: () => void; talkOpen: boolean;
}) {
  const setup = useDeviceRecord(NOVA_SETUP), progress = setupProgress(setup.data);
  const card = setup.loaded && !setup.unreadable && showSetupCard(setup.data);
  const letters = persona.name.toUpperCase().split('').join('·').replace(/·\s·/g, ' ');
  return <div className="nova-stage">
    <svg className="nova-rings" viewBox="-500 -500 1000 1000" aria-hidden="true" focusable="false" preserveAspectRatio="xMidYMid meet">
      <circle className="nova-ring nova-ring-1" r="190"/><circle className="nova-ring nova-ring-2" r="300"/><circle className="nova-ring nova-ring-3" r="420"/>
      <circle className="nova-ring-moon" cx="300" cy="0" r="5"/><circle className="nova-ring-moon nova-ring-moon-2" cx="-150" cy="-390" r="3.5"/>
    </svg>
    <p className="nova-name" aria-hidden="true">{letters}</p>
    <button type="button" className="nova-orb-button" onClick={onTalk} aria-expanded={talkOpen} aria-controls={talkOpen ? "nova-talk" : undefined} aria-describedby="nova-orb-state">
      {persona.avatar === 'zigi' ? <PersonaMark avatar="zigi" size={170} state={orb}/> : <NovaOrb state={orb} size={220}/>}
      <span className="sr-only">Talk to {persona.name}</span>
    </button>
    <p className="nova-orb-state" id="nova-orb-state"><span className="nova-orb-state-word">{ORB_STATE_LABEL[orb]}</span><span className="nova-orb-state-hint">{orb === 'idle' ? 'Tap to talk' : orb === 'listening' ? 'Speak now' : orb === 'thinking' ? 'Working on it' : 'Answering'}</span></p>
    {/* Release review 2 (R2-22): the greeting is in the page once; the part still to type waits invisible in place (read by
        assistive technology as one sentence, and the line keeps its width while it types). */}
    <p className="nova-greeting">{greeting.slice(0, typed)}<span className="nova-caret" aria-hidden="true" data-done={typed >= greeting.length || undefined}/>{typed < greeting.length && <span className="nova-greeting-rest">{greeting.slice(typed)}</span>}</p>
    {showcase && <p className="nova-showcase"><span className="nova-chip-dot" aria-hidden="true"/>Showcase · fictional example data</p>}
    {card && <section className="nova-setup-card" aria-labelledby="nova-setup-title">
      <h2 id="nova-setup-title">{brain.kind === 'none' ? `Build ${persona.name}’s brain` : `Finish building ${persona.name}`}</h2>
      {/* Release review 2 (R2-3, R2-4): one short line that says what NOVA is next to ZIGi, and what a brain adds. */}
      <p>{brain.kind === 'none' ? `${novaAndZigi(persona.name)} It answers simple questions on this device already; a model of your own makes it a full assistant.` : `${progress.done} of ${progress.total} steps done. Each step is short and has its own check.`}</p>
      <div className="nova-setup-actions">
        <Link className="nova-btn nova-btn-primary" href="/app/nova/setup" prefetch={false}>{progress.done ? 'Continue the guide' : 'Start the guide'}</Link>
        <button type="button" className="nova-btn" onClick={() => { try { setup.update(r => setCardHidden(r, true)); } catch { /* storage refused: the card simply stays */ } }}>Not now</button>
      </div>
    </section>}
  </div>;
}
