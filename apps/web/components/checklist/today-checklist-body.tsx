'use client';
import Link from 'next/link';
import {useEffect, useMemo, useState, type CSSProperties} from 'react';
import {GlassBar} from '../progress/glass-progress';
import {nudgeDue, nudgeText} from '../../lib/checklist/nudges';
import {markNudged, todayOf} from '../../lib/checklist/day';
import {CHECKLIST_ROUTE} from '../../lib/af-checklist-keys';
import {checklistPath} from '../../lib/checklist/derive';
import {checklistDisplayColours} from '../../lib/checklist/display-colours';
import {PATH_COLOURS} from '../../lib/path/colours';
import {nextStep, normalisePath, pathSteps} from '../../lib/path/model';
import {orbitGlyph} from '../../lib/checklist/glyphs';
import {OrbitNodeFace} from '../orbit-path/orbit-node';
import {useChecklist} from './use-checklist';
import {ChecklistMark, FlameMark} from './checklist-marks';

/**
 * The Today card's body (P7.21, P7.14): "4 of 6 dots today", the bar, the next dot, the streak, and — at most three times
 * a day, never in the quiet hours, only while dots wait and nudges are on — one gentle line ("2 dots still waiting on
 * your path"). In the app only: nothing is sent. Opening the path counts the nudge as seen.
 *
 * Critique round 2 (L5c): a small row of today's dots, in path order, each in its item's own colour (done ones filled),
 * and "Next" taken from the very step the path's ZIGi points at (the path engine's `nextStep` over the Checklist's own
 * path model), so the card and the path never disagree. Reading only: nothing is written.
 *
 * Round 3 (L3b): the card reads as the path does — the next planet as a glowing planet with its name and a Continue button
 * into the path, today's planets as a small winding row of mini planets in their colours (done ones lit), and on a wide
 * card the count and the planets on the left, the next one on the right. A due nudge makes Continue glow softly (its
 * sentence is still said to screen readers), not another line or a count that reads as unread messages.
 */
export default function TodayChecklistBody() {
  const state = useChecklist(), {summary, streak, loaded, date} = state;
  const [slot, setSlot] = useState<string | null>(null);
  const waiting = summary ? summary.total - summary.done : 0, nudgedKey = date ? todayOf(state.days.data, date).nudged.join(',') : '';
  useEffect(() => {
    if (!loaded) return;
    const check = () => setSlot(nudgeDue(new Date(), {on: state.prefs.nudges, waiting, nudged: nudgedKey ? nudgedKey.split(',') : [], quiet: state.quiet}));
    check(); const t = window.setInterval(check, 60_000); return () => window.clearInterval(t);
  }, [loaded, state.prefs.nudges, waiting, nudgedKey, state.quiet]);
  // Session AG: the path's own colours (ADR-029 I3), so the card's planets match the Checklist's nodes.
  const model = useMemo(() => { if (!loaded) return null; const colours = checklistDisplayColours(state.record.data, state.dots); return normalisePath(checklistPath(state.record.data, state.dots.map(d => ({...d, colour: colours.get(d.id) ?? d.colour})), [])); }, [loaded, state.record.data, state.dots]);
  const seen = () => { if (slot && date) { try { state.days.update(d => markNudged(d, date, slot)); } catch { /* the nudge shows again next time */ } } };
  if (!loaded || !summary) return <><p className="eyebrow" id="today-checklist-title">Checklist</p><p className="today-checklist-line">Reading your path…</p></>;
  const empty = state.dots.length === 0;
  const steps = model ? pathSteps(model) : [], next = model ? nextStep(model) : null;
  const nextDot = next ? state.dots.find(d => d.id === next.id) : undefined;
  // Session AF Gate C (design review, finding 1): one wrapper inside the card, so the card's own width (a container query on
  // the card) picks the two-column layout, not the window's: at 1024 px the card is only ≈ 500 px wide.
  return <div className="today-checklist-body">
    <div className="today-checklist-head"><span className="today-checklist-mark" aria-hidden="true"><ChecklistMark size={26}/></span><p className="eyebrow" id="today-checklist-title">Checklist</p>
      {!empty && <span className="today-checklist-streak" role="img" aria-label={`${streak?.current ?? 0}-day streak`}><FlameMark lit={!!streak?.todayComplete}/><span aria-hidden="true">{streak?.current ?? 0}</span></span>}</div>
    {empty ? <>
      <h2 className="today-checklist-title">Your day as a path of planets</h2>
      <p className="today-checklist-line">Star a habit, a glass of water or a goal step on its page, and tick it here each day.</p>
    </> : <>
      <h2 className="today-checklist-title">{summary.total ? `${summary.done} of ${summary.total} ${summary.total === 1 ? 'planet' : 'planets'} today` : 'Nothing counted today'}</h2>
      <GlassBar identity="today-checklist" className="today-checklist-bar" value={summary.total ? summary.done / summary.total : 0} role="progressbar" aria-label="Checklist planets lit today" aria-valuemin={0} aria-valuemax={summary.total} aria-valuenow={summary.done}/>
      {steps.length > 0 && <ol className="today-checklist-dots" aria-label="Today’s planets, in path order">{steps.map(step => <li key={step.id} data-state={step.state} data-next={next?.id === step.id || undefined} data-counted={step.counted === false ? 'no' : undefined} data-colour={step.colour} style={{'--dot': PATH_COLOURS[step.colour].token} as CSSProperties}>
        <span className="sr-only">{step.label}: {step.state === 'done' ? 'done' : step.counted === false ? 'not counted today' : 'not done yet'}{next?.id === step.id ? ' (next)' : ''}</span>
      </li>)}</ol>}
      {next ? <div className="today-checklist-next" style={{'--dot': PATH_COLOURS[next.colour].token} as CSSProperties}>
        <span className="today-checklist-planet orbit-node" style={{'--node': PATH_COLOURS[next.colour].token} as CSSProperties} aria-hidden="true"><OrbitNodeFace glyph={nextDot ? orbitGlyph(nextDot) : next.glyph ?? 'star'}/></span>
        <p className="today-checklist-line"><span className="today-checklist-cue">Next<span className="sr-only">:</span> </span><strong data-next-step={next.id}>{next.label}</strong></p>
        <Link className="primary today-checklist-continue" href={CHECKLIST_ROUTE} onClick={seen} data-nudge={slot ? '' : undefined}>Continue</Link>
      </div> : <p className="today-checklist-line">{summary.total && summary.done >= summary.total ? 'All planets lit. See you tomorrow.' : summary.total ? 'Nothing to tick here now: open your path.' : 'Every planet rests today.'}</p>}
      {slot && <p className="today-checklist-nudge sr-only" role="status">{nudgeText(waiting)}</p>}
    </>}
    {(empty || !next) && <Link className="text-link today-checklist-open" href={CHECKLIST_ROUTE} onClick={seen}>{empty ? 'Build your path →' : 'Open your path →'}</Link>}
  </div>;
}
