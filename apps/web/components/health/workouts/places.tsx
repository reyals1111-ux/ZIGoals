'use client';
import {useId, useState} from 'react';
import {useDeviceRecord} from '../../ai/use-device-record';
import {EQUIPMENT, EQUIPMENT_WORDS, PLACE_PRESETS} from '../../../lib/workouts/equipment';
import {addPlace, choosePlace, editPlace, removePlace} from '../../../lib/workouts/places';
import {MAX_PLACES, WORKOUT_PLACES, type Place} from '../../../lib/workouts/places-schema';
import {plainErrorMessage} from '../../../lib/plain-error';
import {showUndo} from '../../ui/undo-toast';
import './av2-bodymind-workouts.css';

/**
 * Session AV lane 2 (bodymind-r2; LEDGER #239, Fitbod's gym profiles and equipment): Health → Workouts → Start a workout →
 * "Places and equipment". Up to five places (from a ready-made set — a full gym, home with dumbbells, body weight only —
 * or empty), each with the equipment there, ticked from fifteen pieces; one is the place for now. The exercise picker, the
 * library, "Suggest a workout" and "Replace" then offer only what that place has. Kept on this device
 * (zigoals:workout-places:v1). Its own chunk, loaded when the fold opens.
 */
export default function Places() {
  const record = useDeviceRecord(WORKOUT_PLACES), id = useId();
  const [name, setName] = useState(''), [preset, setPreset] = useState('home'), [editing, setEditing] = useState<string | null>(null), [note, setNote] = useState(''), [problem, setProblem] = useState('');
  if (!record.loaded) return <p className="fine">Opening your places…</p>;
  const r = record.data;
  const change = (fn: Parameters<typeof record.update>[0], said: string) => { try { record.update(fn); setProblem(''); setNote(said); return true; } catch (e) { setProblem(plainErrorMessage(e, 'That could not be saved on this device.')); return false; } };
  const add = () => {
    const p = PLACE_PRESETS.find(x => x.id === preset), typed = name.trim() || (p ? p.name.en : '');
    let made: Place | undefined;
    if (change(x => { const out = addPlace(x, typed, p?.equipment ?? [], new Date()); made = out.place; return out.record; }, `${typed} is added${r.places.length ? '' : ' and is your place for now'}.`)) { setName(''); if (made) setEditing(made.id); }
  };
  const remove = (p: Place) => {
    const before = record.data;
    if (change(x => removePlace(x, p.id), `${p.name} is removed.`)) showUndo({message: `${p.name} is removed.`, undone: `${p.name} is back.`, restore: () => record.update(x => x.places.some(y => y.id === p.id) ? x : {...x, places: [...x.places, p].slice(0, MAX_PLACES), ...(before.current === p.id ? {current: p.id} : {})})});
  };
  return <div className="av2-places">
    <p className="fine">Add the places you train and what each has. The exercise list, the library and “Suggest a workout” then offer only what you can do there. The floor and your own body weight are always there.</p>
    {note && <p className="fine" role="status">{note}</p>}
    {record.unreadable && <p className="notice" role="alert">The places on this device could not be read. Their bytes are kept; adding a place writes a new record.</p>}
    {r.places.length > 0 && <fieldset className="av2-place-now"><legend>Place for now</legend>
      <label><input type="radio" name={`${id}-now`} checked={!r.current} onChange={() => change(x => choosePlace(x, null), 'Any place: nothing is filtered.')}/> Any place</label>
      {r.places.map(p => <label key={p.id}><input type="radio" name={`${id}-now`} checked={r.current === p.id} onChange={() => change(x => choosePlace(x, p.id), `${p.name} is your place for now.`)}/> {p.name}</label>)}
    </fieldset>}
    <ul className="av2-places-list">{r.places.map(p => <li key={p.id}>
      <div><strong>{p.name}</strong> <span className="fine">{p.equipment.length ? p.equipment.filter(e => e in EQUIPMENT_WORDS).map(e => EQUIPMENT_WORDS[e as keyof typeof EQUIPMENT_WORDS].en).join(', ') : 'Body weight only'}</span></div>
      <div className="workouts-row-actions">
        <button type="button" className="quiet" aria-expanded={editing === p.id} aria-label={`Edit ${p.name}`} onClick={() => setEditing(editing === p.id ? null : p.id)}>Edit</button>
        <button type="button" className="quiet" aria-label={`Remove ${p.name}`} onClick={() => remove(p)}>Remove</button>
      </div>
      {editing === p.id && <PlaceEdit place={p} onName={n => change(x => editPlace(x, p.id, {name: n}), `Renamed to ${n.trim()}.`)} onToggle={(e, on) => change(x => editPlace(x, p.id, {equipment: on ? [...p.equipment, e] : p.equipment.filter(y => y !== e)}), `${EQUIPMENT_WORDS[e].en} ${on ? 'added to' : 'taken off'} ${p.name}.`)} onDone={() => setEditing(null)}/>}
    </li>)}</ul>
    {r.places.length < MAX_PLACES ? <form className="av2-place-add" onSubmit={e => { e.preventDefault(); add(); }}>
      <label className="field"><span>A new place</span><input value={name} maxLength={40} placeholder="Home, Gym, Hotel…" onChange={e => setName(e.target.value)}/></label>
      <label className="field"><span>Start from</span><select value={preset} onChange={e => setPreset(e.target.value)}>{PLACE_PRESETS.map(p => <option key={p.id} value={p.id}>{p.name.en}</option>)}<option value="">Nothing ticked</option></select></label>
      <button type="submit" className="secondary">Add the place</button>
    </form> : <p className="fine">{MAX_PLACES} places is the most. Remove one to add another.</p>}
    {problem && <p role="alert">{problem}</p>}
  </div>;
}

function PlaceEdit({place, onName, onToggle, onDone}: {place: Place; onName: (n: string) => boolean; onToggle: (e: typeof EQUIPMENT[number], on: boolean) => boolean; onDone: () => void}) {
  const [name, setName] = useState(place.name);
  return <div className="av2-place-edit">
    <form onSubmit={e => { e.preventDefault(); if (name.trim() !== place.name) onName(name); }}><label className="field"><span>Name</span><input value={name} maxLength={40} onChange={e => setName(e.target.value)} onBlur={() => { if (name.trim() && name.trim() !== place.name) onName(name); }}/></label></form>
    <fieldset><legend>Equipment at {place.name}</legend>
      <div className="av2-equipment">{EQUIPMENT.map(e => <label key={e}><input type="checkbox" checked={place.equipment.includes(e)} onChange={x => onToggle(e, x.target.checked)}/> {EQUIPMENT_WORDS[e].en}</label>)}</div>
    </fieldset>
    <button type="button" className="text-link" onClick={onDone}>Done</button>
  </div>;
}
