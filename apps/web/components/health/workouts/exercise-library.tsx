'use client';
import {useId, useMemo, useState} from 'react';
import {exerciseHistory} from '../../../lib/workouts/engine';
import {howToOf, muscleList} from '../../../lib/workouts/howto';
import {searchExercises, type LibraryExercise} from '../../../lib/workouts/library';
import {pinnedNoteOf, setPinnedNote} from '../../../lib/workouts/notes';
import {CATEGORIES, type Workouts} from '../../../lib/workouts/schema';
import {formatDate, formatNumber} from '../../../lib/visual-format';
import {clock, estimateShown, weightShown} from './units';
import './av2-body.css';
import {availableWith, needsWords} from '../../../lib/workouts/equipment';
import type {Place} from '../../../lib/workouts/places-schema';

/**
 * Session AV lane 2 (body; LEDGER #116 and #119, Hevy's exercise library and pinned notes): Health → Workouts →
 * "Exercises and how-tos". Find an exercise by name or muscle group; each built-in one shows the muscles it works, what
 * it needs, three written steps and a form tip, in English or Dutch ("In het Nederlands"), with your own numbers from
 * your log (heaviest, estimated one-rep max, sessions) and a note you pin to it (shown every time you do it). An own
 * exercise has no written steps: its pinned note is its how-to. Its own chunk, loaded when the fold opens.
 */
type Change = (fn: (w: Workouts) => Workouts, said?: string, undone?: string) => boolean;
export default function ExerciseLibrary({w, unit, library, change, initial, place = null}: {w: Workouts; unit: 'kg' | 'lb'; library: LibraryExercise[]; change: Change; initial?: string; /** Session AV lane 2 (bodymind-r2; LEDGER #239): the place for now. */ place?: Place | null}) {
  const [query, setQuery] = useState(''), [category, setCategory] = useState<'' | typeof CATEGORIES[number]>(''), [picked, setPicked] = useState(initial ?? ''), [onlyHere, setOnlyHere] = useState(true);
  const found = useMemo(() => searchExercises(library, query).filter(e => (!category || e.category === category) && availableWith(e.id, place && onlyHere ? place.equipment : null)), [library, query, category, place, onlyHere]);
  const chosen = library.find(e => e.id === picked) ?? null, id = useId();
  return <div className="av2-library">
    <p className="fine">{library.length} exercises: how to do each one, the muscles it works, and your own best. Videos are not needed: every step is written out.</p>
    <div className="workouts-picker-filters">
      <label className="field"><span>Find an exercise</span><input type="search" value={query} maxLength={80} onChange={e => setQuery(e.target.value)} placeholder="Squat, row, plank…"/></label>
      <label className="field"><span>Muscle group</span><select value={category} onChange={e => setCategory(e.target.value as typeof category)}><option value="">All</option>{CATEGORIES.map(c => <option key={c}>{c}</option>)}</select></label>
    </div>
    {place && <label className="switch-row"><input type="checkbox" checked={onlyHere} onChange={e => setOnlyHere(e.target.checked)}/> <span>Only what {place.name} has</span></label>}
    {found.length ? <ul className="av2-library-list" aria-label="Exercises">{found.slice(0, 60).map(x => <li key={x.id}><button type="button" className="secondary" aria-pressed={x.id === picked} aria-controls={`${id}-detail`} onClick={() => setPicked(x.id)}><strong>{x.name}</strong>{' '}<span>{x.category}{pinnedNoteOf(w, x.id) ? ' · pinned note' : ''}{needsWords(x.id) ? ` · ${needsWords(x.id)}` : ''}</span></button></li>)}</ul>
      : <p className="fine" role="status">No exercise matches “{query.trim()}”. Add it as your own while you train (+ Add an exercise).</p>}
    <div id={`${id}-detail`} aria-live="polite">{chosen ? <ExerciseDetail key={chosen.id} exercise={chosen} w={w} unit={unit} change={change}/> : <p className="fine">Choose an exercise to see how it is done.</p>}</div>
  </div>;
}

