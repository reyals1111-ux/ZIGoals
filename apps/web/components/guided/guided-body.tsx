'use client';
import Link from 'next/link';
import {useEffect, useState} from 'react';
import {PillarMark} from '../pillars';
import {ConfirmInline} from '../ui/confirm-inline';
import type {DeviceRecordState} from '../ai/use-device-record';
import {GUIDED_PROGRAMS, type GuidedProgram, type ProgrammeDay} from '../../lib/guided/programs';
import type {GuidedJourney, GuidedJourneys} from '../../lib/guided/schema';
import {GuidedError, activeJourneyFor, activeJourneys, addCalendarDays, dayProgress, endJourney, isStepDone, journeyState, markDone, programmeToday, progressLine, startJourney, startRefusal, tickStep, undoDone, untickStep} from '../../lib/guided/engine';
import {ReadAloud} from '../read-aloud/read-aloud';
import {saveFailureMessage} from '../../lib/storage-error-copy';
import {formatDate} from '../../lib/visual-format';

/**
 * Session AW Part 2 (speed, attempt 2): the Guided journeys page once its record has loaded — the journeys going, the
 * written programmes and the journeys to choose — in a chunk of its own (components/guided/guided-view.tsx asks for it as
 * the page starts, and shows the same skeleton until both it and the record are there). The programmes' text, the
 * engine and Read aloud are no longer in the page's first scripts; what is drawn, and when, is as before.
 */
