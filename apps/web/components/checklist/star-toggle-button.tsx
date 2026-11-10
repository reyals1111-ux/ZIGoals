'use client';
import {useEffect, useRef, useState, type CSSProperties, type MouseEvent} from 'react';
import type {PathColour} from '../../lib/path/colours';
import {addFavourite, findFavourite, newChecklistId, removeFavourite, type FavouriteRef} from '../../lib/checklist/store';
import {showToast} from '../ui/undo-toast';
import {entranceAllowed} from '../use-entrance';
import {useChecklistRecord} from './use-checklist-record';
import {StarGlyph, starTint, starTitle} from './star-glyph';
// CI14 (weights): the star's stylesheet stays with the eager wrapper (star-toggle.tsx), so its place in the cascade is unchanged.

const failure = (error: unknown) => error instanceof Error && error.message ? error.message : 'Not saved on this device. Try again.';

/**
 * The Checklist star (Session AF, L3; P7.2): on a habit, a Goal or one of its steps, a Health quick input (water, a familiar
 * food or supplement, a meal, the weight journal, sleep, meditation, fasting). Outlined: not on the path; filled with the
 * item's own colour: on the path. A tap is instant, with Undo in the toast; the star pops once (still under reduced
 * motion and Motion Off). A 44 px target that names what it does; it never opens the card it sits on. `note` dims it with
 * its reason (a paused habit rests off the path). Device-only: it writes `zigoals:checklist:v1`, never the card's record.
 */
export function StarToggleButton({item, label, colour, section, defaultValue, unit, note}: {item: FavouriteRef; label: string; colour?: PathColour; section?: string; defaultValue?: number; unit?: string; note?: string}) {
  const record = useChecklistRecord(), on = record.loaded && !record.unreadable && findFavourite(record.data, item) !== null;
  const [pop, setPop] = useState(false), timer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(timer.current), []);
  const tint = starTint(item, colour);
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
  return <button type="button" className="star-toggle" data-on={on || undefined} data-pop={pop || undefined} data-dim={note ? '' : undefined} disabled={!record.loaded} aria-pressed={on} aria-label={on ? `${label} is on your Checklist path. Take it off` : `Star ${label} for your Checklist path`} title={starTitle(note, on)} onClick={toggle} style={{'--checklist-star': tint} as CSSProperties}>
    <StarGlyph/>
  </button>;
}
