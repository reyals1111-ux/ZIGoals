'use client';
import {useEffect, useMemo, useRef} from 'react';
import {alternatives} from '../../../lib/workouts/replace';
import {MUSCLE_WORDS} from '../../../lib/workouts/howto';
import type {LibraryExercise} from '../../../lib/workouts/library';
import type {Place} from '../../../lib/workouts/places-schema';
import type {Workouts} from '../../../lib/workouts/schema';
import './av2-bodymind-workouts.css';

/**
 * Session AV lane 2 (bodymind-r2; LEDGER #241, Fitbod's replace an exercise): a short list of similar exercises — the same
 * main muscle, the same kind of sets in a running workout (a planned one may change them), what the place for now has, not already in the workout — for an exercise in a
 * running workout or in a suggested one. Choosing one swaps it in and keeps the sets typed so far. Its own chunk.
 */
export default function ReplaceExercise({exercise, w, place, exclude, onPick, onClose, headId, planned = false}: {exercise: Pick<LibraryExercise, 'id' | 'name' | 'measure'>; w?: Workouts; library?: LibraryExercise[]; place: Place | null; exclude: readonly string[]; /** A planned (suggested) exercise: any kind of sets, they are worked out again. */ planned?: boolean;
  onPick: (x: LibraryExercise) => void; onClose: () => void; headId?: string}) {
  const list = useMemo(() => alternatives(exercise, w ?? {version: 1, workouts: [], templates: [], exercises: [], restSeconds: 90}, place ? place.equipment : null, exclude, 6, !planned), [exercise, w, place, exclude, planned]);
  const first = useRef<HTMLButtonElement>(null);
  useEffect(() => { first.current?.focus(); }, []);
  return <div className="av2-replace" role="group" aria-label={`Replace ${exercise.name}`} aria-describedby={headId}>
    <p className="fine">{list.length ? `Similar exercises: the same main muscle${place ? `, with what ${place.name} has` : ''}.${planned ? ' Its sets are worked out again from your log.' : ' Your sets so far are kept.'}` : `No similar exercise fits${place ? ` ${place.name}'s equipment` : ''}. ${place ? 'Choose “Any place” under Places and equipment to see more, or ' : ''}keep ${exercise.name}.`}</p>
    {list.length > 0 && <ul className="av2-replace-list">{list.map((x, i) => <li key={x.id}><button ref={i === 0 ? first : undefined} type="button" className="secondary" onClick={() => onPick(x)}>
      <strong>{x.name}</strong><span>Works: {x.shared.map(m => MUSCLE_WORDS[m as keyof typeof MUSCLE_WORDS]?.en ?? m).join(' · ')}{x.done ? ' · in your log' : ''}</span></button></li>)}</ul>}
    <button ref={list.length ? undefined : first} type="button" className="text-link" onClick={onClose}>Keep {exercise.name}</button>
  </div>;
}
