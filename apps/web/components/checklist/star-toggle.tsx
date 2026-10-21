'use client';
import {useEffect, useRef, useState, type CSSProperties, type MouseEvent} from 'react';
import {PATH_COLOURS, type PathColour} from '../../lib/path/colours';
import {addFavourite, findFavourite, newChecklistId, removeFavourite, type FavouriteRef} from '../../lib/checklist/store';
import {showToast} from '../ui/undo-toast';
import {entranceAllowed} from '../use-entrance';
import {useChecklistRecord} from './use-checklist-record';
import './star-toggle.css';

/** Each page's colour, so the filled star is the colour the dot will be (P7.2, P7.4). */
const COLOUR: Record<string, PathColour> = {habit: 'cyan', goal: 'purple', 'goal-step': 'purple', water: 'blue', diary: 'pink', meal: 'pink', weight: 'pink', sleep: 'magenta', meditation: 'teal', fast: 'gold'};
const colourOf = (ref: FavouriteRef): PathColour => COLOUR[ref.kind === 'health' ? ref.input : ref.kind] ?? 'cyan';
const failure = (error: unknown) => error instanceof Error && error.message ? error.message : 'Not saved on this device. Try again.';

/**
 * The Checklist star (Session AF, L3; P7.2): on a habit, a Goal or one of its steps, a Health quick input (water, a familiar
 * food or supplement, a meal, the weight journal, sleep, meditation, fasting). Outlined: not on the path; filled with the
 * item's own colour: on the path. A tap is instant, with Undo in the toast; the star pops once (still under reduced
 * motion and Motion Off). A 44 px target that names what it does; it never opens the card it sits on. `note` dims it with
 * its reason (a paused habit rests off the path). Device-only: it writes `zigoals:checklist:v1`, never the card's record.
 */
export function StarToggle({item, label, colour, section, defaultValue, unit, note}: {item: FavouriteRef; label: string; colour?: PathColour; section?: string; defaultValue?: number; unit?: string; note?: string}) {
  const record = useChecklistRecord(), on = record.loaded && !record.unreadable && findFavourite(record.data, item) !== null;
  const [pop, setPop] = useState(false), timer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(timer.current), []);
  const tint = PATH_COLOURS[colour ?? colourOf(item)].token;
  function toggle(event: MouseEvent<HTMLButtonElement>) {
    event.preventDefault(); event.stopPropagation();
    const add = () => record.update(r => addFavourite(r, item, {id: newChecklistId(), at: new Date(), label, ...(section ? {section} : {}), ...(defaultValue !== undefined ? {defaultValue} : {}), ...(unit ? {unit} : {})}));
    const remove = () => record.update(r => removeFavourite(r, item));
    try {
      if (on) { remove(); showToast({message: `${label} is off your path.`, undo: add, undone: `${label} is back on your path.`}); }
      else { add(); showToast({message: `${label} added to your path.`, undo: remove, undone: `${label} is off your path.`}); }
      if (entranceAllowed()) { setPop(true); window.clearTimeout(timer.current); timer.current = window.setTimeout(() => setPop(false), 320); }
    } catch (error) { showToast({message: failure(error)}); }
  }
  return <button type="button" className="star-toggle" data-on={on || undefined} data-pop={pop || undefined} data-dim={note ? '' : undefined} disabled={!record.loaded} aria-pressed={on} aria-label={on ? `${label} is on your Checklist path. Take it off` : `Star ${label} for your Checklist path`} title={note ?? (on ? 'On your Checklist path' : 'Star for your Checklist path')} onClick={toggle} style={{'--checklist-star': tint} as CSSProperties}>
    <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" focusable="false"><path className="star-toggle-orbit" d="M3.2 15.6c-1.3-2.9 3.4-7.4 10.5-10 3.4-1.3 6.3-1.6 7.6-.9"/><path className="star-toggle-star" d="m12 4.2 2.2 4.6 5 .7-3.6 3.5.9 5-4.5-2.4-4.5 2.4.9-5L4.8 9.5l5-.7z"/></svg>
  </button>;
}
