'use client';
import {useEffect, useId, useRef, useState, type CSSProperties, type FormEvent} from 'react';
import {OrbitNodeFace} from '../orbit-path/orbit-node';
import {orbitTitle} from '../orbit-path/orbit-banner';
import {visualTone} from '../visual-tone';
import {habitIdForTone, QUICK_NAME_MAX, untouchedHabit} from '../../lib/checklist/quick-add';
import {showToast} from '../ui/undo-toast';
import {orbitGlyph} from '../../lib/checklist/glyphs';
import {addFavourite, newChecklistId, removeFavourite, sectionsOf} from '../../lib/checklist/store';
import {currentSection, SECTION_SYMBOLS, TIME_SECTIONS, type TimeSection} from '../../lib/habits-extras/sections';
import {readFormNumber} from '../../lib/decimal-input';
import {INVISIBLE_NAME, isInvisibleName} from '../../lib/visible-text';
import {HABIT_TONE_COLOURS} from '../../lib/path/orbit-colours';
import {PATH_COLOURS, type PathColour} from '../../lib/path/colours';
import type {HabitInput} from '../../lib/habits';
import type {ChecklistState} from './use-checklist';

/**
 * Session AG Polish 2 (ADR-031 K11; owner Part 5, pointer D-path 11): the Checklist's own quick add — a short "in between"
 * habit form behind the top bar's "+", only here (the app's global Quick add and the Habits page's full form are separate).
 * Name (the glyph follows it live in a node preview), Orbit (the clock's own by default), Kind (once a day · a number with
 * its unit · minutes), Days (every day or chosen weekdays) and an optional colour. "Add to my orbit" creates a real habit
 * through the Habits page's own create (`useHabits().create`, its data format, sensible defaults for every field the short
 * form does not ask), stars it into the chosen orbit through the Checklist's own favourites, and says so in a toast with a
 * link to edit it fully on Habits and Undo. Undo takes the star off and removes the habit only while it is still exactly
 * as created (owner amendment 3: no edit, no check-in); otherwise the habit stays on Habits and the toast says so. No new
 * field anywhere: a chosen colour is the habit card's own tone, drawn from the habit's id (`visualTone`).
 */
