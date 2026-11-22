'use client';
import {useId, useState, type FormEvent, type ReactNode} from 'react';
import type {Workouts} from '../../../lib/workouts/schema';
import {clearMaxHr, MAX_HR_MAX, MAX_HR_MIN, setMaxHr, WORKOUT_HR, ZONE_EDGES, ZONE_SOURCE, zoneMinutes, zoneSeconds} from '../../../lib/workouts/hr-zones';
import {distanceChoice, distanceWords, gapWords, goalWords, RACE_DISTANCES, raceYear, RACES, removeRace, restoreRace, saveRace, timeText, type Race, type RaceDraft, type RaceIssue} from '../../../lib/workouts/races';
import {addCountdown, COUNTDOWNS} from '../../../lib/countdowns/schema';
import {formatDate} from '../../../lib/visual-format';
import {deviceSettingFailureMessage} from '../../../lib/storage-error-copy';
import {useDeviceRecord} from '../../ai/use-device-record';
import {showUndo} from '../../ui/undo-toast';
import '../r3/health-r3.css';
import './health-r4.css';

/**
 * Session AV lane 2, round 4 (health; Runna, LEDGER #336, #337): a run's heart-rate zones from the maximum the person types
 * (never from age; the formula and its source named; an estimate), and races ahead with the weeks between them and each
 * result beside its goal. Each in this lazy chunk.
 */
const errorText = (e: unknown) => e instanceof Error && !/storage|quota/i.test(e.message) ? e.message : `Not kept on this device. ${deviceSettingFailureMessage(e)}`;

/** A run's minutes in each of five zones (LEDGER #336), shown under the run in "Your workouts". */
export function HrZones({workoutId, name}: {workoutId: string; name: string}) {
  const rec = useDeviceRecord(WORKOUT_HR), id = useId(), [typed, setText] = useState<string | null>(null), [issue, setIssue] = useState(''), [said, setSaid] = useState('');
  if (!rec.loaded || rec.unreadable) return null;
  const h = rec.data.runs[workoutId], max = rec.data.maxHr;
  if (!h) return null;
  // Review B4E-5: the field shows the maximum kept; a blank one is refused, and removing it is its own button, with Undo.
  const text = typed ?? (max ? String(max) : '');
  const keep = (e: FormEvent) => { e.preventDefault(); const out = setMaxHr(rec.data, text); if (!out.ok) { setIssue(out.message); document.getElementById(`${id}-max`)?.focus(); return; } try { rec.update(() => out.value); setIssue(''); setText(null); setSaid(`Your maximum: ${out.value.maxHr} beats a minute. Every run’s zones use it.`); } catch (err) { setSaid(errorText(err)); } };
  const remove = () => { const was = max; if (!was) return; try { rec.update(clearMaxHr); setText(null); setSaid('Your maximum is removed: the zones wait for it.'); showUndo({message: 'Your maximum heart rate is removed.', undone: `Your maximum is back: ${was} beats a minute.`, restore: () => rec.update(r => ({...r, maxHr: was}))}); } catch (err) { setSaid(errorText(err)); } };
  const z = max ? zoneSeconds(h, max) : null;
  return <section className="r4-zones" aria-labelledby={`${id}-title`}>
    <h4 id={`${id}-title`}>Heart-rate zones for {name}</h4>
    {z && max ? <>
      <div className="r4-zone-bar" role="img" aria-label={`Minutes in each zone: ${z.zones.map(x => `zone ${x.zone} ${zoneMinutes(x.seconds)}`).join(', ')}${z.below ? `, below zone 1 ${zoneMinutes(z.below)}` : ''}.`}>{z.zones.map(x => x.seconds ? <i key={x.zone} data-zone={x.zone} style={{width: `${x.seconds / Math.max(1, z.total) * 100}%`}}/> : null)}</div>
      <ul>{z.zones.map(x => <li key={x.zone}>Zone {x.zone} ({x.from}–{x.to} bpm): {zoneMinutes(x.seconds)}</li>)}{z.below > 0 && <li>Below zone 1: {zoneMinutes(z.below)}</li>}</ul>
      <p className="fine">Zones are {ZONE_EDGES.map((e, i) => `${Math.round(e * 100)}–${i < 4 ? Math.round(ZONE_EDGES[i + 1]! * 100) : 100}`).join(', ')} % of the maximum you typed ({max} bpm), the five-zone split of {ZONE_SOURCE}. <span className="health-estimate-tag">an estimate, not medical advice</span> ZIGoals never works the maximum out from your age.</p>
    </> : <p className="fine">This run kept the time at each heart rate from its file. Type your maximum heart rate (from a test or your watch, never guessed from age) to see its five zones.</p>}
    <form className="r3-toggle" aria-label="Your maximum heart rate" noValidate onSubmit={keep}>
      <label className="field"><span>Maximum heart rate (bpm, {MAX_HR_MIN}–{MAX_HR_MAX})</span><input id={`${id}-max`} type="text" inputMode="numeric" value={text} aria-invalid={issue ? true : undefined} aria-describedby={issue ? `${id}-issue` : undefined} onChange={e => { setText(e.target.value); setIssue(''); }}/></label>
      <button type="submit" className="secondary">{max ? 'Change it' : 'Keep it'}</button>{max && <button type="button" className="quiet" onClick={remove}>Remove my maximum</button>}
      {issue && <p className="field-error" id={`${id}-issue`} role="alert">{issue}</p>}
    </form>
    <p className="fine" role="status" aria-live="polite">{said}</p>
  </section>;
}

