'use client';
import {removeWithUndo} from '../ui/remove-with-undo';
import {PATH_REMOVAL_STACK} from '../../lib/checklist/habit-undo';
import {showToast} from '../ui/undo-toast';
import {Fragment, useEffect, useMemo, useRef, useState, type CSSProperties, type FormEvent, type KeyboardEvent, type PointerEvent} from 'react';
import {PATH_COLOURS, pathColour} from '../../lib/path/colours';
import {CHECKLIST_COLOUR_IDS, nebulaColour} from '../../lib/path/orbit-colours';
import {HEALTH_MEALS} from '../../lib/health';
import {habitCalendarDay, latestHabitRule, logHabitValue} from '../../lib/habits';
import {ChecklistError, MAX_PATH_ITEMS, addCustom, addFavourite, addSection, customToHabit, isFavourite, moveItem, moveWithinSection, newChecklistId, stepItem, orderedItems, removeItem, removeSection, sectionOfItem, sectionsOf, updateItem, updateSection, type FavouriteRef} from '../../lib/checklist/store';
import type {DerivedDot} from '../../lib/checklist/derive';
import {storageMessageOr} from '../../lib/storage-error-copy';
import {PathGlyph} from '../path/path-glyphs';
import {itemGlyph} from '../../lib/checklist/glyphs';
import {PATH_LABEL_MAX, cleanPathLabel, suggestPathLabel} from '../../lib/checklist/path-label';
import type {ChecklistState} from './use-checklist';

/**
 * Edit path (P7.3, P7.5): what is on the path, in its order — drag a row by its handle, or use Move up / Move down (and
 * the arrow keys on the handle), change its orbit and colour, take it off; custom items ("Play piano 15 minutes") with
 * their own words and colour, and "Make this a habit"; the orbits themselves (rename, recolour, add, remove); and
 * everything that can be added from the app's pages. Every change is a device write with its words said back.
 * Round 3: the rows stand under their orbits' names (as the List does), each row's planet is its own drag handle (no
 * separate grip column), and a name may take two lines instead of being cut.
 */
