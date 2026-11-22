'use client';
import {useId, useState} from 'react';
import {GUIDES, guideLine, type Guide, type Lang} from '../../../lib/workouts/routine-library';
import {EXERCISES} from '../../../lib/workouts/library';
import {setRoutineNote} from '../../../lib/workouts/notes';
import {folderNames, setRoutineFolder} from '../../../lib/workouts/routines';
import type {Workouts, WorkoutTemplate} from '../../../lib/workouts/schema';
import './av2-body.css';

/**
 * Session AV lane 2 (body; LEDGER #112, #115; Strava's coach-designed strength workouts, Hevy's routine library): Health
 * → Workouts → "Ready-made routines". Twelve written routines — full body, push/pull/legs, upper/lower, at home, short
 * sessions — each with what it is for, every exercise's sets, reps or seconds, rest and one cue, in English or Dutch.
 * "Save to my routines" copies one into the person's routines (in its folder); "Start it now" saves it and starts it. Its
 * own chunk. `RoutineEdit` (the folder and note of an own routine) lives here too, so the first view stays as it was.
 */
const LEVEL = {start: {en: 'A good start', nl: 'Goed om mee te beginnen'}, steady: {en: 'For steady training', nl: 'Voor wie al traint'}};
const nameOf = (id: string) => EXERCISES.find(x => x.id === id)?.name ?? id;
export default function RoutineLibrary({w, onSave, onStart}: {w: Workouts; onSave: (g: Guide, lang: Lang) => void; onStart: (g: Guide, lang: Lang) => void}) {
  const [lang, setLang] = useState<Lang>('en');
  return <div className="av2-routines" lang={lang}>
    <div className="av2-exercise-head"><p className="fine">{lang === 'en' ? 'Written routines to start from. Saved, a routine is yours: change it as you like. Weights are your own; the first session sets them.' : 'Uitgeschreven routines om mee te beginnen. Opgeslagen is een routine van jou: pas hem aan zoals je wilt. Gewichten kies je zelf; de eerste sessie legt ze vast.'}</p>
      <button type="button" className="quiet" lang={lang === 'en' ? 'nl' : 'en'} onClick={() => setLang(lang === 'en' ? 'nl' : 'en')}>{lang === 'en' ? 'In het Nederlands' : 'In English'}</button></div>
    <ul className="av2-guide-list">{GUIDES.map(g => <li key={g.id}><GuideCard g={g} lang={lang} saved={w.templates.some(t => t.guideId === g.id && t.name === g.name[lang])} onSave={() => onSave(g, lang)} onStart={() => onStart(g, lang)}/></li>)}</ul>
  </div>;
}
function GuideCard({g, lang, saved, onSave, onStart}: {g: Guide; lang: Lang; saved: boolean; onSave: () => void; onStart: () => void}) {
  const id = useId();
  return <article className="av2-guide" aria-labelledby={id}>
    <h4 id={id}>{g.name[lang]}</h4>
    <p className="av2-guide-meta">{g.folder[lang]} · {lang === 'en' ? `about ${g.minutes} min` : `ongeveer ${g.minutes} min`} · {LEVEL[g.level][lang]}</p>
    <p>{g.about[lang]}</p>
    <ol className="av2-guide-exercises">{g.exercises.map(x => <li key={x.exerciseId}><strong>{nameOf(x.exerciseId)}</strong> <span>{guideLine(x, lang)}</span> <small>{x.cue[lang]}</small></li>)}</ol>
    {g.progression && <p className="fine">{g.progression.kind === 'double' ? (lang === 'en' ? `Progression: when every set reaches ${g.progression.maxReps} reps, add ${g.progression.stepKg} kg and start again at ${g.progression.minReps}.` : `Opbouw: haal je bij elke set ${g.progression.maxReps} herhalingen, doe er dan ${g.progression.stepKg} kg bij en begin weer bij ${g.progression.minReps}.`) : ''}</p>}
    <div className="workouts-row-actions">
      <button type="button" className="secondary" onClick={onStart} aria-label={`${lang === 'en' ? 'Start it now' : 'Nu starten'}: ${g.name[lang]}`}>{lang === 'en' ? 'Start it now' : 'Nu starten'}</button>
      <button type="button" className="quiet" disabled={saved} onClick={onSave} aria-label={saved ? `${g.name[lang]}: ${lang === 'en' ? 'in your routines' : 'staat bij je routines'}` : `${lang === 'en' ? 'Save to my routines' : 'Bewaar bij mijn routines'}: ${g.name[lang]}`}>{saved ? (lang === 'en' ? 'In your routines' : 'Staat bij je routines') : (lang === 'en' ? 'Save to my routines' : 'Bewaar bij mijn routines')}</button>
    </div>
  </article>;
}

type Change = (fn: (w: Workouts) => Workouts, said?: string) => boolean;
/** An own routine's folder (a new one or one in use) and its note (shown when it is started). */
export function RoutineEdit({w, routine, change, onDone}: {w: Workouts; routine: WorkoutTemplate; change: Change; onDone: () => void}) {
  const [folder, setFolder] = useState(routine.folder ?? ''), [note, setNote] = useState(routine.note ?? ''), id = useId();
  return <form className="av2-routine-edit" onSubmit={e => { e.preventDefault(); if (change(x => setRoutineNote(setRoutineFolder(x, routine.id, folder), routine.id, note), `Routine ${routine.name} saved${folder.trim() ? ` in ${folder.trim()}` : ''}.`)) onDone(); }}>
    <label className="field"><span>Folder (optional)</span><input value={folder} maxLength={40} list={`${id}-folders`} onChange={e => setFolder(e.target.value)} placeholder="Gym, At home…"/></label>
    <datalist id={`${id}-folders`}>{folderNames(w).map(f => <option key={f} value={f}/>)}</datalist>
    <label className="field"><span>Routine note (shown when you start it)</span><textarea rows={2} maxLength={500} value={note} onChange={e => setNote(e.target.value)} placeholder="Light week, 90 s rest…"/></label>
    <div className="workouts-row-actions"><button type="submit" className="secondary">Save</button><button type="button" className="quiet" onClick={onDone}>Cancel</button></div>
  </form>;
}
