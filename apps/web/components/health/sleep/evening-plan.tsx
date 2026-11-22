'use client';
import {useId, useMemo, useState} from 'react';
import {useDeviceRecord} from '../../ai/use-device-record';
import {useHabits} from '../../habits/use-habits';
import {eveningOf, HINDRANCE_WORDS, readiness, recentEvenings, removePlan, savePlan, sortSteps, stepClock, suggestedSteps, SUGGESTIONS, tickStep, WIND_DOWN_CHOICES} from '../../../lib/evening-plan/plan';
import {EVENING_HINDRANCES, EVENING_PLAN, MAX_EVENING_STEPS, type EveningHindrance, type EveningStep} from '../../../lib/evening-plan/schema';
import {formatClock} from '../../../lib/visual-format';
import {plainErrorMessage} from '../../../lib/plain-error';
import './av2-sleep.css';

/**
 * Session AV lane 2 (body; LEDGER #83, Calm Sleep's evening plan; wearable sync left out: native-only): Health → Sleep →
 * Tonight → "Your evening plan". Three plain questions — when you want to be asleep, what gets in the way, how long to wind
 * down — suggest four to six steps (an own habit can be one); keep, drop or add, and save. Each evening the steps are listed
 * with their times and a "Ready for bed" bar fills as they are ticked; the last 7 evenings are counted. Kept on this device
 * (zigoals:evening-plan:v1). Nothing medical. Its own chunk.
 */
export default function EveningPlan({zone, now}: {zone: string; now: number}) {
  const record = useDeviceRecord(EVENING_PLAN), [editing, setEditing] = useState(false), [note, setNote] = useState(''), id = useId();
  const evening = eveningOf(now, zone), plan = record.data.plan, ready = record.loaded ? readiness(record.data, evening) : null;
  const change = (fn: Parameters<typeof record.update>[0], said?: string) => { try { record.update(fn); if (said) setNote(said); return true; } catch (e) { setNote(plainErrorMessage(e, 'That could not be saved on this device.')); return false; } };
  if (!record.loaded) return null;
  return <section className="evening-plan" aria-labelledby={`${id}-title`}>
    <h3 id={`${id}-title`}>Your evening plan</h3>
    {note && <p className="fine" role="status">{note}</p>}
    {record.unreadable && <p className="notice" role="alert">The evening plan on this device could not be read. Its bytes are kept; saving a plan writes a new one.</p>}
    {editing || !plan ? (editing ? <PlanForm initial={plan} onCancel={() => setEditing(false)} onSave={input => { if (change(r => savePlan(r, input, new Date()), 'Your evening plan is saved. Tick each step as you go tonight.')) setEditing(false); }}/>
      : <><p className="fine">A few questions make a short list for your evenings — screens away, lights low, lights out — with a bar that fills as you tick them. Plain habits of a calm evening, not medical advice.</p>
        <button type="button" className="secondary" onClick={() => setEditing(true)}>Make an evening plan</button></>)
    : <>
      <p className="fine">Tonight: lights out at {formatClock(plan.bedtime)}{ready?.next && !ready.ready ? ` · next: ${ready.next.label} at ${formatClock(stepClock(plan.bedtime, ready.next.minutesBefore))}` : ''}.</p>
      <ul className="evening-steps">{sortSteps(plan.steps).map(s => { const on = (record.data.days[evening] ?? []).includes(s.id); return <li key={s.id}>
        <label><input type="checkbox" checked={on} onChange={e => change(r => tickStep(r, evening, s.id, e.target.checked))}/><time dateTime={stepClock(plan.bedtime, s.minutesBefore)}>{formatClock(stepClock(plan.bedtime, s.minutesBefore))}</time> <span>{s.label}{s.habitId ? ' (your habit)' : ''}</span></label>
      </li>; })}</ul>
      {ready && <><div className="evening-ready" role="progressbar" aria-label="Ready for bed" aria-valuemin={0} aria-valuemax={ready.total} aria-valuenow={ready.done} aria-valuetext={`${ready.done} of ${ready.total} steps`}><span style={{inlineSize: `${Math.round(ready.share * 100)}%`}}/></div>
        <p className="evening-ready-line" aria-live="polite">{ready.ready ? 'Ready for bed. Sleep well.' : `Ready for bed: ${ready.done} of ${ready.total} steps.`}</p></>}
      {(() => { const r = recentEvenings(record.data, evening); return r.some ? <p className="fine">The last 7 evenings: every step on {r.complete}, some on {r.some}.</p> : null; })()}
      <div className="evening-actions"><button type="button" className="quiet" onClick={() => setEditing(true)}>Change the plan</button>
        <button type="button" className="quiet" onClick={() => change(removePlan, 'The evening plan is removed. The evenings you ticked stay in your data.')}>Remove the plan</button></div>
    </>}
  </section>;
}

