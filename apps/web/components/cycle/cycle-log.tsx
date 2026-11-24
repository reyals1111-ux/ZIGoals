'use client';
import {Suspense, lazy, useId, useState, type ReactNode} from 'react';
import {useDeviceRecord} from '../ai/use-device-record';
import {CYCLE, CYCLE_NOTE_MAX, FLOWS, MAX_SYMPTOMS, type Flow} from '../../lib/cycle/store';
import {chipWords, wordLabel} from '../../lib/cycle/words';
import {LoadBoundary} from '../load-boundary';
import {Skeleton} from '../ui/skeleton';
import {CYCLE_LINE, clearCycleDays, cycleDay, nextPeriodEstimate, setCycleDay, setCycleOn, setCycleOnPlan} from '../../lib/cycle/engine';
import {formatDate} from '../../lib/visual-format';
import {isShowcase} from '../../lib/showcase-storage';
import './cycle.css';

// Session AV lane 2 (r5-body; LEDGER #379–#383): Your cycles, a cycle at a glance and What you track, each its own chunk.
const CycleHistory = lazy(() => import('./cycle-history'));
const CycleGlance = lazy(() => import('./cycle-glance'));
const CycleWords = lazy(() => import('./cycle-words'));
function Fold({title, id, children}: {title: string; id: string; children: ReactNode}) {
  const [open, setOpen] = useState(false);
  return <details className="cycle-recent cycle-fold-part" id={id} onToggle={e => setOpen((e.currentTarget as HTMLDetailsElement).open)}>
    <summary>{title}</summary>
    {open && <LoadBoundary quiet><Suspense fallback={<Skeleton label="Opening…"/>}>{children}</Suspense></LoadBoundary>}
  </details>;
}

/**
 * Session AK (BUILD list 2 #16, lane G1a): the cycle log in Health (opt-in). Period days with flow, symptom chips and a
 * note, each saved on its own tap to `zigoals:cycle:v1`; the next-period line is "an estimate from your past cycles", a
 * range, shown only after three cycles. Never in a notification. Information, not a contraceptive or a diagnosis.
 */