const BLANK: RaceDraft = {name: '', date: '', distanceKm: '10', goal: '', priority: 'main'};
const draftOf = (r: Race): RaceDraft => ({name: r.name, date: r.date, distanceKm: String(r.distanceKm), goal: r.goalSeconds ? timeText(r.goalSeconds) : '', priority: r.priority});
/** Races ahead in one view (LEDGER #337): the year's races, the weeks between, each result beside its goal. */
export function RacesAhead({w, today}: {w: Workouts; today: string}) {
  const rec = useDeviceRecord(RACES), countdowns = useDeviceRecord(COUNTDOWNS), [editing, setEditing] = useState<string | 'new' | null>(null), [said, setSaid] = useState('');
  if (!rec.loaded) return null;
  if (rec.unreadable) return <p className="fine" role="alert">Your races on this device could not be read, so they cannot be changed here now.</p>;
  const rows = raceYear(rec.data, w, today);
  const save = (d: RaceDraft, countdown: boolean, editId?: string): RaceIssue | null => {
    const out = saveRace(rec.data, d, `race-${crypto.randomUUID()}`, new Date().toISOString(), editId);
    if (!out.ok) return out.issue;
    try { rec.update(() => out.value); } catch (err) { setSaid(errorText(err)); return null; }
    let extra = '';
    if (countdown) { try { countdowns.update(c => addCountdown(c, {title: out.race.name.slice(0, 80), date: out.race.date, note: `${distanceWords(out.race.distanceKm)}${out.race.goalSeconds ? `, goal ${timeText(out.race.goalSeconds)}` : ''}`}, {id: `cd-${out.race.id}`.slice(0, 80), at: new Date()})); extra = ' A countdown is on Today’s cards too.'; } catch (err) { extra = ` The countdown was not made: ${errorText(err)}`; } }
    setSaid(`${out.race.name} on ${formatDate(out.race.date, {weekday: true})} is saved.${extra}`); setEditing(null); return null;
  };
  return <div className="r4-races">
    <p className="fine">Your races in one place: the weeks to each and between them, a main race or a B race, and after race day the run that matches (that day, the distance within 5 %) beside your goal time.</p>
    {rows.length ? <ul className="r4-list">{rows.map(row => { const r = row.race; return <li key={r.id}>
      <span><strong>{r.name}</strong> <small className="fine">{r.priority === 'main' ? 'Main race' : 'B race'} · {distanceWords(r.distanceKm)} · {formatDate(r.date, {weekday: true})}{r.goalSeconds ? ` · goal ${timeText(r.goalSeconds)}` : ''}</small>
        <small className="fine">{row.past || r.date === today ? (row.result ? `Result: ${timeText(row.result.seconds)} for ${row.result.km.toLocaleString('en-US', {maximumFractionDigits: 2})} km${row.result.vsGoal !== null ? `, ${goalWords(row.result.vsGoal)}` : ''}.` : r.date === today ? 'Race day. The run you log today shows here as its result.' : 'No run that day matches its distance.') : `In ${gapWords(row.daysFromToday)}${row.daysAfterPrevious !== null ? ` · ${row.daysAfterPrevious === 0 ? 'the same day as the race before' : `${gapWords(row.daysAfterPrevious)} after the race before`}` : ''}.`}</small></span>
      <span className="r4-row-actions"><button type="button" className="quiet" aria-expanded={editing === r.id} aria-label={`Edit ${r.name}`} onClick={() => setEditing(editing === r.id ? null : r.id)}>Edit</button>
        <button type="button" className="quiet" aria-label={`Remove ${r.name}`} onClick={() => { try { rec.update(c => removeRace(c, r.id)); setSaid(`${r.name} removed.`); showUndo({message: `${r.name} removed.`, undone: `${r.name} is back.`, restore: () => rec.update(c => restoreRace(c, r))}); } catch (err) { setSaid(errorText(err)); } }}>Remove</button></span>
      {editing === r.id && <RaceForm key={r.id} initial={draftOf(r)} edit onSave={(d, c) => save(d, c, r.id)} onCancel={() => setEditing(null)}/>}
    </li>; })}</ul> : <p className="health-empty-inline">No race yet. Add the one you are training for, and a smaller B race on the way: the weeks between them show here, and the result after race day.</p>}
    {editing === 'new' ? <RaceForm initial={BLANK} onSave={(d, c) => save(d, c)} onCancel={() => setEditing(null)}/> : <div className="actions"><button type="button" className="secondary" onClick={() => setEditing('new')}>+ Add a race</button></div>}
    <p className="fine" role="status" aria-live="polite">{said}</p>
  </div>;
}