type Kind = 'tick' | 'number' | 'minutes';
const WORDS: Record<TimeSection, string> = {morning: 'Morning', afternoon: 'Afternoon', evening: 'Evening', anytime: 'Anytime'};
/** The weekdays, Monday first; the stored numbers are the Habits page's (0 = Sunday). */
const DAYS: [number, string, string][] = [[1, 'Mon', 'Monday'], [2, 'Tue', 'Tuesday'], [3, 'Wed', 'Wednesday'], [4, 'Thu', 'Thursday'], [5, 'Fri', 'Friday'], [6, 'Sat', 'Saturday'], [0, 'Sun', 'Sunday']];
const TONE_WORDS: Record<string, string> = {cyan: 'Cyan', purple: 'Violet', teal: 'Mint', blue: 'Blue', magenta: 'Magenta'};
export function OrbitQuickAdd({state, onClose, onAdded}: {state: ChecklistState; onClose: () => void; onAdded: (itemId: string) => void}) {
  const uid = useId().replace(/:/g, ''), nameRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState(''), [orbit, setOrbit] = useState<TimeSection>(() => currentSection(new Date().getHours()));
  const [kind, setKind] = useState<Kind>('tick'), [target, setTarget] = useState(''), [unit, setUnit] = useState(''), [minutes, setMinutes] = useState('');
  const [every, setEvery] = useState(true), [days, setDays] = useState<number[]>([1, 2, 3, 4, 5]), [colour, setColour] = useState<PathColour | 'auto'>('auto');
  const [errors, setErrors] = useState<Record<string, string>>({}), [busy, setBusy] = useState(false);
  // (Automatic: the id is drawn now, so the preview shows the colour the habit will have.)
  const [autoId] = useState(() => habitIdForTone(null));
  // (A frame later: the sheet first takes focus itself and remembers "+", to return to it.)
  useEffect(() => { const f = requestAnimationFrame(() => nameRef.current?.focus({preventScroll: true})); return () => cancelAnimationFrame(f); }, []);
  const tone = colour === 'auto' ? visualTone(autoId) : HABIT_TONE_COLOURS.indexOf(colour);
  const shownColour = PATH_COLOURS[HABIT_TONE_COLOURS[tone] ?? 'cyan'].token;
  const glyph = orbitGlyph({glyph: kind === 'minutes' ? 'focus' : 'habits', label: name || 'Habit', kind: 'habit'});
  const sections = sectionsOf(state.record.data), orbitLabel = (id: string) => orbitTitle(sections.find(s => s.id === id)?.label ?? WORDS[id as TimeSection] ?? id);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (busy) return;
    const found: Record<string, string> = {}, title = name.trim();
    if (!title || isInvisibleName(title)) found.name = title ? INVISIBLE_NAME : 'Give it a name.';
    else if (title.length > QUICK_NAME_MAX) found.name = `Keep the name to ${QUICK_NAME_MAX} characters.`;
    let value = 1, measurement: HabitInput['measurement'] = {kind: 'boolean'};
    // (The Habits page's own limits: a whole number from 1 for a count; above 0 for minutes; at most 1,000,000,000.)
    try {
      if (kind === 'number') { value = readFormNumber(target, {min: 1, max: 1_000_000_000, whole: true, positive: true}); measurement = {kind: 'count', unit: unit.trim().slice(0, 24) || 'times'}; }
      if (kind === 'minutes') { value = readFormNumber(minutes, {min: 0, max: 1_000_000_000, positive: true}); measurement = {kind: 'duration', unit: 'minutes'}; }
    } catch (e) { found[kind] = e instanceof Error ? e.message : 'Check the number.'; }
    if (!every && !days.length) found.days = 'Choose at least one day.';
    setErrors(found);
    if (Object.keys(found).length) { (document.getElementById(`${uid}-${Object.keys(found)[0]}`) as HTMLElement | null)?.focus(); return; }
    setBusy(true);
    const habitId = colour === 'auto' ? autoId : habitIdForTone(tone);
    const input: HabitInput = {title, category: 'Checklist', description: '', notes: '', type: 'build', measurement, schedule: every ? {kind: 'daily'} : {kind: 'weekdays', days: [...days].sort((a, b) => a - b)}, target: value, targetPeriod: 'day', timeOfDay: orbit, endCondition: {kind: 'none'}};
    try {
      // The Habits page's own create, then the Checklist's own star in the chosen orbit.
      await state.stores.habits.create(input, habitId);
      const itemId = newChecklistId();
      state.record.update(r => addFavourite(r, {kind: 'habit', habitId}, {id: itemId, at: new Date(), label: title, section: orbit}));
      const where = orbitLabel(orbit);
      showToast({message: `Added to ${where}`, link: {href: `/app/habits#habit-${habitId}`, label: 'Edit on Habits'}, undone: `${title} is off your orbit and off Habits.`,
        undo: async () => {
          state.record.update(r => removeFavourite(r, {kind: 'habit', habitId}));
          let removed = false;
          await state.stores.habits.update(data => {
            const h = data.habits.find(x => x.id === habitId);
            if (!h || !untouchedHabit(h)) return data;
            removed = true;
            return {...data, habits: data.habits.filter(x => x.id !== habitId)};
          });
          return {undone: removed ? `${title} is off your orbit and off Habits.` : 'Removed from your orbit · the habit stays on Habits'};
        }});
      onAdded(itemId);
    } catch (e) {
      setErrors({form: e instanceof Error && e.message ? e.message : 'It could not be added. Nothing changed.'});
      setBusy(false);
    }
  };
  const field = (key: string) => ({id: `${uid}-${key}`, 'aria-invalid': errors[key] ? true : undefined, 'aria-describedby': errors[key] ? `${uid}-${key}-error` : undefined});
  const problem = (key: string) => errors[key] ? <p id={`${uid}-${key}-error`} className="checklist-quick-error">{errors[key]}</p> : null;

  return <section className="panel checklist-quick" aria-labelledby={`${uid}-title`} style={{'--node': shownColour} as CSSProperties}>
    <div className="checklist-options-head"><h2 id={`${uid}-title`}>Quick add</h2><button type="button" className="quiet" onClick={onClose}>Close</button></div>
    <form className="checklist-quick-form" noValidate onSubmit={e => void submit(e)}>
      {/* The node it becomes, live: its glyph follows the name, its colour the choice below. */}
      <div className="checklist-quick-preview" aria-hidden="true">
        <span className="checklist-quick-node orbit-node" data-lit="">{<OrbitNodeFace glyph={glyph}/>}</span>
        <span className="checklist-quick-tab">{name.trim() || 'Your new habit'}</span>
      </div>
      <label className="checklist-quick-name" htmlFor={`${uid}-name`}>Name</label>
      <input ref={nameRef} {...field('name')} className="checklist-quick-input" type="text" value={name} maxLength={QUICK_NAME_MAX} autoComplete="off" enterKeyHint="done" placeholder="e.g. Drink water" required onChange={e => setName(e.target.value)}/>
      {problem('name')}
      <fieldset className="checklist-quick-group"><legend>Orbit</legend>
        <div className="checklist-quick-chips">{TIME_SECTIONS.map(id => <label key={id} className="checklist-quick-chip"><input type="radio" name={`${uid}-orbit`} value={id} checked={orbit === id} onChange={() => setOrbit(id)}/><span><span aria-hidden="true">{SECTION_SYMBOLS[id]}</span> {WORDS[id]}</span></label>)}</div>
      </fieldset>
      <fieldset className="checklist-quick-group"><legend>Kind</legend>
        <div className="checklist-quick-chips">
          {([['tick', 'Once a day'], ['number', 'A number'], ['minutes', 'Minutes']] as [Kind, string][]).map(([k, label]) => <label key={k} className="checklist-quick-chip"><input type="radio" name={`${uid}-kind`} value={k} checked={kind === k} onChange={() => setKind(k)}/><span>{label}</span></label>)}
        </div>
        {kind === 'number' && <div className="checklist-quick-row">
          <label htmlFor={`${uid}-number`}>How many</label><input {...field('number')} className="checklist-quick-input" type="text" inputMode="numeric" value={target} placeholder="8" onChange={e => setTarget(e.target.value)}/>
          <label htmlFor={`${uid}-unit`}>Unit</label><input id={`${uid}-unit`} className="checklist-quick-input" type="text" value={unit} maxLength={24} placeholder="glasses" onChange={e => setUnit(e.target.value)}/>
        </div>}
        {kind === 'number' && problem('number')}
        {kind === 'minutes' && <div className="checklist-quick-row">
          <label htmlFor={`${uid}-minutes`}>Minutes a day</label><input {...field('minutes')} className="checklist-quick-input" type="text" inputMode="decimal" value={minutes} placeholder="30" onChange={e => setMinutes(e.target.value)}/>
        </div>}
        {kind === 'minutes' && problem('minutes')}
      </fieldset>
      <fieldset className="checklist-quick-group"><legend>Days</legend>
        <div className="checklist-quick-chips">
          <label className="checklist-quick-chip"><input type="radio" name={`${uid}-every`} checked={every} onChange={() => setEvery(true)}/><span>Every day</span></label>
          <label className="checklist-quick-chip"><input type="radio" name={`${uid}-every`} checked={!every} onChange={() => setEvery(false)}/><span>Chosen days</span></label>
        </div>
        {!every && <div className="checklist-quick-chips checklist-quick-days" id={`${uid}-days`} tabIndex={-1} role="group" aria-label="Which days" aria-describedby={errors.days ? `${uid}-days-error` : undefined}>
          {DAYS.map(([n, short, long]) => <label key={n} className="checklist-quick-chip"><input type="checkbox" checked={days.includes(n)} aria-label={long} onChange={e => setDays(d => e.target.checked ? [...d, n] : d.filter(x => x !== n))}/><span aria-hidden="true">{short}</span></label>)}
        </div>}
        {!every && problem('days')}
      </fieldset>
      <fieldset className="checklist-quick-group"><legend>Colour</legend>
        <div className="checklist-quick-chips">
          <label className="checklist-quick-chip"><input type="radio" name={`${uid}-colour`} checked={colour === 'auto'} onChange={() => setColour('auto')}/><span>Automatic</span></label>
          {HABIT_TONE_COLOURS.map(c => <label key={c} className="checklist-quick-swatch" style={{'--swatch': PATH_COLOURS[c].token} as CSSProperties}><input type="radio" name={`${uid}-colour`} checked={colour === c} aria-label={TONE_WORDS[c] ?? c} onChange={() => setColour(c)}/><span aria-hidden="true"/></label>)}
        </div>
      </fieldset>
      {errors.form && <p className="checklist-quick-error" role="alert">{errors.form}</p>}
      <button type="submit" className="primary checklist-quick-go" disabled={busy}>Add to my orbit</button>
      <p className="fine checklist-quick-fine">It becomes a habit on Habits too, in its {WORDS[orbit]} section — edit it fully there.</p>
    </form>
  </section>;
}
