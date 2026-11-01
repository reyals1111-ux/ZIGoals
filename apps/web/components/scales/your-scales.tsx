'use client';
import Link from 'next/link';
import {useId, useState, type FormEvent} from 'react';
import {useDeviceRecord} from '../ai/use-device-record';
import {SCALES, MAX_SCALES, SCALE_END_MAX, SCALE_NAME_MAX, type Scale} from '../../lib/scales/store';
import {SUGGESTED, addScale, editScale, rateScale, removeScale, valueWords} from '../../lib/scales/engine';
import {isShowcase} from '../../lib/showcase-storage';
import '../journal/journal.css';
import './your-scales.css';

/**
 * Session AK (BUILD list 2 #12, lane G1a): "Your own scales" — up to five 1–5 ratings of the person's own (stress, pain,
 * focus…), each with their words for both ends. Optional and skippable: nothing rated stays unknown. Each saves on its
 * own tap to `zigoals:scales:v1`; each becomes a Compare factor and outcome (Health → Insights). In the check-in and on
 * the Journal page; loaded on use. `compact` (the check-in) keeps setup behind a fold. `onStatus` (the check-in): what a
 * save says goes to the host's own status line, so one card has one live region (Session AK CI fix: the check-in's card
 * held two `role=status` regions, its own and this one); without it the scales keep their own.
 */
export default function YourScales({day, compact = false, onStatus}: {day: string; compact?: boolean; onStatus?: (said: string) => void}) {
  const rec = useDeviceRecord(SCALES), id = useId();
  const [ownStatus, setOwnStatus] = useState(''), [managing, setManaging] = useState(false);
  const setStatus = onStatus ?? setOwnStatus;
  if (!rec.loaded) return null;
  const write = (fn: Parameters<typeof rec.update>[0], said: string) => { try { rec.update(fn); setStatus(said); return true; } catch (e) { setStatus(e instanceof Error && e.message && !/^\[/.test(e.message) ? e.message : 'This could not be saved on this device.'); return false; } };
  const today = rec.data.days[day] ?? {}, scales = rec.data.scales;
  if (compact && !scales.length) return <p className="fine your-scales-invite">Want to follow something of your own, such as stress or pain? <Link className="text-link" href="/app/journal#your-scales">Add your own scale</Link> (optional).</p>;
  return <div className="your-scales">
    {rec.unreadable && <p role="alert">Your scales could not be read on this device, so none show. Nothing was changed.</p>}
    {isShowcase() && scales.length > 0 && <p className="fine">Showcase: fictional example scales.</p>}
    {scales.length ? scales.map(s => <ScaleRow key={s.id} scale={s} value={today[s.id] ?? null} name={`${id}-${s.id}`}
      onRate={v => write(r => rateScale(r, day, s.id, v), v === null ? `${s.name}: cleared for today.` : `${s.name}: ${v} of 5 (${valueWords(s, v)}). Kept on this device.`)}/>)
      : <p className="your-scales-empty">Add a 1–5 scale for something you want to follow, with your own words for each end. Rate it here when you like; skip any day. After a few weeks, Health → Insights → Compare can show what goes with it.</p>}
    {!onStatus && <p className="your-scales-status" role="status" aria-live="polite">{ownStatus}</p>}
    {(!compact || managing) ? <ManageScales scales={scales} onAdd={input => write(r => addScale(r, input), `Added “${input.name.trim()}”.`)} onEdit={(sid, input) => write(r => editScale(r, sid, input), 'Saved.')}
      onRemove={s => write(r => removeScale(r, s.id), `“${s.name}” is off the check-in. Its ratings stay, and adding it again by name brings them back.`)}/>
      : <button type="button" className="text-link" onClick={() => setManaging(true)}>Change your scales</button>}
  </div>;
}

function ScaleRow({scale: s, value, name, onRate}: {scale: Scale; value: number | null; name: string; onRate: (v: number | null) => void}) {
  return <fieldset className="your-scales-row"><legend>{s.name}</legend>
    <div className="your-scales-ends" aria-hidden="true"><span>1 · {s.low}</span><span>5 · {s.high}</span></div>
    <div className="your-scales-dots">{[1, 2, 3, 4, 5].map(n => <label key={n} className="journal-energy-dot"><input type="radio" name={name} checked={value === n} onChange={() => onRate(n)}/><span aria-hidden="true">{n}</span><span className="sr-only">{n} of 5{n === 1 ? `, ${s.low}` : n === 5 ? `, ${s.high}` : ''}</span></label>)}
      {value !== null && <button type="button" className="quiet" onClick={() => onRate(null)}>Clear</button>}</div>
  </fieldset>;
}

function ManageScales({scales, onAdd, onEdit, onRemove}: {scales: readonly Scale[]; onAdd: (i: {name: string; low: string; high: string}) => boolean; onEdit: (id: string, i: {name: string; low: string; high: string}) => boolean; onRemove: (s: Scale) => void}) {
  const [name, setName] = useState(''), [low, setLow] = useState(''), [high, setHigh] = useState(''), [editing, setEditing] = useState<string | null>(null);
  const suggestions = SUGGESTED.filter(x => !scales.some(s => s.name.toLocaleLowerCase('en') === x.name.toLocaleLowerCase('en')));
  const submit = (e: FormEvent) => { e.preventDefault(); const input = {name, low, high}; if (editing ? onEdit(editing, input) : onAdd(input)) { setName(''); setLow(''); setHigh(''); setEditing(null); } };
  return <div className="your-scales-manage">
    {scales.length > 0 && <ul className="your-scales-list" aria-label="Your scales">{scales.map(s => <li key={s.id}>
      <span><strong>{s.name}</strong> <small>{s.low} … {s.high}</small></span>
      <span className="your-scales-actions"><button type="button" className="quiet" aria-label={`Edit ${s.name}`} onClick={() => { setEditing(s.id); setName(s.name); setLow(s.low); setHigh(s.high); }}>Edit</button>
        <button type="button" className="quiet" aria-label={`Remove ${s.name}`} onClick={() => onRemove(s)}>Remove</button></span>
    </li>)}</ul>}
    {(scales.length < MAX_SCALES || editing) ? <form className="your-scales-form" aria-label={editing ? 'Edit a scale' : 'Add a scale'} onSubmit={submit}>
      {!editing && suggestions.length > 0 && <div className="your-scales-suggest" role="group" aria-label="Ideas">{suggestions.slice(0, 5).map(x => <button key={x.name} type="button" className="secondary" onClick={() => { setName(x.name); setLow(x.low); setHigh(x.high); }}>{x.name}</button>)}</div>}
      <div className="your-scales-fields">
        <label className="field"><span>Scale name</span><input maxLength={SCALE_NAME_MAX} value={name} onChange={e => setName(e.target.value)} placeholder="Stress"/></label>
        <label className="field"><span>Word for 1</span><input maxLength={SCALE_END_MAX} value={low} onChange={e => setLow(e.target.value)} placeholder="calm"/></label>
        <label className="field"><span>Word for 5</span><input maxLength={SCALE_END_MAX} value={high} onChange={e => setHigh(e.target.value)} placeholder="very tense"/></label>
      </div>
      <div className="actions"><button type="submit" className="primary">{editing ? 'Save scale' : 'Add scale'}</button>{editing && <button type="button" className="quiet" onClick={() => { setEditing(null); setName(''); setLow(''); setHigh(''); }}>Cancel</button>}</div>
    </form> : <p className="fine">Five scales is the most at once. Remove one to add another; its ratings stay.</p>}
  </div>;
}
