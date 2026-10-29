'use client';
import Link from 'next/link';
import {useState} from 'react';
import {PageHeader} from '../page-header';
import {OrbitArt} from '../header-art/orbit-art';
import {TemplatesGlyph} from '../header-art/glyphs/templates';
import {PillarMark} from '../pillars';
import {ConfirmInline} from '../ui/confirm-inline';
import {useDeviceRecord} from '../ai/use-device-record';
import {useLocalToday} from '../use-local-today';
import {GUIDED_PROGRAMS, type GuidedProgram} from '../../lib/guided/programs';
import {GUIDED_JOURNEYS, type GuidedJourney, type GuidedJourneys} from '../../lib/guided/schema';
import {GuidedError, activeJourneyFor, activeJourneys, addCalendarDays, endJourney, journeyState, markDone, progressLine, startJourney, startRefusal, undoDone} from '../../lib/guided/engine';
import {saveFailureMessage} from '../../lib/storage-error-copy';
import {formatDate} from '../../lib/visual-format';
import './guided.css';

/**
 * /app/guided (Session AJ, item 34, D13, A7): Guided journeys. The person chooses a short program (nothing here
 * recommends one); one step opens each day from the day they started, with a short note and a link that opens the app's
 * own flow. The person ticks a step done themselves; nothing is created for them. Kept on this device
 * (`zigoals:guided-journeys:v1`). No animation beyond a short colour change, and none under reduced motion or Motion Off.
 */
export function GuidedView() {
  const record = useDeviceRecord(GUIDED_JOURNEYS), today = useLocalToday();
  const [message, setMessage] = useState(''), [ending, setEnding] = useState<string | null>(null);
  const focus = (id: string) => requestAnimationFrame(() => document.getElementById(id)?.focus({preventScroll: false}));
  const act = (change: (r: GuidedJourneys) => GuidedJourneys, words: string, then?: () => void): void => {
    try { record.update(change); setMessage(words); then?.(); }
    catch (error) { setMessage(error instanceof GuidedError ? error.message : saveFailureMessage(error)); }
  };
  const active = record.loaded ? activeJourneys(record.data) : [];
  return <div className="guided-page">
    <PageHeader className="page-heading guided-hero" titleId="guided-title" eyebrow="Guided journeys" title="Small steps, one a day"
      lede="Short programs built from the app’s own templates. Choose one if you like: a step opens each day, with a short note and a link to do it. You tick it done yourself, and nothing is added for you."
      art={<OrbitArt glyph={TemplatesGlyph} spin={-26} />} />
    {!record.loaded ? <div className="aa-skeleton" aria-hidden="true"><i /><i /><i /></div> : <>
      {record.unreadable && <p className="notice" role="status">Your guided journeys on this device could not be read. Starting a journey begins a new list.</p>}
      <section className="guided-section" aria-labelledby="guided-active-title">
        <h2 id="guided-active-title" tabIndex={-1}>Your journeys</h2>
        {active.length ? <div className="guided-journeys">{active.map(({journey, program}) =>
          <JourneyCard key={program.id} journey={journey} program={program} today={today} ending={ending === program.id}
            onDone={(stepId, title) => act(r => markDone(r, program.id, stepId, today), `Done: ${title}.`)}
            onUndo={(stepId, title) => act(r => undoDone(r, program.id, stepId, today), `No longer marked done: ${title}.`)}
            onAskEnd={() => { setEnding(program.id); setMessage(''); }} onCancelEnd={() => setEnding(null)}
            onEnd={() => act(r => endJourney(r, program.id, today), `Ended: ${program.title}. The steps you ticked stay ticked.`, () => { setEnding(null); focus('guided-active-title'); })} />)}
        </div> : <p className="guided-empty">No journey yet. Choose one below whenever you like, or none at all.</p>}
      </section>
      <section className="guided-section" aria-labelledby="guided-programs-title">
        <h2 id="guided-programs-title">Choose a journey</h2>
        <ul className="guided-programs">{GUIDED_PROGRAMS.map(p => {
          const refusal = startRefusal(record.data, p.id), on = !!activeJourneyFor(record.data, p.id);
          return <li key={p.id} className="panel guided-program" data-pillar={p.pillar}>
            <div className="guided-title-row"><PillarMark pillar={p.pillar} size={14} /><h3>{p.title}</h3></div>
            <p>{p.summary}</p>
            <p className="guided-meta">{p.steps.length} days · one step a day</p>
            {p.care && <p className="fine guided-care">{p.care}</p>}
            <details className="guided-preview"><summary>See the steps</summary><ol>{p.steps.map(s => <li key={s.id}>{s.title}</li>)}</ol></details>
            {on ? <p className="guided-on">You are on this journey.</p>
              : refusal ? <p className="fine">{refusal}</p>
              : <button type="button" className="primary guided-start" aria-label={`Start: ${p.title}`}
                  onClick={() => act(r => startJourney(r, p.id, today), `Started: ${p.title}. Step 1 is open today.`, () => focus(`guided-journey-${p.id}`))}>Start</button>}
          </li>;
        })}</ul>
      </section>
      <p className="guided-message" role="status" aria-live="polite">{message}</p>
    </>}
  </div>;
}