const FLOW_WORDS: Record<Flow, string> = {light: 'Light', medium: 'Medium', heavy: 'Heavy'};
export default function CycleLog({today}: {today: string}) {
  const rec = useDeviceRecord(CYCLE), id = useId();
  const [day, setDay] = useState(today), [status, setStatus] = useState(''), [confirming, setConfirming] = useState(false), [noteDraft, setNoteDraft] = useState<string | null>(null);
  if (!rec.loaded) return <p className="fine">Reading your cycle log…</p>;
  const entry = rec.data.days[day] ?? {}, estimate = nextPeriodEstimate(rec.data, today), dayOf = cycleDay(rec.data, today);
  const write = (fn: Parameters<typeof rec.update>[0], said: string) => { try { rec.update(fn); setStatus(said); return true; } catch (e) { setStatus(e instanceof Error && /^Choose/.test(e.message) ? e.message : 'Not saved on this device. Nothing was changed.'); return false; } };
  const symptoms = entry.symptoms ?? [], when = day === today ? 'today' : formatDate(day), word = (s: string) => wordLabel(rec.data, s);
  const toggle = (s: string, on: boolean) => write(r => setCycleDay(r, day, {symptoms: on ? [...symptoms, s] : symptoms.filter(x => x !== s)}, today), `${word(s)} ${on ? 'noted' : 'removed'} for ${when}.`);
  const noPeriod = rec.data.noPeriod === true;
  const recent = Object.entries(rec.data.days).sort(([a], [b]) => b.localeCompare(a)).slice(0, 10);
  return <div className="cycle-log">
    <p className="cycle-line"><strong>{CYCLE_LINE}</strong> Kept on this device only; never in a notification.</p>
    {isShowcase() && Object.keys(rec.data.days).length > 0 && <p className="fine">Showcase: fictional example entries.</p>}
    <section className="cycle-estimate" aria-label="Estimate">
      {dayOf !== null && <p>Day {dayOf} since your last logged period began.</p>}
      {estimate.kind === 'off' ? <p className="fine">No period is chosen, so there is no next-period line. Your words and notes are kept as always; change it under What you track.</p> : estimate.kind === 'range'
        ? <p>Next period: {estimate.from === estimate.to ? `around ${formatDate(estimate.from)}` : `between ${formatDate(estimate.from)} and ${formatDate(estimate.to)}`}. <span className="fine">An estimate from your past cycles ({estimate.shortest === estimate.longest ? `${estimate.shortest} days` : `${estimate.shortest} to ${estimate.longest} days`}), not a promise.{estimate.passed ? ' That window has passed; the estimate updates when you log.' : ''}</span></p>
        : <p className="fine">An estimate of the next period shows after {estimate.need} complete cycles are logged ({estimate.cycles} so far). Log the days of each period below.</p>}
    </section>
    <label className="field"><span>Day</span><input type="date" value={day} max={today} onChange={e => { setDay(e.target.value || today); setNoteDraft(null); }}/></label>
    {(!noPeriod || entry.flow) && <fieldset className="cycle-flow"><legend>Period flow, {when}</legend>
      <div className="cycle-chips">{FLOWS.map(f => <button key={f} type="button" className="secondary" aria-pressed={entry.flow === f} onClick={() => write(r => setCycleDay(r, day, {flow: entry.flow === f ? null : f}, today), entry.flow === f ? `Flow cleared for ${when}.` : `${FLOW_WORDS[f]} flow, ${when}.`)}>{FLOW_WORDS[f]}</button>)}</div>
    </fieldset>}
    <fieldset className="cycle-symptoms"><legend>How it feels, {when} (optional)</legend>
      {symptoms.length >= MAX_SYMPTOMS && <p className="fine">A day keeps up to {MAX_SYMPTOMS} words; untick one to choose another.</p>}
      <div className="cycle-chips">{chipWords(rec.data, symptoms).map(s => <label key={s} className="cycle-chip"><input type="checkbox" checked={symptoms.includes(s)} onChange={e => toggle(s, e.target.checked)}/><span>{word(s)}</span></label>)}</div>
    </fieldset>
    <label className="field"><span>Note (optional)</span><input maxLength={CYCLE_NOTE_MAX} value={noteDraft ?? entry.note ?? ''} onChange={e => setNoteDraft(e.target.value)}
      onBlur={() => { if (noteDraft !== null && noteDraft !== (entry.note ?? '')) write(r => setCycleDay(r, day, {note: noteDraft}, today), `Note kept for ${when}.`); setNoteDraft(null); }}/></label>
    {/* Session AV lane 2 (r3-plan, LEDGER #262; Structured's Cycle Seasons, the days only): opt-in, on this device. */}
    <label className="cycle-plan-choice"><input type="checkbox" checked={rec.data.plan === true} disabled={rec.unreadable} aria-describedby={`${id}-plan`} onChange={e => write(r => setCycleOnPlan(r, e.currentTarget.checked), e.currentTarget.checked ? 'Your cycle day and period days show on the Day Timeline and the Agenda.' : 'Your cycle no longer shows on the Day Timeline and the Agenda.')}/><span>Show my cycle day on the Day Timeline and the Agenda</span></label>
    <small id={`${id}-plan`} className="fine">The day of your cycle and logged or estimated period days, nothing more: no phases and no advice. Only on this device, while Health is shown.</small>
    <p className="cycle-status" role="status" aria-live="polite">{status}</p>
    {recent.length > 0 ? <details className="cycle-recent"><summary>Recent entries</summary><ul>{recent.map(([d, e]) => <li key={d}><button type="button" className="text-link" onClick={() => { setDay(d); setNoteDraft(null); }}>{formatDate(d)}</button>: {[e.flow ? `${FLOW_WORDS[e.flow]} flow` : null, ...(e.symptoms ?? []).map(word), e.note ? `“${e.note}”` : null].filter(Boolean).join(' · ')}</li>)}</ul></details>
      : noPeriod ? <p className="fine">Nothing logged yet. Tick the words that fit a day, or write a note; add your own words under What you track.</p>
      : <p className="fine">Nothing logged yet. Tap a flow on each day of your period; after three cycles an estimate of the next one shows here. Period days can also be compared with your mood, energy or sleep in Health → Insights → Compare.</p>}
    <Fold title="Your cycles" id="cycle-history"><CycleHistory today={today}/></Fold>
    <Fold title="A cycle at a glance" id="cycle-glance"><CycleGlance today={today}/></Fold>
    <Fold title="What you track" id="cycle-words"><CycleWords/></Fold>
    <div className="cycle-actions">
      <button type="button" className="quiet" onClick={() => write(r => setCycleOn(r, false), 'The cycle log is hidden. Your entries stay; turn it on again in Settings → Your pages & buttons.')}>Hide the cycle log</button>
      {Object.keys(rec.data.days).length > 0 && (confirming
        ? <span role="group" aria-labelledby={`${id}-del`}><span id={`${id}-del`}>Delete every cycle entry on this device?</span> <button type="button" className="secondary" onClick={() => { if (write(clearCycleDays, 'Every cycle entry was deleted from this device.')) setConfirming(false); }}>Delete them</button> <button type="button" className="quiet" onClick={() => setConfirming(false)}>Keep them</button></span>
        : <button type="button" className="quiet" onClick={() => setConfirming(true)}>Delete all cycle entries</button>)}
    </div>
  </div>;
}
