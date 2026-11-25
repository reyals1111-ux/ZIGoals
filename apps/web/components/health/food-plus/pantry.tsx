'use client';
import {useId, useState} from 'react';
import {groceryName, setPantry, setUseBy, type GroceryRecord} from '../../../lib/grocery/schema';
import {quantityText, type GroceryItem} from '../../../lib/grocery/list';
import {latestUseBy, byDayOf, byDayWords, pantrySoon} from '../../../lib/grocery/use-soon';
import './food-plus.css';

/**
 * Session AW (X5, LEDGER #452; Paprika's pantry with expiry days): on the grocery list, "Use soon" first — the pantry
 * items within three days of their use-by day, then those past it, said plainly — and "Already at home" with a use-by day
 * on each item and a way to add what is at home. The day is kept in the grocery record (`useBy`); no notification.
 */
type Keep = (change: (r: GroceryRecord) => GroceryRecord, done?: string) => void;
const shown = (name: string) => name ? name[0]!.toLocaleUpperCase() + name.slice(1) : name;
export function UseSoon({record, today}: {record: GroceryRecord; today: string}) {
  const id = useId(), {soon, past} = pantrySoon(record, today);
  if (!soon.length && !past.length) return null;
  return <section className="food-plus-use-soon" aria-labelledby={`${id}-use-soon`}>
    <h3 id={`${id}-use-soon`}>Use soon</h3>
    <ul>{[...soon, ...past].map(i => <li key={i.name}><strong>{shown(i.name)}</strong>: {byDayWords(i, today)}</li>)}</ul>
  </section>;
}
export function PantryAtHome({record, onList, today, keep}: {record: GroceryRecord; onList: readonly GroceryItem[]; today: string; keep: Keep}) {
  const id = useId(), [name, setName] = useState(''), [day, setDay] = useState(''), [issue, setIssue] = useState('');
  const now = () => new Date().toISOString();
  const byName = new Map(onList.map(i => [groceryName(i.name), i]));
  const names = Object.keys(record.pantry ?? {}).sort((a, b) => (record.useBy?.[a] ?? '9999').localeCompare(record.useBy?.[b] ?? '9999') || a.localeCompare(b));
  const add = () => {
    const clean = name.trim();
    if (!clean) { setIssue('Type what you have at home, like rice or yoghurt.'); return; }
    if (clean.length > 120) { setIssue(`An item can be at most 120 characters (this one has ${clean.length}).`); return; }
    keep(r => day ? setUseBy(r, clean, day, now()) : setPantry(r, clean, true, now()), `${clean} is at home${day ? `, ${byDayOf(day, today)}` : ''}.`);
    setName(''); setDay(''); setIssue('');
  };
  return <details className="food-plus-pantry-fold"><summary className="fine fold-summary" style={{minHeight: 44, display: 'flex', alignItems: 'center', cursor: 'pointer'}}>{names.length ? `Already at home (${names.length})` : 'What you have at home'}</summary>
    <div className="food-plus-pantry">
      <p className="fine">Things at home stay off the list until you put them back. Give one a use-by day and it shows under “Use soon” when it is three days away or past; nothing reminds you unless you ask.</p>
      {names.length > 0 && <ul className="health-micro-list" aria-label="Already at home">{names.map(n => { const item = byName.get(n), label = item?.name ?? shown(n), useBy = record.useBy?.[n] ?? ''; return <li key={n}>
        <div><strong>{label}</strong>{item && <small> {quantityText(item)}</small>}</div>
        <div className="actions" style={{margin: 0}}>
          <label className="field"><span>Use by</span><input type="date" value={useBy} min="2000-01-01" max={latestUseBy(today)} aria-label={`Use by: ${label}`} onChange={e => keep(r => setUseBy(r, n, e.target.value || null, now()), e.target.value ? `${label}: ${byDayOf(e.target.value, today)}.` : `${label}: no use-by day.`)}/></label>
          <button type="button" className="quiet" aria-label={`Put ${label} back on the list`} onClick={() => keep(r => setPantry(r, n, false, now()))}>Put back</button>
        </div>
      </li>; })}</ul>}
      <form className="health-micro-edit" noValidate aria-label="Add what you have at home" onSubmit={e => { e.preventDefault(); add(); }}>
        <label className="field"><span>Item at home</span><input type="text" value={name} maxLength={200} aria-invalid={issue ? true : undefined} aria-describedby={issue ? `${id}-issue` : undefined} onChange={e => { setName(e.target.value); setIssue(''); }} placeholder="Rice, yoghurt…"/></label>
        <label className="field"><span>Use by (optional)</span><input type="date" value={day} min={today} max={latestUseBy(today)} onChange={e => setDay(e.target.value)}/></label>
        <button type="submit" className="secondary">Add</button>
        {issue && <p className="field-error" id={`${id}-issue`} role="alert">{issue}</p>}
      </form>
    </div>
  </details>;
}