// Session AL (P-LS-24, LS-062/LS-068): the path's own refusals (a blank or repeated name, the 60-item cap) are said as they
// are; "Not saved on this device" is only for a real write failure.
const message = (e: unknown) => e instanceof ChecklistError ? e.message : storageMessageOr(e, 'Not saved on this device. Try again.');
/** "Evening orbit" or "Evening" → "Evening" (the aria-label adds "orbit" once: LS-027). */
const orbitName_ = (label: string) => label.replace(/\s+orbit$/i, '');
const SECTION_TIME: Record<string, 'morning' | 'afternoon' | 'evening' | 'anytime'> = {morning: 'morning', afternoon: 'afternoon', evening: 'evening'};
/** `addTo` (Session AG Polish, the List's "+ Add to … Orbit"): the orbit the new item's form starts in, focused. */
export function EditPath({state, onClose, addTo}: {state: ChecklistState; onClose: () => void; addTo?: string}) {
  const {record} = state, sections = sectionsOf(record.data), items = orderedItems(record.data);
  const addInput = useRef<HTMLInputElement>(null);
  useEffect(() => { if (addTo) { addInput.current?.scrollIntoView({block: 'center'}); addInput.current?.focus({preventScroll: true}); } }, [addTo]);
  // The list reads as the path does: orbit by orbit, each in its own order.
  const pathOrder = sections.flatMap(s => items.filter(i => sectionOfItem(record.data, i) === s.id));
  // Session AL (P-LS-22, LS-026): removing an orbit asks where its items go (Anytime first), instead of the last orbit.
  const [removing, setRemoving] = useState<{id: string; to: string} | null>(null);
  const [status, setStatus] = useState(''), [custom, setCustom] = useState({label: '', colour: 'pink', section: addTo && sections.some(s => s.id === addTo) ? addTo : 'anytime'}), [orbitName, setOrbitName] = useState(''), [openRow, setOpenRow] = useState<string | null>(null);
  const dotById = useMemo(() => new Map(state.dots.map(d => [d.id, d])), [state.dots]);
  const write = (change: Parameters<typeof record.update>[0], words: string) => { try { record.update(change); setStatus(words); return true; } catch (e) { setStatus(message(e)); return false; } };
  // Session AH Part 3 (DS5): taking an item off the path gives a labelled Undo that puts it back where it was (its
  // records stay on its own page either way). Removing an orbit moves its items, so it is undone as one step while
  // nothing else changed since; otherwise the Undo says so.
  const removeItemWithUndo = (id: string, words: string) => { removeWithUndo(record.update, r => removeItem(r, id), words, 'Back on your path.', {stack: PATH_REMOVAL_STACK}).then(() => setStatus(words), e => setStatus(message(e))); };
  const removeSectionWithUndo = (id: string, words: string, to?: string) => {
    let before: Parameters<Parameters<typeof record.update>[0]>[0] | undefined, after: typeof before;
    try { record.update(r => { const next = removeSection(r, id, to); before = r; after = next; return next; }); setStatus(words); }
    catch (e) { setStatus(message(e)); return; }
    showToast({message: words, undone: 'The orbit is back.', undo: () => { let unchanged = true; record.update(r => { if (JSON.stringify(r) !== JSON.stringify(after)) { unchanged = false; return r; } return before!; }); return unchanged ? undefined : {undone: 'Not undone: the path changed since. Add the orbit again from Edit path.'}; }});
  };
  const add = (ref: FavouriteRef, label: string, extra: {section?: string; defaultValue?: number; unit?: string} = {}) => write(r => addFavourite(r, ref, {id: newChecklistId(), at: new Date(), label, ...extra}), `${label} added to your path.`);

  // Drag by the handle (pointer), with the keyboard and tap alternative beside it.
  const list = useRef<HTMLOListElement>(null), [drag, setDrag] = useState<{id: string; dy: number; startY: number} | null>(null);
  function onPointerDown(e: PointerEvent<HTMLButtonElement>, id: string) { e.currentTarget.setPointerCapture(e.pointerId); setDrag({id, dy: 0, startY: e.clientY}); }
  function onPointerMove(e: PointerEvent<HTMLButtonElement>) { if (drag) setDrag({...drag, dy: e.clientY - drag.startY}); }
  function onPointerUp(e: PointerEvent<HTMLButtonElement>) {
    if (!drag) return;
    // Session AL (P-LS-58, LS-H23): the dragged row itself moves with the pointer, so it is left out when finding the slot
    // (it was sometimes "found" under the pointer, and the item landed one place short). Dropped over a row: it goes
    // before that row, in its orbit; below the last row: after it.
    const id = drag.id, y = e.clientY, dy = drag.dy;
    setDrag(null);
    if (Math.abs(dy) <= 8) return;
    const rows = [...(list.current?.querySelectorAll<HTMLElement>('[data-edit-row]') ?? [])].filter(r => !r.querySelector(`[data-edit-handle="${CSS.escape(id)}"]`));
    const others = pathOrder.filter(i => i.id !== id), at = rows.findIndex(r => { const b = r.getBoundingClientRect(); return y < b.top + b.height / 2; });
    const anchor = at >= 0 ? others[at] : others.at(-1);
    if (!anchor) return;
    const ordered = orderedItems(record.data).filter(i => i.id !== id), index = ordered.findIndex(i => i.id === anchor.id) + (at >= 0 ? 0 : 1);
    const was = pathOrder.findIndex(i => i.id === id), place = at >= 0 ? at : others.length;
    if (place === was) return;
    const label = dotById.get(id)?.label ?? 'Item', section = sectionOfItem(record.data, anchor), orbit = sections.find(x => x.id === section)?.label ?? 'that orbit';
    write(r => moveItem(updateItem(r, id, {section}), id, index), `${label} moved to place ${place + 1}, in ${orbit}.`);
  }
  function onHandleKey(e: KeyboardEvent<HTMLButtonElement>, id: string, label: string) {
    if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return;
    e.preventDefault();
    // Session AL (PR-070, P-PR-19): each press moves one place, across into the next orbit at an orbit's edge, and the
    // words say what really happened (an item already first or last says so).
    const up = e.key === 'ArrowUp', step = stepItem(record.data, id, up ? -1 : 1), orbit = sections.find(x => x.id === step.section)?.label ?? 'its orbit';
    if (!step.moved) { setStatus(`${label} is already ${up ? 'first' : 'last'} on your path.`); return; }
    if (write(r => stepItem(r, id, up ? -1 : 1).record, step.moved === 'orbit' ? `${label} moved into ${orbit}.` : `${label} moved ${up ? 'up' : 'down'}.`)) requestAnimationFrame(() => list.current?.querySelector<HTMLElement>(`[data-edit-handle="${CSS.escape(id)}"]`)?.focus());
  }
  async function makeHabit(id: string, label: string, section: string) {
    try {
      // Session AL (P-LS-17, LS-008/LC-016): a ticked item keeps today's tick as the new habit's first check-in.
      const tickedToday = dotById.get(id)?.state === 'done';
      const habitId = crypto.randomUUID();
      await state.stores.habits.create({title: label.slice(0, 100), category: 'Checklist', description: '', notes: '', type: 'build', measurement: {kind: 'boolean'}, schedule: {kind: 'daily'}, target: 1, targetPeriod: 'day', timeOfDay: SECTION_TIME[section] ?? 'anytime', endCondition: {kind: 'none'}}, habitId);
      if (!write(r => customToHabit(r, id, habitId), `${label} is now a habit, daily, on Habits. Its dot stays here${tickedToday ? ', done for today' : ''}.`)) return;
      if (tickedToday) {
        const now = new Date();
        try { await state.stores.habits.update(h => logHabitValue(h, habitId, habitCalendarDay(h, now), 1, {mode: 'add'}, now)); }
        catch (e) { setStatus(`${label} is now a habit, but today’s tick could not be copied: ${message(e)} Tick it on the path.`); }
      }
    } catch (e) { setStatus(message(e)); }
  }
  const customProblem = !custom.label.trim() ? 'Type what to do first.' : record.data.items.some(i => i.kind === 'custom' && i.label?.trim().toLowerCase() === custom.label.trim().toLowerCase()) ? `“${custom.label.trim()}” is already on your path.` : record.data.items.length >= MAX_PATH_ITEMS ? `Your path holds up to ${MAX_PATH_ITEMS} items. Remove one first.` : '';
  const [customTried, setCustomTried] = useState(false);
  function submitCustom(e: FormEvent<HTMLFormElement>) { e.preventDefault(); setCustomTried(true); if (customProblem) return; if (write(r => addCustom(r, custom, {id: newChecklistId(), at: new Date()}), `${custom.label.trim()} added to your path.`)) { setCustom(c => ({...c, label: ''})); setCustomTried(false); } }
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
          {/* Session AL (P-LS-26, LS-063): an own item's name can be changed here (60 characters). */}
          {item.kind === 'custom' && <label className="field checklist-edit-name">Name<input key={`name-${label}`} defaultValue={label} maxLength={60} autoComplete="off" onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); e.currentTarget.blur(); } }} onBlur={e => { const v = e.target.value.trim(); if (!v) { e.target.value = label; setStatus(`An item needs a name, so it keeps “${label}”.`); return; } if (v !== label) write(r => updateItem(r, item.id, {label: v}), `Renamed to ${v}.`); }}/></label>}
          {/* Session AG Polish 3 (ADR-032 L23; owner amendment 10): the one word this item shows on the path. Empty keeps the
              suggestion from its name; the List and the details keep the full name. */}
          <label className="field checklist-edit-short">Name on the path<input key={item.pathLabel ?? ''} defaultValue={item.pathLabel ?? ''} maxLength={PATH_LABEL_MAX} placeholder={suggestPathLabel(label)} autoComplete="off" spellCheck={false} aria-describedby={`short-hint-${item.id}`} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); e.currentTarget.blur(); } }} onBlur={e => { const word = cleanPathLabel(e.target.value); if (word !== (item.pathLabel ?? '')) write(r => updateItem(r, item.id, {pathLabel: word || null}), `${label} shows as ${word || suggestPathLabel(label)} on the path.`); }}/><small id={`short-hint-${item.id}`} className="fine">One word, {PATH_LABEL_MAX} letters at most.</small></label>
          <div className="checklist-edit-actions">
            <button type="button" className="quiet" aria-label={`Move ${label} up`} disabled={mate === 0} onClick={() => write(r => moveWithinSection(r, item.id, -1), `${label} moved up in ${orbitLabel}.`)}>↑</button>
            <button type="button" className="quiet" aria-label={`Move ${label} down`} disabled={mate === mates.length - 1} onClick={() => write(r => moveWithinSection(r, item.id, 1), `${label} moved down in ${orbitLabel}.`)}>↓</button>
            {item.kind === 'custom' && <button type="button" className="quiet" onClick={() => void makeHabit(item.id, label, section)}>Make this a habit</button>}
            <button type="button" className="quiet" aria-label={`Take ${label} off your path`} onClick={() => removeItemWithUndo(item.id, `${label} is off your path. Its records stay on its page.`)}>Remove</button>
          </div>
        </div>}
      </li>
      </Fragment>;
    })}</ol> : <p>Nothing yet. Add from below, or star something on its page.</p>}

    <h3>Your own item</h3>
    <form className="checklist-edit-custom" onSubmit={submitCustom} noValidate>
      <label className="field">What to do<input ref={addInput} value={custom.label} maxLength={60} placeholder="Something you do each day" aria-invalid={customTried && !!customProblem || undefined} aria-describedby="checklist-custom-note" onChange={e => setCustom(c => ({...c, label: e.target.value}))}/></label>
      <p id="checklist-custom-note" className="fine" role={customTried && customProblem ? 'alert' : undefined}>{customTried && customProblem ? customProblem : `Up to 60 characters · ${record.data.items.length} of ${MAX_PATH_ITEMS} items on your path.`}</p>
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
      <label className="field"><span className="sr-only">Name of {s.label}</span><input defaultValue={s.label} maxLength={30} onBlur={e => { const v = e.target.value.trim(); if (!v) { e.target.value = s.label; setStatus(`An orbit needs a name, so it keeps “${s.label}”.`); return; } if (v !== s.label) write(r => updateSection(r, s.id, {label: v}), `Renamed to ${v}.`); }}/></label>
      <fieldset className="checklist-edit-colours"><legend className="sr-only">Colour of {s.label}</legend><div className="checklist-swatches">{CHECKLIST_COLOUR_IDS.map(id => <label key={id} className="checklist-swatch" style={{'--swatch': PATH_COLOURS[id].token} as CSSProperties}><input type="radio" name={`orbit-colour-${s.id}`} checked={nebulaColour(pathColour(s.colour)) === id} onChange={() => write(r => updateSection(r, s.id, {colour: id}), `${s.label} is ${PATH_COLOURS[id].label.toLowerCase()} now.`)}/><span aria-hidden="true"/><span className="sr-only">{PATH_COLOURS[id].label}</span></label>)}</div></fieldset>
      {sections.length > 1 && removing?.id !== s.id && <button type="button" className="quiet" aria-label={`Remove the ${orbitName_(s.label)} orbit`} onClick={() => { const others = sections.filter(x => x.id !== s.id); setRemoving({id: s.id, to: (others.find(x => x.id === 'anytime') ?? others.at(-1)!).id}); }}>Remove</button>}
      {removing?.id === s.id && (() => { const others = sections.filter(x => x.id !== s.id), count = pathOrder.filter(i => sectionOfItem(record.data, i) === s.id).length, target = others.find(x => x.id === removing.to) ?? others.at(-1)!;
        return <div className="checklist-edit-remove-orbit" role="group" aria-label={`Remove the ${orbitName_(s.label)} orbit`}>
          {count > 0 ? <label className="field">Move its {count === 1 ? 'item' : `${count} items`} to<select value={target.id} onChange={e => setRemoving({id: s.id, to: e.target.value})}>{others.map(x => <option key={x.id} value={x.id}>{x.label}</option>)}</select></label> : <p className="fine">It has no items.</p>}
          <button type="button" className="quiet" onClick={() => { setRemoving(null); removeSectionWithUndo(s.id, count ? `${s.label} removed; its ${count === 1 ? 'item' : 'items'} moved to ${target.label}.` : `${s.label} removed.`, target.id); }}>Remove orbit</button>
          <button type="button" className="quiet" onClick={() => setRemoving(null)}>Keep it</button></div>; })()}
    </li>)}</ul>
    <form className="checklist-edit-custom" onSubmit={submitOrbit}><label className="field">New orbit<input value={orbitName} maxLength={30} required placeholder="Gym" onChange={e => setOrbitName(e.target.value)}/></label><button type="submit" className="secondary">Add orbit</button></form>
  </section>;
}
