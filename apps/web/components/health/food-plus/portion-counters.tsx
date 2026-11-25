'use client';
import {useId, useRef, useState} from 'react';
import {FOOD_PLUS} from '../../../lib/food-plus/schema';
import {addOwn, BUILT_IN_PORTIONS, countOn, countPortion, MAX_OWN_PORTIONS, MAX_PORTION_COUNT, nameOf, OWN_NAME_MAX, portionLine, PORTION_WORDS, readPortions, removeCounter, setAim, setBuiltIn, type PortionCounter} from '../../../lib/food-plus/portions';
import {formatDate} from '../../../lib/visual-format';
import {useDeviceRecord} from '../../ai/use-device-record';
import '../r6/body-r6.css';

/**
 * Session AV lane 2, round 6 (r6-body; LEDGER #418, Lifesum's fruit, vegetable and fish trackers): Health → Food → a row
 * of one-tap portion counters for the diary's day — fruit, vegetables, fish and up to three of the person's own — none
 * on until chosen, each with its own aim a day or a week, and never an "off track" line. Kept on this device in the food
 * record's `portions`. Its own chunk.
 */
export default function PortionCounters({date, today}: {date: string; today: string}) {
  const rec = useDeviceRecord(FOOD_PLUS), [editing, setEditing] = useState(false), [status, setStatus] = useState(''), [own, setOwn] = useState(''), id = useId(), opener = useRef<HTMLButtonElement>(null);
  if (!rec.loaded || rec.unreadable) return null;
  const p = readPortions(rec.data), save = (change: Parameters<typeof rec.update>[0], said: string) => { try { rec.update(change); setStatus(said); return true; } catch (cause) { setStatus(cause instanceof Error ? cause.message : 'This could not be saved on this device.'); return false; } };
  const day = date === today ? 'today' : `on ${formatDate(date)}`;
  const count = (c: PortionCounter, by: 1 | -1) => { const now = countOn(p, c.id, date), next = Math.max(0, Math.min(MAX_PORTION_COUNT, now + by)); save(r => countPortion(r, c.id, date, by), `${nameOf(c)}: ${next} ${day}.`); };
  const close = () => { setEditing(false); requestAnimationFrame(() => opener.current?.focus()); };
  // Session AW (p5-fixes; FR-TJ-20): with no counter chosen the card was mostly empty space around one link. Until one is
  // chosen it is one teaching line with its link (no card), in the same section, so "Choose what to count" opens it here.
  if (!p.counters.length && !editing) return <section className="r6-portions r6-portions-empty" aria-labelledby={`${id}-title`}>
    <p className="r6-portions-teach"><strong id={`${id}-title`}>Portions {day === 'today' ? 'today' : day}</strong>{' · '}<span className="fine">Count fruit, vegetables or fish with one tap, or something of your own. None is on until you choose it, and there is no “off track”.</span>{' '}<button ref={opener} type="button" className="text-link" aria-expanded={false} onClick={() => setEditing(true)}>Choose what to count</button></p>
    <p className="fine r6-portions-status" role="status" aria-live="polite">{status}</p>
  </section>;
  return <section className="panel r6-portions" aria-labelledby={`${id}-title`}>
    <h3 id={`${id}-title`} className="r6-subtitle">Portions {day === 'today' ? 'today' : day}</h3>
    {p.counters.length ? <ul className="r6-portion-list">{p.counters.map(c => { const n = countOn(p, c.id, date), name = nameOf(c); return <li key={c.id} className="r6-portion">
      <strong>{name}</strong>
      <span className="r6-portion-count"><button type="button" className="secondary" aria-label={`One fewer: ${name}`} disabled={n === 0} onClick={() => count(c, -1)}>−</button><output aria-label={`${name} ${day}`}>{n}</output><button type="button" className="secondary" aria-label={`One more: ${name}`} disabled={n >= MAX_PORTION_COUNT} onClick={() => count(c, 1)}>+</button></span>
      <span className="r6-portion-line">{portionLine(p, c, date)}</span>
    </li>; })}</ul> : <p className="fine">Count portions of fruit, vegetables or fish with one tap, or something of your own. None is on until you choose it, and there is no “off track”.</p>}
    <p><button ref={opener} type="button" className="text-link" aria-expanded={editing} onClick={() => editing ? close() : setEditing(true)}>{editing ? 'Done' : p.counters.length ? 'Change your counters' : 'Choose what to count'}</button></p>
    {editing && <div className="r6-portion-settings">
      <fieldset><legend>Count these</legend>
        {BUILT_IN_PORTIONS.map(b => <label key={b} className="check-row"><input type="checkbox" checked={p.counters.some(c => c.id === b)} onChange={e => save(r => setBuiltIn(r, b, e.target.checked), e.target.checked ? `${PORTION_WORDS[b].en} is counted.` : `${PORTION_WORDS[b].en} is no longer shown; its days are kept.`)}/> <span>{PORTION_WORDS[b].en}</span></label>)}
      </fieldset>
      {p.counters.filter(c => c.id.startsWith('own-')).length < MAX_OWN_PORTIONS && <div className="r6-add">
        <label className="field"><span>A counter of your own ({p.counters.filter(c => c.id.startsWith('own-')).length} of {MAX_OWN_PORTIONS}), such as nuts or legumes</span><input type="text" value={own} maxLength={OWN_NAME_MAX} autoComplete="off" onChange={e => setOwn(e.target.value)}/></label>
        <button type="button" className="secondary" onClick={() => { const name = own; if (save(r => addOwn(r, name, `own-${crypto.randomUUID().replace(/-/g, '').slice(0, 12)}`), `${name.trim()} is counted.`)) setOwn(''); }}>Add</button>
      </div>}
      {p.counters.length > 0 && <fieldset><legend>Your aims (optional)</legend>
        {p.counters.map(c => <Aim key={c.id} c={c} onSave={(aim, said) => save(r => setAim(r, c.id, aim), said)} onRemove={c.id.startsWith('own-') ? () => save(r => removeCounter(r, c.id), `${nameOf(c)} is removed, with its days.`) : undefined}/>)}
      </fieldset>}
      <p className="fine">A portion is what you count as one; nothing is worked out from your diary. An aim only says when it is reached.</p>
    </div>}
    <p className="fine" role="status" aria-live="polite">{status}</p>
  </section>;
}

