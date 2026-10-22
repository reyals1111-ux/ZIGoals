'use client';
import {Fragment, useEffect, useMemo, useRef, useState, type CSSProperties, type FormEvent, type KeyboardEvent, type PointerEvent} from 'react';
import {PATH_COLOURS, pathColour} from '../../lib/path/colours';
import {CHECKLIST_COLOUR_IDS, nebulaColour} from '../../lib/path/orbit-colours';
import {HEALTH_MEALS} from '../../lib/health';
import {latestHabitRule} from '../../lib/habits';
import {addCustom, addFavourite, addSection, customToHabit, isFavourite, moveItem, moveWithinSection, newChecklistId, orderedItems, removeItem, removeSection, sectionOfItem, sectionsOf, updateItem, updateSection, type FavouriteRef} from '../../lib/checklist/store';
import type {DerivedDot} from '../../lib/checklist/derive';
import {storageMessageOr} from '../../lib/storage-error-copy';
import {PathGlyph} from '../path/path-glyphs';
import {itemGlyph} from '../../lib/checklist/glyphs';
import type {ChecklistState} from './use-checklist';

/**
 * Edit path (P7.3, P7.5): what is on the path, in its order — drag a row by its handle, or use Move up / Move down (and
 * the arrow keys on the handle), change its orbit and colour, take it off; custom items ("Play piano 15 minutes") with
 * their own words and colour, and "Make this a habit"; the orbits themselves (rename, recolour, add, remove); and
 * everything that can be added from the app's pages. Every change is a device write with its words said back.
 * Round 3: the rows stand under their orbits' names (as the List does), each row's planet is its own drag handle (no
 * separate grip column), and a name may take two lines instead of being cut.
 */
