'use client';
import {useId} from 'react';
import {GUIDES, type Lang} from '../../../lib/workouts/routine-library';
import {anyFilter, LENGTHS, MUSCLE_NL, musclesInUse, NO_FILTER, type LibraryFilter, type Muscle} from '../../../lib/workouts/library-filter';
import {WORKOUT_PLACES} from '../../../lib/workouts/places-schema';
import {useDeviceRecord} from '../../ai/use-device-record';
import '../r3/health-r3.css';

/**
 * Session AV lane 2 (health r3; LEDGER #288, Nike Training Club): the ready-made routines' filters — how long (up to 30,
 * 45 or 60 minutes), a main muscle group, the level, and one of your places (every exercise can be done with what it
 * has). Choices last while the page is open; nothing is stored. In the routine library's chunk.
 */
const W = {
  en: {legend: 'Find a routine', length: 'How long', any: 'Any length', upTo: (m: number) => `Up to ${m} min`, muscle: 'Main muscle group', anyMuscle: 'Any group', level: 'Level', anyLevel: 'Any level', start: 'A good start', steady: 'For steady training', place: 'Place', anyPlace: 'Any place', clear: 'Clear the filters', shown: (n: number) => `${n} of ${GUIDES.length} routines`, noPlace: 'Add a place with its equipment under “Places and equipment” to find what you can do there.'},
  nl: {legend: 'Zoek een routine', length: 'Hoe lang', any: 'Elke lengte', upTo: (m: number) => `Tot ${m} min`, muscle: 'Belangrijkste spiergroep', anyMuscle: 'Elke groep', level: 'Niveau', anyLevel: 'Elk niveau', start: 'Goed om mee te beginnen', steady: 'Voor wie al traint', place: 'Plek', anyPlace: 'Elke plek', clear: 'Filters wissen', shown: (n: number) => `${n} van ${GUIDES.length} routines`, noPlace: 'Voeg bij “Places and equipment” een plek met zijn spullen toe om te zien wat je daar kunt doen.'},
};
export function LibraryFilters({lang, filter, onChange, shown}: {lang: Lang; filter: LibraryFilter; onChange: (f: LibraryFilter) => void; shown: number}) {
  const id = useId(), places = useDeviceRecord(WORKOUT_PLACES), w = W[lang];
  const list = places.loaded && !places.unreadable ? places.data.places : [];
  const placeId = filter.equipment === null ? '' : list.find(p => p.equipment.join('|') === filter.equipment!.join('|'))?.id ?? '';
  return <fieldset className="r3-library-filters" aria-describedby={`${id}-shown`}><legend>{w.legend}</legend>
    <div className="r3-choices" role="radiogroup" aria-label={w.length}>
      {[null, ...LENGTHS].map(m => <label key={m ?? 'any'} className="r3-choice"><input type="radio" name={`${id}-length`} checked={filter.maxMinutes === m} onChange={() => onChange({...filter, maxMinutes: m})}/><span>{m === null ? w.any : w.upTo(m)}</span></label>)}
    </div>
    <div className="health-form-grid">
      <label className="field"><span>{w.muscle}</span><select value={filter.muscle ?? ''} onChange={e => onChange({...filter, muscle: (e.target.value || null) as Muscle | null})}><option value="">{w.anyMuscle}</option>{musclesInUse(GUIDES).map(m => <option key={m} value={m}>{lang === 'en' ? m : MUSCLE_NL[m]}</option>)}</select></label>
      <label className="field"><span>{w.level}</span><select value={filter.level ?? ''} onChange={e => onChange({...filter, level: (e.target.value || null) as LibraryFilter['level']})}><option value="">{w.anyLevel}</option><option value="start">{w.start}</option><option value="steady">{w.steady}</option></select></label>
      <label className="field"><span>{w.place}</span><select value={placeId} disabled={!list.length} aria-describedby={!list.length ? `${id}-place` : undefined} onChange={e => onChange({...filter, equipment: list.find(p => p.id === e.target.value)?.equipment ?? null})}><option value="">{w.anyPlace}</option>{list.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
    </div>
    {!list.length && <p className="fine" id={`${id}-place`}>{w.noPlace}</p>}
    <div className="r3-toggle"><p className="fine" id={`${id}-shown`} role="status" aria-live="polite">{w.shown(shown)}</p>{anyFilter(filter) && <button type="button" className="quiet" onClick={() => onChange(NO_FILTER)}>{w.clear}</button>}</div>
  </fieldset>;
}
