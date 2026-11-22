'use client';
import {useId, useMemo, useState} from 'react';
import {addShoe, DEFAULT_RETIRE_KM, removeShoe, retireShoe, shoeStates} from '../../../lib/workouts/shoes';
import type {Workouts} from '../../../lib/workouts/schema';
import {formatDate, formatNumber} from '../../../lib/visual-format';
import './av2-body.css';

/**
 * Session AV lane 2 (body; LEDGER #203, Nike Run Club's shoe tagging): Health → Workouts → "Shoes": each pair with the
 * distance it had when added plus the runs it was picked on, a bar to its retire distance, a note near the limit (90 %)
 * and past it; add a pair; retire one (kept for its history) or put it back; remove a retired pair. A run picks its pair
 * in "Your workouts". Its own chunk.
 */
type Change = (fn: (w: Workouts) => Workouts, said?: string, undone?: string) => boolean;
const km = (n: number) => `${formatNumber(n, {maximumFractionDigits: 1})} km`;
export default function Shoes({w, change}: {w: Workouts; change: Change}) {
  const states = useMemo(() => shoeStates(w), [w]), id = useId();
  const [name, setName] = useState(''), [start, setStart] = useState('0'), [retire, setRetire] = useState(String(DEFAULT_RETIRE_KM)), [problem, setProblem] = useState('');
  const add = () => {
    const s = Number(start.replace(',', '.')), r = Number(retire.replace(',', '.'));
    let made = '';
    try { if (change(x => { const out = addShoe(x, {name, startKm: s, retireKm: r}, new Date()); made = out.shoe.name; return out.workouts; })) { setProblem(''); setName(''); setStart('0'); void made; } }
    catch (e) { setProblem(e instanceof Error ? e.message : 'These shoes could not be added.'); }
  };
  const active = states.filter(s => !s.shoe.retiredAt), retired = states.filter(s => s.shoe.retiredAt);
  return <div className="av2-shoes">
    {states.length === 0 && <p className="fine">No shoes yet. Add a pair with the distance it already has and the distance you retire shoes at (often 500 to 800 km). Then pick it on a run in “Your workouts” and its distance adds up here.</p>}
    {active.length > 0 && <ul className="av2-goal-list" aria-label="Shoes in use">{active.map(s => <li key={s.shoe.id}>
      <div className="av2-goal-head"><strong>{s.shoe.name}</strong> <span>{km(s.km)} of {km(s.shoe.retireKm)}</span></div>
      <div className="av2-goal-bar" role="progressbar" aria-label={s.shoe.name} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(s.share * 100)} aria-valuetext={`${km(s.km)} of ${km(s.shoe.retireKm)}`}><span style={{inlineSize: `${Math.round(s.share * 100)}%`}}/></div>
      <p className={s.near || s.over ? 'av2-shoe-note' : 'fine'}>{s.over ? `Past its retire distance by ${km(s.km - s.shoe.retireKm)}. Time for a new pair?` : s.near ? `Near its limit: ${km(s.shoe.retireKm - s.km)} to go.` : `${s.runs} ${s.runs === 1 ? 'run' : 'runs'} here${s.lastRun ? `, the last ${formatDate(s.lastRun, {year: false})}` : ''}${s.shoe.startKm ? ` · ${km(s.shoe.startKm)} before` : ''}.`}</p>
      <button type="button" className="quiet" onClick={() => change(x => retireShoe(x, s.shoe.id, new Date()), `${s.shoe.name} retired. Its runs keep their distance.`)} aria-label={`Retire ${s.shoe.name}`}>Retire</button>
    </li>)}</ul>}
    {retired.length > 0 && <details className="av2-fold"><summary>Retired shoes ({retired.length})</summary><ul className="av2-goal-list">{retired.map(s => <li key={s.shoe.id}>
      <div className="av2-goal-head"><strong>{s.shoe.name}</strong> <span>{km(s.km)} in all, retired {formatDate(s.shoe.retiredAt!.slice(0, 10), {year: false})}</span></div>
      <div className="av2-shoe-actions"><button type="button" className="quiet" onClick={() => change(x => retireShoe(x, s.shoe.id, new Date(), false), `${s.shoe.name} is back in use.`)} aria-label={`Use ${s.shoe.name} again`}>Use again</button>
        <button type="button" className="quiet" onClick={() => change(x => removeShoe(x, s.shoe.id), `${s.shoe.name} removed. Its runs keep their distance.`)} aria-label={`Remove ${s.shoe.name}`}>Remove</button></div>
    </li>)}</ul></details>}
    <form className="av2-goal-form" aria-labelledby={`${id}-add`} onSubmit={e => { e.preventDefault(); add(); }}>
      <h3 id={`${id}-add`} className="av2-form-title">Add a pair</h3>
      <label className="field"><span>Name</span><input value={name} maxLength={60} onChange={e => setName(e.target.value)} placeholder="Blue trainers"/></label>
      <label className="field"><span>Distance already run (km)</span><input inputMode="decimal" value={start} onChange={e => setStart(e.target.value)}/></label>
      <label className="field"><span>Retire at (km)</span><input inputMode="decimal" value={retire} onChange={e => setRetire(e.target.value)}/></label>
      <button type="submit" className="secondary">Add the shoes</button>
    </form>
    {problem && <p role="alert" className="av2-problem">{problem}</p>}
  </div>;
}