/** One exercise: the written how-to (or the note that stands in for it), your numbers, and the pinned note. */
export function ExerciseDetail({exercise, w, unit, change, compact = false}: {exercise: LibraryExercise; w: Workouts; unit: 'kg' | 'lb'; change: Change; compact?: boolean}) {
  const how = howToOf(exercise.id), [lang, setLang] = useState<'en' | 'nl'>('en'), h = useMemo(() => exerciseHistory(w, exercise.id), [w, exercise.id]);
  const pinned = pinnedNoteOf(w, exercise.id), [draft, setDraft] = useState(pinned ?? ''), headId = useId();
  const Head = compact ? 'h4' : 'h3';
  return <article className="av2-exercise" aria-labelledby={headId}>
    <div className="av2-exercise-head"><Head id={headId}>{exercise.name}</Head>
      {how && <button type="button" className="quiet" lang={lang === 'en' ? 'nl' : 'en'} onClick={() => setLang(lang === 'en' ? 'nl' : 'en')}>{lang === 'en' ? 'In het Nederlands' : 'In English'}</button>}</div>
    {how ? <div lang={lang}>
      <dl className="av2-exercise-facts">
        <div><dt>{lang === 'en' ? 'Works most' : 'Werkt vooral op'}</dt><dd>{muscleList(how.primary, lang)}</dd></div>
        {how.secondary.length > 0 && <div><dt>{lang === 'en' ? 'Also works' : 'Werkt ook op'}</dt><dd>{muscleList(how.secondary, lang)}</dd></div>}
        <div><dt>{lang === 'en' ? 'You need' : 'Je hebt nodig'}</dt><dd>{how.needs[lang]}</dd></div>
      </dl>
      <ol className="av2-steps">{how.steps[lang].map((s, i) => <li key={i}>{s}</li>)}</ol>
      <p className="av2-tip"><strong>{lang === 'en' ? 'Form tip:' : 'Tip voor de uitvoering:'}</strong> {how.tip[lang]}</p>
    </div> : <p className="fine">Your own exercise: it has no written steps. A pinned note below can be your own how-to.</p>}
    {!compact && <div className="av2-exercise-own">
      <h4>Your numbers</h4>
      {h ? <p>{[h.bestWeightKg !== null ? `Heaviest ${weightShown(h.bestWeightKg, unit)}` : null, h.bestOneRepMaxKg !== null ? `estimated one-rep max ${estimateShown(h.bestOneRepMaxKg, unit)}` : null, h.mostReps !== null && h.measure !== 'weight-reps' ? `most reps ${h.mostReps}` : null,
        h.longestSeconds !== null ? `longest ${clock(h.longestSeconds)}` : null, h.farthestKm !== null ? `farthest ${formatNumber(h.farthestKm, {maximumFractionDigits: 2})} km` : null, `${h.sessions.length} ${h.sessions.length === 1 ? 'session' : 'sessions'}, the last ${formatDate(h.sessions[0]!.date)}`].filter(Boolean).join(' · ')}.</p>
        : <p className="fine">Not in your log yet. Your best shows here after the first workout with it.</p>}
    </div>}
    <form className="av2-pin" onSubmit={e => { e.preventDefault(); change(x => setPinnedNote(x, exercise.id, draft), draft.trim() ? `Note pinned to ${exercise.name}: it shows every time you do it.` : `The pinned note of ${exercise.name} is removed.`); }}>
      <label className="field"><span>Pinned note for {exercise.name} (shown every time you do it)</span><textarea rows={2} maxLength={500} value={draft} onChange={e => setDraft(e.target.value)} placeholder="Seat at notch 4, wide grip…"/></label>
      <div className="workouts-row-actions"><button type="submit" className="secondary">{pinned ? 'Save the pinned note' : 'Pin this note'}</button>
        {pinned && <button type="button" className="quiet" onClick={() => { setDraft(''); change(x => setPinnedNote(x, exercise.id, ''), `The pinned note of ${exercise.name} is removed.`); }}>Remove the pinned note</button>}</div>
    </form>
  </article>;
}