function Aim({c, onSave, onRemove}: {c: PortionCounter; onSave: (aim: {n: number; per: 'day' | 'week'} | null, said: string) => boolean; onRemove?: () => void}) {
  const [n, setN] = useState(c.aim ? String(c.aim.n) : ''), [per, setPer] = useState<'day' | 'week'>(c.aim?.per ?? 'day'), name = nameOf(c);
  const submit = () => {
    if (!n.trim()) { onSave(null, `${name}: no aim.`); return; }
    const v = Number(n);
    if (!Number.isInteger(v) || v < 1 || v > MAX_PORTION_COUNT) { onSave({n: -1, per}, ''); return; }
    onSave({n: v, per}, `${name}: your aim is ${v} a ${per}.`);
  };
  return <div className="r6-add" role="group" aria-label={`Aim for ${name}`}>
    <label className="field"><span>{name}: portions</span><input type="text" inputMode="numeric" value={n} maxLength={2} onChange={e => setN(e.target.value)}/></label>
    <label className="field"><span>Per</span><select value={per} onChange={e => setPer(e.target.value as 'day' | 'week')}><option value="day">day</option><option value="week">week</option></select></label>
    <button type="button" className="secondary" onClick={submit}>Save the aim<span className="sr-only"> for {name}</span></button>
    {onRemove && <button type="button" className="quiet" onClick={onRemove}>Remove<span className="sr-only"> {name}</span></button>}
  </div>;
}
