'use client';
import {useId, useMemo, useState, type DragEvent, type FormEvent} from 'react';
import {addLocalDays} from '../../../lib/local-date';
import {formatDate} from '../../../lib/visual-format';
import type {Workouts} from '../../../lib/workouts/schema';
import {CIRCUITS} from '../../../lib/workouts/circuits';
import {clearAway, EFFORT_WORDS, EFFORTS, missedThisWeek, mondayOf, moveWorkout, planStates, planWorkout, PLANNED_WORKOUTS, plannedLine, realign, removePlanned, restorePlanned, setAway, type Effort, type PlanDraft, type Planned, type PlanIssue, type PlanState, type PlannedRecord} from '../../../lib/workouts/planned';
import {deviceSettingFailureMessage} from '../../../lib/storage-error-copy';
import {useDeviceRecord} from '../../ai/use-device-record';
import {showUndo} from '../../ui/undo-toast';
import {isShowcase} from '../../../lib/showcase-storage';
import {ShowcaseTag} from '../../ui/showcase-tag';
import '../r3/health-r3.css';
import './health-r4.css';

/**
 * Session AV lane 2, round 4 (health; LEDGER #330, Runna's training calendar, Strong's workout scheduling): Health →
 * Workouts → "Your plan". Plan a routine, a circuit, a run (a distance and an easy, steady or fast word) or something of
 * your own on a day and a time; four weeks from this Monday on a calendar where a planned workout is dragged to another
 * day (or moved with "Move to", by keyboard or touch); "I missed some" moves this week's missed ones on in order, with
 * Undo; "Away until …" sets a range aside. Planned workouts show on the Agenda and the Day Timeline. Its own chunk.
 */