export default function GuidedBody({record, today}: {record: DeviceRecordState<GuidedJourneys>; today: string}) {
  const [message, setMessage] = useState(''), [ending, setEnding] = useState<string | null>(null);
  const focus = (id: string) => requestAnimationFrame(() => document.getElementById(id)?.focus({preventScroll: false}));
  const act = (change: (r: GuidedJourneys) => GuidedJourneys, words: string, then?: () => void): void => {
    try { record.update(change); setMessage(words); then?.(); }
    catch (error) { setMessage(error instanceof GuidedError ? error.message : saveFailureMessage(error)); }
  };
  const active = activeJourneys(record.data);
  // Session AW (programmes): a pillar's link (?programme=<id>) opens the page at that programme: its journey when it is
  // going, else its card to start, scrolled to and focused once the record has loaded (this part draws only then).
  const [asked, setAsked] = useState<string | null>(null);
  useEffect(() => {
    let id: string | null = null;
    try { id = new URLSearchParams(location.search).get('programme'); } catch { id = null; }
    if (!id || !GUIDED_PROGRAMS.some(p => p.id === id && p.days)) return;
    queueMicrotask(() => setAsked(id));
    const target = activeJourneyFor(record.data, id) ? `guided-journey-${id}` : `guided-program-title-${id}`;
    requestAnimationFrame(() => { const el = document.getElementById(target); el?.scrollIntoView({block: 'start'}); el?.focus({preventScroll: true}); });
    // Only once, when the page opens with the address.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const journeys = GUIDED_PROGRAMS.filter(p => !p.days), programmes = GUIDED_PROGRAMS.filter(p => p.days);
  const startButton = (p: GuidedProgram) => {
    const refusal = startRefusal(record.data, p.id), on = !!activeJourneyFor(record.data, p.id);
    return on ? <p className="guided-on">{p.days ? 'You are on this programme.' : 'You are on this journey.'}</p>
      : refusal ? <p className="fine">{refusal}</p>
      : <button type="button" className="primary guided-start" aria-label={`Start: ${p.title}`}
          onClick={() => act(r => startJourney(r, p.id, today), p.days ? `Started: ${p.title}. ${p.dayWord ?? 'Day'} 1 is open today.` : `Started: ${p.title}. Step 1 is open today.`, () => focus(`guided-journey-${p.id}`))}>Start</button>;
  };
  return <>
      {record.unreadable && <p className="notice" role="status">Your guided journeys on this device could not be read. Starting a journey begins a new list.</p>}
      <section className="guided-section" aria-labelledby="guided-active-title">
        <h2 id="guided-active-title" tabIndex={-1}>Your journeys</h2>
        {active.length ? <div className="guided-journeys">{active.map(({journey, program}) => program.days
          ? <ProgrammeCard key={program.id} journey={journey} program={program} days={program.days} today={today} ending={ending === program.id}
            onTick={(day, stepId, title) => act(r => tickStep(r, program.id, day.id, stepId, today), `Done: ${title}.`)}
            onUntick={(day, stepId, title) => act(r => untickStep(r, program.id, day.id, stepId, today), `No longer marked done: ${title}.`)}
            onDay={(day, words) => act(r => markDone(r, program.id, day.id, today), `${words} is done. Every step of it is ticked.`)}
            onUndoDay={(day, words) => act(r => undoDone(r, program.id, day.id, today), `${words} is no longer done; its steps are unticked.`)}
            onAskEnd={() => { setEnding(program.id); setMessage(''); }} onCancelEnd={() => setEnding(null)}
            onEnd={() => act(r => endJourney(r, program.id, today), `Ended: ${program.title}. The days and steps you ticked stay ticked.`, () => { setEnding(null); focus('guided-active-title'); })} />
          : <JourneyCard key={program.id} journey={journey} program={program} today={today} ending={ending === program.id}
            onDone={(stepId, title) => act(r => markDone(r, program.id, stepId, today), `Done: ${title}.`)}
            onUndo={(stepId, title) => act(r => undoDone(r, program.id, stepId, today), `No longer marked done: ${title}.`)}
            onAskEnd={() => { setEnding(program.id); setMessage(''); }} onCancelEnd={() => setEnding(null)}
            onEnd={() => act(r => endJourney(r, program.id, today), `Ended: ${program.title}. The steps you ticked stay ticked.`, () => { setEnding(null); focus('guided-active-title'); })} />)}
        </div> : <div className="guided-empty">
          {/* Session AW (programmes): the empty state teaches what each kind is, and that nothing happens by itself. */}
          <p>No journey or programme yet. Choose one below whenever you like, or none at all.</p>
          <ul>
            <li><strong>A journey</strong> is a week or so of small steps, one a day.</li>
            <li><strong>A programme</strong> is a written plan: each day has a few steps, each with a link to the place in the app where you do it. A weekly plan leaves rest days between sessions.</li>
            <li>You tick every step yourself; a day you miss stays open, and nothing is added for you.</li>
          </ul>
        </div>}
      </section>
      {/* Session AW (programmes; owner decision 1d): the five written programmes, reached here and from their pillars. */}
      <section className="guided-section" aria-labelledby="guided-programmes-title">
        <h2 id="guided-programmes-title">Written programmes</h2>
        <ul className="guided-programs">{programmes.map(p => <li key={p.id} id={`guided-program-${p.id}`} className="panel guided-program" data-pillar={p.pillar} data-asked={asked === p.id || undefined}>
          <div className="guided-title-row"><PillarMark pillar={p.pillar} size={14} /><h3 id={`guided-program-title-${p.id}`} tabIndex={-1}>{p.title}</h3></div>
          <p>{p.summary}</p>
          <p className="guided-meta">{programmeMeta(p)}</p>
          {p.care && <p className="fine guided-care">{p.care}</p>}
          <details className="guided-preview"><summary>See the {p.dayWord === 'Session' ? 'sessions' : p.dayWord === 'Run' ? 'runs' : 'days'}<span className="sr-only">: {p.title}</span></summary><ol>{p.days!.map(d => <li key={d.id}>{p.weeks ? `Week ${d.week}: ` : ''}{d.title}</li>)}</ol></details>
          {startButton(p)}
        </li>)}</ul>
      </section>
      <section className="guided-section" aria-labelledby="guided-programs-title">
        <h2 id="guided-programs-title">Choose a journey</h2>
        <ul className="guided-programs">{journeys.map(p => <li key={p.id} className="panel guided-program" data-pillar={p.pillar}>
          <div className="guided-title-row"><PillarMark pillar={p.pillar} size={14} /><h3>{p.title}</h3></div>
          <p>{p.summary}</p>
          <p className="guided-meta">{p.steps.length} days · one step a day</p>
          {p.care && <p className="fine guided-care">{p.care}</p>}
          <details className="guided-preview"><summary>See the steps</summary><ol>{p.steps.map(s => <li key={s.id}>{s.title}</li>)}</ol></details>
          {startButton(p)}
        </li>)}</ul>
      </section>
      <p className="guided-message" role="status" aria-live="polite">{message}</p>
  </>;
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

/** Session AW: a programme's length in plain words. */
function programmeMeta(p: GuidedProgram): string {
  const n = p.days?.length ?? 0;
  if (p.weeks) return `${n} ${p.dayWord === 'Run' ? 'runs' : 'sessions'} over ${p.weeks} weeks · three a week, a rest day after each`;
  return `${n} days · a few steps each day`;
}
/** The words Read aloud reads for a programme day: its title, its note, then each step and its instruction. */
const dayWords = (day: ProgrammeDay, label: string): string => [`${label}. ${day.title}.`, day.note, ...day.steps.map((s, i) => `Step ${i + 1}. ${s.title}. ${s.detail}`)].join(' ');
const opensWords = (opensOn: string, today: string) => opensOn === addCalendarDays(today, 1) ? 'tomorrow' : `on ${formatDate(opensOn, {weekday: true, year: false})}`;

/**
 * Session AW (programmes): a written programme that is going. Its open days, today's first and open; each day's steps with
 * their written instruction, their link and Done or Undo; the whole day done or undone; Read aloud in the device's own
 * voice (shown only with one). Rest days say when the next day opens. A day missed stays open.
 */
function ProgrammeCard({journey, program, days, today, ending, onTick, onUntick, onDay, onUndoDay, onAskEnd, onCancelEnd, onEnd}: {
  journey: GuidedJourney; program: GuidedProgram; days: readonly ProgrammeDay[]; today: string; ending: boolean;
  onTick: (day: ProgrammeDay, stepId: string, title: string) => void; onUntick: (day: ProgrammeDay, stepId: string, title: string) => void;
  onDay: (day: ProgrammeDay, words: string) => void; onUndoDay: (day: ProgrammeDay, words: string) => void;
  onAskEnd: () => void; onCancelEnd: () => void; onEnd: () => void;
}) {
  const state = journeyState(journey, program, today), now = programmeToday(journey, program, today), word = program.dayWord ?? 'Day', titleId = `guided-journey-${program.id}`;
  const open = days.slice(0, state.unlocked.length);
  // The day shown open: today's, else the first open day not done yet.
  // Chosen when the card first shows, so ticking the last step never folds the day away under the person's hand.
  const [shown] = useState(() => now?.kind === 'day' ? now.day.id : open.find(d => !journey.done.includes(d.id))?.id);
  const refocus = (...ids: string[]) => requestAnimationFrame(() => { for (const id of ids) { const el = document.getElementById(id); if (el && el.offsetParent !== null) { el.focus(); return; } } });
  const sid = (kind: string, day: ProgrammeDay, stepId = '') => `guided-${kind}-${program.id}-${day.id}${stepId ? `-${stepId}` : ''}`;
  const todayLine = !now ? null
    : now.kind === 'day' ? `Today: ${word} ${now.number}, ${now.day.title}.`
    : now.kind === 'rest' ? `Today is a rest day.${now.next ? ` ${word} ${now.next.number} opens ${opensWords(now.next.opensOn, today)}.` : ''}`
    : now.kind === 'before' ? `${word} 1 opens on ${formatDate(now.opensOn, {weekday: true, year: false})}.`
    : now.kind === 'complete' ? `Every ${word.toLowerCase()} is done. Well done for seeing it through.`
    : `Every ${word.toLowerCase()} is open: do the ones left whenever you like.`;
  return <article className="panel guided-journey guided-programme" data-pillar={program.pillar} aria-labelledby={titleId}>
    <div className="guided-title-row"><PillarMark pillar={program.pillar} size={14} /><h3 id={titleId} tabIndex={-1}>{program.title}{journey.showcase && <span className="guided-showcase"> (Showcase)</span>}</h3></div>
    <p className="guided-meta">{progressLine(journey, program, today)}</p>
    {todayLine && <p className="guided-today">{todayLine}</p>}
    {program.care && <p className="fine guided-care">{program.care}</p>}
    <ol className="guided-days">
      {open.map((day, i) => {
        const label = `${word} ${i + 1}`, dayDone = journey.done.includes(day.id), progress = dayProgress(journey, day), isToday = now?.kind === 'day' && now.day.id === day.id;
        return <li key={day.id} className="guided-day" data-done={dayDone || undefined} data-today={isToday || undefined}>
          <details open={day.id === shown || undefined}>
            <summary id={sid('day', day)}><span className="guided-day-head"><span className="eyebrow guided-step-number">{label}{day.week ? ` · Week ${day.week}` : ''}{isToday ? ' · Today' : ''}</span>
              <span className="guided-day-title">{day.title}</span>
              <span className="guided-day-count">{dayDone ? <><span aria-hidden="true">✓ </span>Done</> : `${progress.done} of ${progress.total} steps done`}</span></span></summary>
            <div className="guided-day-body">
              <p className="guided-note">{day.note}</p>
              <ReadAloud what={`${label}, ${day.title}`} text={() => dayWords(day, label)} />
              <ol className="guided-steps">{day.steps.map(s => {
                const done = isStepDone(journey, day, s);
                return <li key={s.id} className="guided-step" data-done={done || undefined}>
                  <h4>{s.title}</h4>
                  <p className="guided-note">{s.detail}</p>
                  <div className="guided-step-actions">
                    <Link className="secondary" href={s.action.href}>{s.action.label}</Link>
                    {done ? <><span className="guided-done-mark"><span aria-hidden="true">✓ </span>Done</span>
                      <button type="button" id={sid('undo', day, s.id)} className="quiet" aria-label={`Undo: ${s.title} (${label})`} onClick={() => { onUntick(day, s.id, s.title); refocus(sid('done', day, s.id), sid('day', day)); }}>Undo</button></>
                      : <button type="button" id={sid('done', day, s.id)} className="primary" aria-label={`Done: ${s.title} (${label})`} onClick={() => { onTick(day, s.id, s.title); refocus(sid('undo', day, s.id), sid('day', day)); }}>Done</button>}
                  </div>
                </li>;
              })}</ol>
              <div className="guided-step-actions">{dayDone
                ? <button type="button" id={sid('undo-day', day)} className="quiet" aria-label={`Undo the whole of ${label}`} onClick={() => { onUndoDay(day, label); refocus(sid('mark-day', day), sid('day', day)); }}>Undo the whole day</button>
                : <button type="button" id={sid('mark-day', day)} className="secondary" aria-label={`Mark all of ${label} done`} onClick={() => { onDay(day, label); refocus(sid('undo-day', day), sid('day', day)); }}>Mark the whole day done</button>}</div>
            </div>
          </details>
        </li>;
      })}
      {state.next && <li className="guided-step guided-locked">
        <p className="eyebrow guided-step-number">{word} {state.next.number}</p>
        <p className="guided-note">{state.next.opensOn === addCalendarDays(today, 1) ? 'Unlocks tomorrow' : `Unlocks on ${formatDate(state.next.opensOn, {weekday: true, year: false})}`}</p>
      </li>}
    </ol>
    <div className="guided-end">{ending
      ? <ConfirmInline title="End this programme?" confirmLabel="End this programme" tone="neutral" onConfirm={onEnd} onCancel={onCancelEnd}>
          <p>The days and steps you ticked stay ticked, and no day opens after today. You can start it again later, from the first day.</p></ConfirmInline>
      : <button type="button" className="quiet" onClick={onAskEnd}>End this programme</button>}</div>
  </article>;
}
