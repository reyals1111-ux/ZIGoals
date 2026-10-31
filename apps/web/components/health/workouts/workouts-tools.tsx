'use client';
import {useId, useState} from 'react';
import {formatNumber} from '../../../lib/visual-format';
import {addWarmups, BAR_CHOICES, defaultPlates, plateLoad, platesFor, savePlates, warmupRamp, workingWeightKg} from '../../../lib/workouts/depth';
import type {ExerciseEntry, PlateSetup, Workouts} from '../../../lib/workouts/schema';
import {fromUnit, toUnit} from './units';

/**
 * Session AK (4.9; COMPETITORS.md T1, T2 — Strong's warm-up and plate calculators): a small sheet under a weighted
 * exercise. The warm-up ramp builds up to the working weight (bar × 10, 40 % × 5, 60 % × 3, 80 % × 1), each step rounded
 * to what the bar and plates can load, and can be added as warm-up sets to edit. The plate calculator lists the plates
 * for each side. Bar and plates are kept on this device, in the Health weight unit. Loaded only when opened.
 */
const n = (v: number) => formatNumber(v, {maximumFractionDigits: 2});
export default function WorkoutTools({entry, w, unit, change}: {entry: ExerciseEntry; w: Workouts; unit: 'kg' | 'lb'; change: (fn: (w: Workouts) => Workouts, said?: string) => boolean}) {
  const setup = platesFor(w, unit), id = useId();
  const working = workingWeightKg(entry);
  const [target, setTarget] = useState(working === null ? '' : String(Math.round(toUnit(working, unit) * 100) / 100)), [editing, setEditing] = useState(false);
  const value = Number(target.replace(',', '.')), valid = target.trim() !== '' && Number.isFinite(value) && value > 0 && value <= (unit === 'kg' ? 1000 : 2204);
  const ramp = valid ? warmupRamp(value, setup) : [], load = valid ? plateLoad(value, setup) : null;
  return <div className="workouts-tools">
    <label className="field"><span>Working weight ({unit})</span>
      <input className="workouts-num" inputMode="decimal" value={target} onChange={e => setTarget(e.target.value)} aria-describedby={`${id}-bar`}/></label>
    <p className="fine" id={`${id}-bar`}>Bar {n(setup.bar)} {unit}; plates {setup.plates.map(p => n(p.size)).join(', ')} {unit}.</p>
    {target.trim() !== '' && !valid && <p className="workouts-import-problem" role="alert">Enter a weight above 0 {unit}.</p>}

    {load && <section aria-labelledby={`${id}-plates`} className="workouts-tool">
      <h4 id={`${id}-plates`}>Plates for each side</h4>
      {load.belowBar ? <p>That is less than the bar alone ({n(setup.bar)} {unit}).</p>
        : load.perSide.length ? <p><strong>{load.perSide.map(n).join(' + ')}</strong> {unit} on each side{load.exact ? '' : `, the nearest these plates make: ${n(load.total)} ${unit} in all`}.</p>
          : <p>The bar alone: {n(load.total)} {unit}{load.exact ? '' : `, the nearest these plates make`}.</p>}
    </section>}

    {valid && entry.measure === 'weight-reps' && <section aria-labelledby={`${id}-warm`} className="workouts-tool">
      <h4 id={`${id}-warm`}>Warm-up</h4>
      {ramp.length ? <>
        <ol className="workouts-ramp">{ramp.map(s => <li key={s.weight}>{n(s.weight)} {unit} × {s.reps}</li>)}</ol>
        <button className="secondary" type="button" onClick={() => change(x => addWarmups(x, entry.id, ramp.map(s => ({weightKg: fromUnit(s.weight, unit), reps: s.reps}))), `${ramp.length} warm-up sets added to ${entry.name}. Edit them as you like.`)}>Add these warm-up sets</button>
        <p className="fine">Unticked warm-up sets already there are replaced; ticked ones stay.</p>
      </> : <p className="fine">No warm-up needed at or under the bar’s weight.</p>}
    </section>}

    <details className="workouts-tool" open={editing} onToggle={e => setEditing((e.currentTarget as HTMLDetailsElement).open)}>
      <summary>Your bar and plates</summary>
      {editing && <PlatesForm setup={setup} unit={unit} onSave={next => change(x => savePlates(x, next), 'Bar and plates saved on this device.')}/>}
    </details>
  </div>;
}

function PlatesForm({setup, unit, onSave}: {setup: PlateSetup; unit: 'kg' | 'lb'; onSave: (s: PlateSetup) => boolean}) {
  const standard = defaultPlates(unit), sizes = [...new Set([...standard.plates.map(p => p.size), ...setup.plates.map(p => p.size)])].sort((a, b) => b - a);
  const [bar, setBar] = useState(String(setup.bar)), [pairs, setPairs] = useState<Record<string, string>>(() => Object.fromEntries(sizes.map(s => [String(s), String(setup.plates.find(p => p.size === s)?.pairs ?? 0)])));
  const [problem, setProblem] = useState('');
  const submit = () => {
    const b = Number(bar), plates = sizes.map(size => ({size, pairs: Number(pairs[String(size)] ?? 0)}));
    if (plates.some(p => !Number.isInteger(p.pairs) || p.pairs < 0 || p.pairs > 20)) { setProblem('Enter whole pairs from 0 to 20.'); return; }
    setProblem('');
    onSave({unit, bar: b, plates});
  };
  return <form className="workouts-plates-form" onSubmit={e => { e.preventDefault(); submit(); }}>
    <label className="field"><span>Bar ({unit})</span>
      <select value={bar} onChange={e => setBar(e.target.value)}>{[...new Set([...BAR_CHOICES[unit], setup.bar])].map(b => <option key={b} value={b}>{n(b)} {unit}</option>)}</select></label>
    <fieldset><legend>Pairs of plates</legend>
      <div className="workouts-plates-grid">{sizes.map(size => <label key={size} className="field"><span>{n(size)} {unit}</span>
        <input className="workouts-num" inputMode="numeric" value={pairs[String(size)] ?? '0'} onChange={e => setPairs(p => ({...p, [String(size)]: e.target.value}))}/></label>)}</div>
    </fieldset>
    {problem && <p className="workouts-import-problem" role="alert">{problem}</p>}
    <div className="workouts-row-actions"><button className="secondary" type="submit">Save bar and plates</button></div>
  </form>;
}