const WEEKS = 4;
const STATE_WORDS: Record<PlanState, string> = {planned: 'planned', done: 'done', missed: 'missed', aside: 'set aside while you are away'};
export default function PlannedWorkouts({w, today}: {w: Workouts; today: string}) {
  const rec = useDeviceRecord(PLANNED_WORKOUTS), circuits = useDeviceRecord(CIRCUITS), id = useId();
  const [said, setSaid] = useState(''), [open, setOpen] = useState<string | null>(null), [over, setOver] = useState<string | null>(null), [awayTo, setAwayTo] = useState(addLocalDays(today, 6));
  const r: PlannedRecord = useMemo(() => rec.loaded && !rec.unreadable ? rec.data : {version: 1, items: []}, [rec.loaded, rec.unreadable, rec.data]);
  const states = useMemo(() => planStates(r, w, today), [r, w, today]), missed = useMemo(() => missedThisWeek(r, w, today), [r, w, today]);
  if (!rec.loaded) return null;
  if (rec.unreadable) return <p className="fine" role="alert">Your plan on this device could not be read, so it cannot be changed here now.</p>;
  const keep = (change: (c: PlannedRecord) => PlannedRecord, text: string) => { try { rec.update(change); setSaid(text); return true; } catch (e) { setSaid(e instanceof Error && !/storage|quota/i.test(e.message) ? e.message : `Not kept on this device. ${deviceSettingFailureMessage(e)}`); return false; } };
  const move = (item: Planned, date: string) => { if (date === item.date) return; const was = item.date; if (keep(c => moveWorkout(c, item.id, date), `${item.name} moved to ${formatDate(date, {weekday: true, year: false})}.`)) showUndo({message: `${item.name} moved to ${formatDate(date, {weekday: true, year: false})}.`, undone: `${item.name} is back on ${formatDate(was, {weekday: true, year: false})}.`, restore: () => rec.update(c => c.items.some(i => i.id === item.id) ? moveWorkout(c, item.id, was) : c)}); };
  const start = mondayOf(today), days = Array.from({length: WEEKS * 7}, (_, i) => addLocalDays(start, i));
  const byDay = new Map<string, Planned[]>(); for (const i of r.items) byDay.set(i.date, [...(byDay.get(i.date) ?? []), i]);
  const upcoming = r.items.filter(i => i.date > days.at(-1)!), earlier = r.items.filter(i => i.date < start && states.get(i.id) !== 'done').slice(-5);
  const drop = (e: DragEvent, date: string) => { e.preventDefault(); setOver(null); const item = r.items.find(i => i.id === e.dataTransfer.getData('text/plain')); if (item) move(item, date); };
  const chosen = r.items.find(i => i.id === open) ?? null;
  return <div className="r4-plan" id="workouts-plan">
    {isShowcase() && r.items.some(i => /\(Showcase\)/.test(i.name)) && <p className="fine"><ShowcaseTag/> Fictional example plan.</p>}
    <p className="fine">Plan a routine, a circuit or a run on a day. Drag it to another day on the calendar, or open it to move it. A planned workout is done once a workout is logged that day.</p>
    {missed.length > 0 && <div className="r4-note" role="group" aria-labelledby={`${id}-missed`}>
      <p id={`${id}-missed`}>{missed.length === 1 ? `${missed[0]!.name} on ${formatDate(missed[0]!.date, {weekday: true, year: false})} was not done.` : `${missed.length} planned workouts this week were not done.`} Move {missed.length === 1 ? 'it' : 'them'} on, in order, from today?</p>
      <div className="actions"><button type="button" className="secondary" onClick={() => { const before = r; const out = realign(r, w, today); if (keep(() => out.value, `${out.moved} planned ${out.moved === 1 ? 'workout' : 'workouts'} moved on, in order.`)) showUndo({message: `${out.moved} planned ${out.moved === 1 ? 'workout' : 'workouts'} moved on.`, undone: 'Your plan is as it was.', restore: () => rec.update(() => before)}); }}>I missed some: move them on</button></div>
    </div>}
    {r.away ? <p className="r4-note">Away {r.away.from <= today ? 'until' : `from ${formatDate(r.away.from, {weekday: true, year: false})} until`} {formatDate(r.away.to, {weekday: true, year: false})}: planned workouts in that time are set aside. <button type="button" className="quiet" onClick={() => keep(clearAway, 'Welcome back: nothing is set aside now.')}>I’m back</button></p>
      : <div className="r3-toggle"><label className="field"><span>Away until</span><input type="date" min={today} value={awayTo} onChange={e => setAwayTo(e.target.value)}/></label><button type="button" className="quiet" onClick={() => keep(c => setAway(c, today, awayTo), `Away until ${formatDate(awayTo, {weekday: true, year: false})}: planned workouts in that time are set aside.`)}>Set them aside</button></div>}
    <div className="r4-weeks" aria-label="Your plan, four weeks from this Monday" role="group">
      {Array.from({length: WEEKS}, (_, wk) => <ul key={wk} className="r4-week" aria-label={`Week of ${formatDate(days[wk * 7]!, {year: false})}`}>
        {days.slice(wk * 7, wk * 7 + 7).map(d => { const list = byDay.get(d) ?? [], away = !!r.away && d >= r.away.from && d <= r.away.to;
          return <li key={d} className="r4-day" data-today={d === today || undefined} data-over={over === d || undefined} data-away={away || undefined} aria-label={`${formatDate(d, {weekday: true, year: false})}${d === today ? ', today' : ''}: ${list.length ? `${list.length} planned` : 'nothing planned'}${away ? ', away' : ''}`}
            onDragOver={e => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; if (over !== d) setOver(d); }} onDragLeave={() => setOver(o => o === d ? null : o)} onDrop={e => drop(e, d)}>
            <span className="r4-day-head" aria-hidden="true">{formatDate(d, {weekday: true, year: false})}</span>
            <span>{list.map(i => <button key={i.id} type="button" className="quiet r4-chip" draggable data-state={states.get(i.id)} aria-expanded={open === i.id} aria-controls={`${id}-item`}
              aria-label={`${plannedLine(i)}, ${STATE_WORDS[states.get(i.id) ?? 'planned']}. Open to move or remove it`} onDragStart={e => { e.dataTransfer.setData('text/plain', i.id); e.dataTransfer.effectAllowed = 'move'; }} onClick={() => setOpen(open === i.id ? null : i.id)}>{i.time ? `${i.time} ` : ''}{i.name}</button>)}</span>
          </li>; })}
      </ul>)}
    </div>
    {chosen && <ItemPanel key={chosen.id} id={`${id}-item`} item={chosen} state={states.get(chosen.id) ?? 'planned'} today={today} onMove={d => move(chosen, d)} onClose={() => setOpen(null)}
      onRemove={() => { setOpen(null); if (keep(c => removePlanned(c, chosen.id), `${chosen.name} removed from your plan.`)) showUndo({message: `${chosen.name} removed from your plan.`, undone: `${chosen.name} is back in your plan.`, restore: () => rec.update(c => restorePlanned(c, chosen))}); }}/>}
    {(earlier.length > 0 || upcoming.length > 0) && <ul className="r4-list">{[...earlier, ...upcoming].map(i => <li key={i.id}><span><strong>{i.name}</strong><small className="fine">{formatDate(i.date, {weekday: true})}{i.time ? ` · ${i.time}` : ''} · {STATE_WORDS[states.get(i.id) ?? 'planned']}</small></span><span className="r4-row-actions"><button type="button" className="quiet" aria-label={`Open ${i.name} on ${formatDate(i.date)}`} onClick={() => setOpen(i.id)}>Open</button></span></li>)}</ul>}
    {!r.items.length && <p className="health-empty-inline">Nothing planned yet. Put your routine on Monday and an easy run on Thursday: they show here, on the Agenda and on the Day Timeline.</p>}
    <PlanForm w={w} circuits={circuits.loaded && !circuits.unreadable ? circuits.data.circuits : []} today={today} onPlan={d => { const out = planWorkout(r, d, `plan-${crypto.randomUUID()}`, new Date().toISOString()); if (!out.ok) return out.issue; keep(() => out.value, `${out.item.name} planned on ${formatDate(out.item.date, {weekday: true, year: false})}${out.item.time ? ` at ${out.item.time}` : ''}.`); return null; }}/>
    <p className="fine" role="status" aria-live="polite">{said}</p>
  </div>;
}