const message = (e: unknown) => storageMessageOr(e, 'Not saved on this device. Try again.');
const SECTION_TIME: Record<string, 'morning' | 'afternoon' | 'evening' | 'anytime'> = {morning: 'morning', afternoon: 'afternoon', evening: 'evening'};
/** `addTo` (Session AG Polish, the List's "+ Add to … Orbit"): the orbit the new item's form starts in, focused. */
export function EditPath({state, onClose, addTo}: {state: ChecklistState; onClose: () => void; addTo?: string}) {
  const {record} = state, sections = sectionsOf(record.data), items = orderedItems(record.data);
  const addInput = useRef<HTMLInputElement>(null);
  useEffect(() => { if (addTo) { addInput.current?.scrollIntoView({block: 'center'}); addInput.current?.focus({preventScroll: true}); } }, [addTo]);
  // The list reads as the path does: orbit by orbit, each in its own order.
  const pathOrder = sections.flatMap(s => items.filter(i => sectionOfItem(record.data, i) === s.id));
  const [status, setStatus] = useState(''), [custom, setCustom] = useState({label: '', colour: 'pink', section: addTo && sections.some(s => s.id === addTo) ? addTo : 'anytime'}), [orbitName, setOrbitName] = useState(''), [openRow, setOpenRow] = useState<string | null>(null);
  const dotById = useMemo(() => new Map(state.dots.map(d => [d.id, d])), [state.dots]);
  const write = (change: Parameters<typeof record.update>[0], words: string) => { try { record.update(change); setStatus(words); return true; } catch (e) { setStatus(message(e)); return false; } };
  const add = (ref: FavouriteRef, label: string, extra: {section?: string; defaultValue?: number; unit?: string} = {}) => write(r => addFavourite(r, ref, {id: newChecklistId(), at: new Date(), label, ...extra}), `${label} added to your path.`);

  // Drag by the handle (pointer), with the keyboard and tap alternative beside it.
  const list = useRef<HTMLOListElement>(null), [drag, setDrag] = useState<{id: string; dy: number; startY: number} | null>(null);
  function onPointerDown(e: PointerEvent<HTMLButtonElement>, id: string) { e.currentTarget.setPointerCapture(e.pointerId); setDrag({id, dy: 0, startY: e.clientY}); }
  function onPointerMove(e: PointerEvent<HTMLButtonElement>) { if (drag) setDrag({...drag, dy: e.clientY - drag.startY}); }
  function onPointerUp(e: PointerEvent<HTMLButtonElement>) {
    if (!drag) return;
    const rows = [...(list.current?.querySelectorAll<HTMLElement>('[data-edit-row]') ?? [])], y = e.clientY;
    // Dropped over another row: the item takes that row's orbit and its place (before it going up, after it going down).
    let to = rows.findIndex(r => { const b = r.getBoundingClientRect(); return y < b.top + b.height / 2; }); if (to < 0) to = rows.length - 1;
    const from = pathOrder.findIndex(i => i.id === drag.id); if (to > from) to = Math.max(from, to - 1);
    setDrag(null);
    const target = pathOrder[to], id = drag.id;
    if (Math.abs(drag.dy) <= 8 || to === from || !target) return;
    const label = dotById.get(id)?.label ?? 'Item', section = sectionOfItem(record.data, target), orbit = sections.find(x => x.id === section)?.label ?? 'that orbit';
    write(r => moveItem(updateItem(r, id, {section}), id, orderedItems(r).findIndex(i => i.id === target.id)), `${label} moved to place ${to + 1}, in ${orbit}.`);
  }
  function onHandleKey(e: KeyboardEvent<HTMLButtonElement>, id: string, label: string) {
    if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return;
    e.preventDefault();
    if (write(r => moveWithinSection(r, id, e.key === 'ArrowUp' ? -1 : 1), `${label} moved ${e.key === 'ArrowUp' ? 'up' : 'down'}.`)) requestAnimationFrame(() => list.current?.querySelector<HTMLElement>(`[data-edit-handle="${CSS.escape(id)}"]`)?.focus());
  }
  async function makeHabit(id: string, label: string, section: string) {
    try {
      const habitId = crypto.randomUUID();
      await state.stores.habits.create({title: label.slice(0, 100), category: 'Checklist', description: '', notes: '', type: 'build', measurement: {kind: 'boolean'}, schedule: {kind: 'daily'}, target: 1, targetPeriod: 'day', timeOfDay: SECTION_TIME[section] ?? 'anytime', endCondition: {kind: 'none'}}, habitId);
      write(r => customToHabit(r, id, habitId), `${label} is now a habit, daily, on Habits. Its dot stays here.`);
    } catch (e) { setStatus(message(e)); }
  }
  function submitCustom(e: FormEvent<HTMLFormElement>) { e.preventDefault(); if (write(r => addCustom(r, custom, {id: newChecklistId(), at: new Date()}), `${custom.label.trim()} added to your path.`)) setCustom(c => ({...c, label: ''})); }
  function submitOrbit(e: FormEvent<HTMLFormElement>) { e.preventDefault(); if (write(r => addSection(r, {label: orbitName}, `orbit_${crypto.randomUUID().slice(0, 8)}`), `${orbitName.trim()} orbit added.`)) setOrbitName(''); }

  const habits = state.stores.habits.data.habits.filter(h => latestHabitRule(h).state === 'active' && !isFavourite(record.data, {kind: 'habit', habitId: h.id}));
  const goals = state.stores.platform.data.goals.filter(g => g.status !== 'closed' && !isFavourite(record.data, {kind: 'goal', goalId: g.id}));
  const foods = [...state.stores.health.data.foods].sort((a, b) => a.name.localeCompare(b.name)).filter(f => !isFavourite(record.data, {kind: 'health', input: 'diary', sourceKind: 'food', sourceId: f.id})).slice(0, 24);
  const healthInputs: {ref: FavouriteRef; label: string; extra?: {defaultValue: number; unit: string}}[] = ([
    {ref: {kind: 'health', input: 'water'}, label: 'Water', extra: {defaultValue: 250, unit: 'ml'}},
    {ref: {kind: 'health', input: 'weight'}, label: 'Weigh in'},
    {ref: {kind: 'health', input: 'sleep'}, label: 'Sleep'},
    {ref: {kind: 'health', input: 'meditation'}, label: 'Meditate', extra: {defaultValue: 10, unit: 'min'}},
    {ref: {kind: 'health', input: 'fast'}, label: 'Fast', extra: {defaultValue: 16, unit: 'h'}},
    ...HEALTH_MEALS.map(meal => ({ref: {kind: 'health', input: 'meal', meal} as FavouriteRef, label: meal === 'Snacks' ? 'Log a snack' : `Log ${meal.toLowerCase()}`})),
  ] satisfies {ref: FavouriteRef; label: string; extra?: {defaultValue: number; unit: string}}[]).filter(h => !isFavourite(record.data, h.ref));

  return <section className="panel checklist-edit" aria-labelledby="checklist-edit-title">
    <div className="checklist-options-head"><h2 id="checklist-edit-title">Edit path</h2><button type="button" className="primary" onClick={onClose}>Done</button></div>
    <p className="fine checklist-edit-status" role="status" aria-live="polite">{status}</p>
    <h3>On your path</h3>
    {pathOrder.length ? <ol ref={list} className="checklist-edit-list">{pathOrder.map((item, n) => {
      const dot: DerivedDot | undefined = dotById.get(item.id), label = dot?.label ?? item.label ?? 'Item', section = sectionOfItem(record.data, item), colour = nebulaColour(pathColour(item.colour, dot?.colour ?? 'cyan'));
      const dragging = drag?.id === item.id, mates = pathOrder.filter(i => sectionOfItem(record.data, i) === section), mate = mates.findIndex(i => i.id === item.id), orbitLabel = sections.find(x => x.id === section)?.label ?? 'its orbit';
      const orbitHead = n === 0 || sectionOfItem(record.data, pathOrder[n - 1]!) !== section;
      return <Fragment key={item.id}>
      {orbitHead && <li className="checklist-edit-orbit-head" aria-hidden="true"><span>{orbitLabel}</span><span>{mates.length}</span></li>}
      <li data-edit-row data-dragging={dragging || undefined} style={{'--dot': PATH_COLOURS[colour].token, ...(dragging ? {transform: `translateY(${drag!.dy}px)`} : {})} as CSSProperties}>
        <button type="button" className="checklist-edit-handle" data-edit-handle={item.id} aria-label={`Move ${label}: drag, or use the arrow keys`} onPointerDown={e => onPointerDown(e, item.id)} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={() => setDrag(null)} onKeyDown={e => onHandleKey(e, item.id, label)}><span className="checklist-edit-dot" aria-hidden="true"><PathGlyph name={dot ? itemGlyph(dot) : 'sparkle'} size={18}/></span></button>
        <span className="checklist-edit-label"><strong>{label}</strong>{dot?.missing && <small>{dot.note}</small>}</span>
        <button type="button" className="checklist-edit-more" aria-expanded={openRow === item.id} aria-label={`Change ${label}: orbit, colour, place`} onClick={() => setOpenRow(o => o === item.id ? null : item.id)}><svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false"><path d="m7 10 5 5 5-5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/></svg></button>
        {openRow === item.id && <div className="checklist-edit-controls">
          <div className="checklist-edit-orbit-choice" role="radiogroup" aria-label={`Orbit of ${label}`}>{sections.map(s => <button key={s.id} type="button" role="radio" aria-checked={s.id === section} onClick={() => { if (s.id !== section) write(r => updateItem(r, item.id, {section: s.id}), `${label} moved to ${s.label}.`); }}>{s.label.replace(/ orbit$/i, '')}</button>)}</div>
          <fieldset className="checklist-edit-colours"><legend className="sr-only">Colour of {label}</legend><div className="checklist-swatches">{CHECKLIST_COLOUR_IDS.map(id => <label key={id} className="checklist-swatch" style={{'--swatch': PATH_COLOURS[id].token} as CSSProperties}><input type="radio" name={`colour-${item.id}`} checked={colour === id} onChange={() => write(r => updateItem(r, item.id, {colour: id}), `${label} is ${PATH_COLOURS[id].label.toLowerCase()} now.`)}/><span aria-hidden="true"/><span className="sr-only">{PATH_COLOURS[id].label}</span></label>)}</div></fieldset>
          <div className="checklist-edit-actions">
            <button type="button" className="quiet" aria-label={`Move ${label} up`} disabled={mate === 0} onClick={() => write(r => moveWithinSection(r, item.id, -1), `${label} moved up in ${orbitLabel}.`)}>↑</button>
            <button type="button" className="quiet" aria-label={`Move ${label} down`} disabled={mate === mates.length - 1} onClick={() => write(r => moveWithinSection(r, item.id, 1), `${label} moved down in ${orbitLabel}.`)}>↓</button>
            {item.kind === 'custom' && <button type="button" className="quiet" onClick={() => void makeHabit(item.id, label, section)}>Make this a habit</button>}
            <button type="button" className="quiet" aria-label={`Take ${label} off your path`} onClick={() => write(r => removeItem(r, item.id), `${label} is off your path. Its records stay on its page.`)}>Remove</button>
          </div>
        </div>}
      </li>
      </Fragment>;
    })}</ol> : <p>Nothing yet. Add from below, or star something on its page.</p>}

    <h3>Your own item</h3>
    <form className="checklist-edit-custom" onSubmit={submitCustom}>
      <label className="field">What to do<input ref={addInput} value={custom.label} maxLength={60} required placeholder="Something you do each day" onChange={e => setCustom(c => ({...c, label: e.target.value}))}/></label>
      <fieldset className="checklist-edit-colours"><legend>Colour</legend><div className="checklist-swatches">{CHECKLIST_COLOUR_IDS.map(id => <label key={id} className="checklist-swatch" style={{'--swatch': PATH_COLOURS[id].token} as CSSProperties}><input type="radio" name="checklist-custom-colour" checked={custom.colour === id} onChange={() => setCustom(c => ({...c, colour: id}))}/><span aria-hidden="true"/><span className="sr-only">{PATH_COLOURS[id].label}</span></label>)}</div></fieldset>
      <div className="checklist-edit-orbit-choice" role="radiogroup" aria-label="Orbit">{sections.map(s => <button key={s.id} type="button" role="radio" aria-checked={custom.section === s.id} onClick={() => setCustom(c => ({...c, section: s.id}))}>{s.label.replace(/ orbit$/i, '')}</button>)}</div>
      <button type="submit" className="secondary">Add to path</button>
    </form>

    <h3>From your pages</h3>
    <div className="checklist-edit-add">
      {habits.length > 0 && <div><h4>Habits</h4><ul>{habits.map(h => <li key={h.id}><span>{h.title}</span><button type="button" className="quiet" aria-label={`Add ${h.title} to your path`} onClick={() => add({kind: 'habit', habitId: h.id}, h.title, {section: h.timeOfDay})}>Add</button></li>)}</ul></div>}
      {goals.length > 0 && <div><h4>Goals (their next step)</h4><ul>{goals.map(g => <li key={g.id}><span>{g.name}</span><button type="button" className="quiet" aria-label={`Add ${g.name} to your path`} onClick={() => add({kind: 'goal', goalId: g.id}, g.name)}>Add</button></li>)}</ul></div>}
      {healthInputs.length > 0 && <div><h4>Health</h4><ul>{healthInputs.map(h => <li key={h.label}><span>{h.label}</span><button type="button" className="quiet" aria-label={`Add ${h.label} to your path`} onClick={() => add(h.ref, h.label, h.extra ?? {})}>Add</button></li>)}</ul></div>}
      {foods.length > 0 && <div><h4>Familiar foods and supplements</h4><ul>{foods.map(f => <li key={f.id}><span>{f.name}</span><button type="button" className="quiet" aria-label={`Add ${f.name} to your path`} onClick={() => add({kind: 'health', input: 'diary', sourceKind: 'food', sourceId: f.id}, f.name)}>Add</button></li>)}</ul></div>}
    </div>

    <h3>Orbits</h3>
    <ul className="checklist-edit-orbits">{sections.map(s => <li key={s.id} style={{'--dot': PATH_COLOURS[nebulaColour(pathColour(s.colour))].token} as CSSProperties}>
      <label className="field"><span className="sr-only">Name of {s.label}</span><input defaultValue={s.label} maxLength={30} onBlur={e => { if (e.target.value.trim() && e.target.value.trim() !== s.label) write(r => updateSection(r, s.id, {label: e.target.value}), `Renamed to ${e.target.value.trim()}.`); }}/></label>
      <fieldset className="checklist-edit-colours"><legend className="sr-only">Colour of {s.label}</legend><div className="checklist-swatches">{CHECKLIST_COLOUR_IDS.map(id => <label key={id} className="checklist-swatch" style={{'--swatch': PATH_COLOURS[id].token} as CSSProperties}><input type="radio" name={`orbit-colour-${s.id}`} checked={nebulaColour(pathColour(s.colour)) === id} onChange={() => write(r => updateSection(r, s.id, {colour: id}), `${s.label} is ${PATH_COLOURS[id].label.toLowerCase()} now.`)}/><span aria-hidden="true"/><span className="sr-only">{PATH_COLOURS[id].label}</span></label>)}</div></fieldset>
      {sections.length > 1 && <button type="button" className="quiet" aria-label={`Remove the ${s.label} orbit`} onClick={() => write(r => removeSection(r, s.id), `${s.label} removed; its items moved to ${sections.filter(x => x.id !== s.id).at(-1)?.label}.`)}>Remove</button>}
    </li>)}</ul>
    <form className="checklist-edit-custom" onSubmit={submitOrbit}><label className="field">New orbit<input value={orbitName} maxLength={30} required placeholder="Gym" onChange={e => setOrbitName(e.target.value)}/></label><button type="submit" className="secondary">Add orbit</button></form>
  </section>;
}