function PlanForm({initial, onSave, onCancel}: {initial?: {bedtime: string; windDown: number; hindrances: EveningHindrance[]; steps: EveningStep[]}; onSave: (p: {bedtime: string; windDown: number; hindrances: EveningHindrance[]; steps: EveningStep[]}) => void; onCancel: () => void}) {
  const habits = useHabits(), id = useId();
  const [bedtime, setBedtime] = useState(initial?.bedtime ?? '23:00'), [windDown, setWindDown] = useState(initial?.windDown ?? 45), [hindrances, setHindrances] = useState<EveningHindrance[]>(initial?.hindrances ?? ['screens']);
  const suggested = useMemo(() => suggestedSteps(hindrances, windDown), [hindrances, windDown]);
  const [kept, setKept] = useState<Set<string>>(() => new Set((initial?.steps ?? suggestedSteps(initial?.hindrances ?? ['screens'], initial?.windDown ?? 45)).map(s => s.id)));
  const [habitSteps, setHabitSteps] = useState<EveningStep[]>(initial?.steps.filter(s => s.habitId) ?? []), [habitPick, setHabitPick] = useState(''), [problem, setProblem] = useState('');
  // Steps the answers suggest, plus every other ready step (unticked), then the habits added.
  const offered = useMemo(() => { const extra = SUGGESTIONS.filter(s => !suggested.some(x => x.id === s.id)).map(s => ({id: s.id, label: s.label, minutesBefore: s.minutesBefore(windDown)})); return sortSteps([...suggested, ...extra]); }, [suggested, windDown]);
  const toggleHindrance = (h: EveningHindrance, on: boolean) => {
    setHindrances(list => on ? [...list, h] : list.filter(x => x !== h));
    // A new answer ticks the step it suggests; a dropped one unticks it.
    const s = SUGGESTIONS.find(x => x.for === h); if (s) setKept(k => { const n = new Set(k); if (on) n.add(s.id); else n.delete(s.id); return n; });
  };
  const habitList = (habits.loaded ? habits.data.habits : []).filter(h => !habitSteps.some(s => s.habitId === h.id)).slice(0, 40);
  const save = () => {
    const steps = [...offered.filter(s => kept.has(s.id)), ...habitSteps];
    if (!steps.length) { setProblem('Keep at least one step.'); return; }
    if (steps.length > MAX_EVENING_STEPS) { setProblem(`Up to ${MAX_EVENING_STEPS} steps fit. Leave ${steps.length - MAX_EVENING_STEPS} out.`); return; }
    setProblem(''); onSave({bedtime, windDown, hindrances, steps});
  };
  return <form className="evening-form" onSubmit={e => { e.preventDefault(); save(); }}>
    <label className="field"><span>1. When do you want to be asleep?</span><input type="time" value={bedtime} onChange={e => setBedtime(e.target.value)} required/></label>
    <fieldset><legend>2. What gets in the way most evenings?</legend><div className="evening-choices">{EVENING_HINDRANCES.map(h => <label key={h}><input type="checkbox" checked={hindrances.includes(h)} onChange={e => toggleHindrance(h, e.target.checked)}/>{HINDRANCE_WORDS[h]}</label>)}</div></fieldset>
    <label className="field"><span>3. How long would you like to wind down?</span><select value={windDown} onChange={e => setWindDown(Number(e.target.value))}>{WIND_DOWN_CHOICES.map(m => <option key={m} value={m}>{m} minutes</option>)}</select></label>
    <fieldset><legend>Your steps (up to {MAX_EVENING_STEPS}; the suggested ones are ticked)</legend>
      <div className="evening-choices">{offered.map(s => <label key={s.id}><input type="checkbox" checked={kept.has(s.id)} onChange={e => setKept(k => { const n = new Set(k); if (e.target.checked) n.add(s.id); else n.delete(s.id); return n; })}/>{bedtime ? `${formatClock(stepClock(bedtime, s.minutesBefore))} · ` : ''}{s.label}</label>)}
        {habitSteps.map(s => <label key={s.id}><input type="checkbox" checked onChange={() => setHabitSteps(list => list.filter(x => x.id !== s.id))}/>{bedtime ? `${formatClock(stepClock(bedtime, s.minutesBefore))} · ` : ''}{s.label} (your habit)</label>)}</div>
    </fieldset>
    {habitList.length > 0 && <div className="evening-actions"><label className="field"><span>Add one of your habits as a step (30 minutes before)</span><select id={`${id}-habit`} value={habitPick} onChange={e => setHabitPick(e.target.value)}><option value="">Choose a habit</option>{habitList.map(h => <option key={h.id} value={h.id}>{h.title}</option>)}</select></label>
      <button type="button" className="secondary" disabled={!habitPick} onClick={() => { const h = habitList.find(x => x.id === habitPick); if (h) setHabitSteps(list => [...list, {id: `habit-${list.length + 1}-${h.id.slice(0, 8).toLowerCase().replace(/[^a-z0-9]/g, '')}`, label: h.title.slice(0, 60), minutesBefore: 30, habitId: h.id}]); setHabitPick(''); }}>Add the habit</button></div>}
    {problem && <p role="alert" className="evening-problem">{problem}</p>}
    <div className="evening-actions"><button type="submit" className="primary">Save my evening plan</button><button type="button" className="quiet" onClick={onCancel}>Cancel</button></div>
  </form>;
}