function ItemPanel({id, item, state, today, onMove, onRemove, onClose}: {id: string; item: Planned; state: PlanState; today: string; onMove: (d: string) => void; onRemove: () => void; onClose: () => void}) {
  const [to, setTo] = useState(item.date < today ? today : addLocalDays(item.date, 1));
  return <section className="r4-note" id={id} aria-label={`${item.name}, ${formatDate(item.date)}`}>
    <p><strong>{plannedLine(item)}</strong> · {formatDate(item.date, {weekday: true})} · {STATE_WORDS[state]}</p>
    <div className="r3-toggle"><label className="field"><span>Move to</span><input type="date" value={to} onChange={e => setTo(e.target.value)}/></label><button type="button" className="secondary" disabled={!to || to === item.date} onClick={() => onMove(to)}>Move</button></div>
    <div className="actions"><button type="button" className="quiet" onClick={onRemove}>Remove from the plan</button><button type="button" className="quiet" onClick={onClose}>Close</button></div>
  </section>;
}

function PlanForm({w, circuits, today, onPlan}: {w: Workouts; circuits: readonly {id: string; name: string}[]; today: string; onPlan: (d: PlanDraft) => PlanIssue | null}) {
  const id = useId(), [what, setWhat] = useState(w.templates[0] ? `routine:${w.templates[0].id}` : 'run'), [name, setName] = useState(''), [date, setDate] = useState(today), [time, setTime] = useState('');
  const [km, setKm] = useState('5'), [effort, setEffort] = useState<Effort>('easy'), [minutes, setMinutes] = useState(''), [issue, setIssue] = useState<PlanIssue | null>(null);
  const [kind, ref] = what.split(':') as [PlanDraft['kind'], string | undefined];
  const refName = kind === 'routine' ? w.templates.find(t => t.id === ref)?.name : kind === 'circuit' ? circuits.find(c => c.id === ref)?.name : undefined;
  const submit = (e: FormEvent) => { e.preventDefault(); const problem = onPlan({kind, refId: ref, name: refName ?? name, date, time, distanceKm: km, effort, minutes}); setIssue(problem); if (problem) document.getElementById(`${id}-${problem.field}`)?.focus(); else { setName(''); setTime(''); } };
  const err = (f: PlanIssue['field']) => issue?.field === f ? {'aria-invalid': true as const, 'aria-describedby': `${id}-${f}-issue`} : {};
  const say = (f: PlanIssue['field']) => issue?.field === f && <p className="field-error" id={`${id}-${f}-issue`} role="alert">{issue.message}</p>;
  return <form className="health-form" aria-label="Plan a workout" noValidate onSubmit={submit}>
    <h4>Plan a workout</h4>
    <div className="health-form-grid">
      <div><label className="field"><span>What</span><select id={`${id}-what`} value={what} onChange={e => { setWhat(e.target.value); setIssue(null); }} {...err('what')}>
        {w.templates.length > 0 && <optgroup label="Your routines">{w.templates.map(t => <option key={t.id} value={`routine:${t.id}`}>{t.name}</option>)}</optgroup>}
        {circuits.length > 0 && <optgroup label="Your circuits">{circuits.map(c => <option key={c.id} value={`circuit:${c.id}`}>{c.name}</option>)}</optgroup>}
        <option value="run">A run</option><option value="other">Something else</option>
      </select></label>{say('what')}</div>
      {kind === 'run' && <><div><label className="field"><span>Distance (km)</span><input id={`${id}-distance`} type="text" inputMode="decimal" value={km} onChange={e => setKm(e.target.value)} {...err('distance')}/></label>{say('distance')}</div>
        <label className="field"><span>Effort</span><select value={effort} onChange={e => setEffort(e.target.value as Effort)}>{EFFORTS.map(x => <option key={x} value={x}>{EFFORT_WORDS[x].en}</option>)}</select></label></>}
      {kind === 'other' && <div><label className="field"><span>Name</span><input id={`${id}-name`} type="text" maxLength={80} value={name} onChange={e => setName(e.target.value)} {...err('name')}/></label>{say('name')}</div>}
      <div><label className="field"><span>Day</span><input id={`${id}-date`} type="date" value={date} onChange={e => setDate(e.target.value)} {...err('date')}/></label>{say('date')}</div>
      <div><label className="field"><span>Time (optional)</span><input id={`${id}-time`} type="time" value={time} onChange={e => setTime(e.target.value)} {...err('time')}/></label>{say('time')}</div>
      <div><label className="field"><span>About how long (minutes, optional)</span><input id={`${id}-minutes`} type="text" inputMode="numeric" value={minutes} onChange={e => setMinutes(e.target.value)} {...err('minutes')}/></label>{say('minutes')}</div>
    </div>
    <div className="actions"><button type="submit" className="primary">Plan it</button></div>
  </form>;
}