function JourneyCard({journey, program, today, ending, onDone, onUndo, onAskEnd, onCancelEnd, onEnd}: {
  journey: GuidedJourney; program: GuidedProgram; today: string; ending: boolean;
  onDone: (stepId: string, title: string) => void; onUndo: (stepId: string, title: string) => void;
  onAskEnd: () => void; onCancelEnd: () => void; onEnd: () => void;
}) {
  const state = journeyState(journey, program, today), titleId = `guided-journey-${program.id}`;
  return <article className="panel guided-journey" data-pillar={program.pillar} aria-labelledby={titleId}>
    <div className="guided-title-row"><PillarMark pillar={program.pillar} size={14} /><h3 id={titleId} tabIndex={-1}>{program.title}</h3></div>
    <p className="guided-meta">{state.day < 1 ? `Step 1 opens on ${formatDate(journey.startedOn, {weekday: true, year: false})}.` : progressLine(journey, program, today)}</p>
    <ol className="guided-steps">
      {state.unlocked.map((step, i) => {
        const done = journey.done.includes(step.id), isToday = state.today?.id === step.id;
        return <li key={step.id} className="guided-step" data-done={done || undefined} data-today={isToday || undefined}>
          <p className="eyebrow guided-step-number">Step {i + 1}{isToday ? ' · Today' : ''}</p>
          <h4>{step.title}</h4>
          {(!done || isToday) && <p className="guided-note">{step.note}</p>}
          <div className="guided-step-actions">
            <Link className="secondary" href={step.action.href}>{step.action.label}</Link>
            {done ? <><span className="guided-done-mark"><span aria-hidden="true">✓ </span>Done</span>
              <button type="button" className="quiet" aria-label={`Undo: ${step.title}`} onClick={() => onUndo(step.id, step.title)}>Undo</button></>
              : <button type="button" className="primary" aria-label={`Done: ${step.title}`} onClick={() => onDone(step.id, step.title)}>Done</button>}
          </div>
        </li>;
      })}
      {state.next && <li className="guided-step guided-locked">
        <p className="eyebrow guided-step-number">Step {state.next.number}</p>
        <p className="guided-note">{state.next.opensOn === addCalendarDays(today, 1) ? 'Unlocks tomorrow' : `Unlocks on ${formatDate(state.next.opensOn, {weekday: true, year: false})}`}</p>
      </li>}
    </ol>
    {state.complete && <p className="guided-on">Every step is done. Well done for seeing it through.</p>}
    {program.care && <p className="fine guided-care">{program.care}</p>}
    <div className="guided-end">{ending
      ? <ConfirmInline title="End this journey?" confirmLabel="End this journey" tone="neutral" onConfirm={onEnd} onCancel={onCancelEnd}>
          <p>The steps you ticked stay ticked, and no step opens after today. You can start it again later, from step 1.</p></ConfirmInline>
      : <button type="button" className="quiet" onClick={onAskEnd}>End this journey</button>}</div>
  </article>;
}