export function RaceForm({initial, edit = false, onSave, onCancel}: {initial: RaceDraft; edit?: boolean; onSave: (d: RaceDraft, countdown: boolean) => RaceIssue | null; onCancel: () => void}) {
  const id = useId(), [d, setD] = useState(initial), [countdown, setCountdown] = useState(false), [issue, setIssue] = useState<RaceIssue | null>(null);
  // Review B4E-6: "Another distance" is a choice of its own, so the typed distance never flips the list (or drops focus).
  const [own, setOwn] = useState(() => distanceChoice(false, initial.distanceKm) === 'own');
  const set = (patch: Partial<RaceDraft>) => { setD(x => ({...x, ...patch})); setIssue(null); };
  const submit = (e: FormEvent) => { e.preventDefault(); const problem = onSave(d, countdown); setIssue(problem); if (problem) document.getElementById(`${id}-${problem.field}`)?.focus(); };
  const field = (f: RaceIssue['field'], label: string, input: ReactNode) => <div><label className="field"><span>{label}</span>{input}</label>{issue?.field === f && <p className="field-error" id={`${id}-${f}-issue`} role="alert">{issue.message}</p>}</div>;
  const err = (f: RaceIssue['field']) => issue?.field === f ? {'aria-invalid': true as const, 'aria-describedby': `${id}-${f}-issue`} : {};
  const choice = distanceChoice(own, d.distanceKm);
  return <form className="health-form" aria-label={edit ? 'Edit the race' : 'Add a race'} noValidate onSubmit={submit}>
    <div className="health-form-grid">
      {field('name', 'Name', <input id={`${id}-name`} type="text" maxLength={60} value={d.name} onChange={e => set({name: e.target.value})} {...err('name')}/>)}
      {field('date', 'Race day', <input id={`${id}-date`} type="date" value={d.date} onChange={e => set({date: e.target.value})} {...err('date')}/>)}
      <label className="field"><span>Distance</span><select value={String(choice)} onChange={e => { const v = e.target.value; setOwn(v === 'own'); set({distanceKm: v === 'own' ? '' : v}); }}>{RACE_DISTANCES.map(x => <option key={x.km} value={String(x.km)}>{x.en}</option>)}<option value="own">Another distance</option></select></label>
      {choice === 'own' && field('distance', 'Distance (km)', <input id={`${id}-distance`} type="text" inputMode="decimal" value={d.distanceKm} onChange={e => set({distanceKm: e.target.value})} {...err('distance')}/>)}
      {/* Review B4E-7: a text keypad, so the ":" of "1:55:00" can be typed on a phone */}{field('goal', 'Goal time (optional, like 1:55:00)', <input id={`${id}-goal`} type="text" inputMode="text" autoComplete="off" value={d.goal} onChange={e => set({goal: e.target.value})} {...err('goal')}/>)}
      <label className="field"><span>Which race</span><select value={d.priority} onChange={e => set({priority: e.target.value as RaceDraft['priority']})}><option value="main">Main race</option><option value="b">B race (on the way)</option></select></label>
    </div>
    {!edit && <label className="r3-toggle"><input type="checkbox" checked={countdown} onChange={e => setCountdown(e.target.checked)}/> <span>Also make a countdown for it</span></label>}
    <div className="actions"><button type="submit" className="primary">Save the race</button><button type="button" className="quiet" onClick={onCancel}>Cancel</button></div>
  </form>;
}
