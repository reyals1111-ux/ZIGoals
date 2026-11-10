import type {PathColour} from '../../lib/path/colours';
import {PATH_COLOURS} from '../../lib/path/colours';
import type {FavouriteRef} from '../../lib/checklist/store';

/** Each page's colour, so the filled star is the colour the dot will be (P7.2, P7.4). */
const COLOUR: Record<string, PathColour> = {habit: 'cyan', goal: 'purple', 'goal-step': 'purple', water: 'blue', diary: 'pink', meal: 'pink', weight: 'pink', sleep: 'magenta', meditation: 'teal', fast: 'gold'};
const colourOf = (ref: FavouriteRef): PathColour => COLOUR[ref.kind === 'health' ? ref.input : ref.kind] ?? 'cyan';
/** The star's fill token: the item's own colour, or the one its page gives it. */
export const starTint = (item: FavouriteRef, colour?: PathColour) => PATH_COLOURS[colour ?? colourOf(item)].token;
export const starTitle = (note: string | undefined, on: boolean) => note ?? (on ? 'On your Checklist path' : 'Star for your Checklist path');
/** The star itself (an orbit stroke and the star), the same in the button and in its stand-in while that loads. */
export function StarGlyph() {
  return <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" focusable="false"><path className="star-toggle-orbit" d="M3.2 15.6c-1.3-2.9 3.4-7.4 10.5-10 3.4-1.3 6.3-1.6 7.6-.9"/><path className="star-toggle-star" d="m12 4.2 2.2 4.6 5 .7-3.6 3.5.9 5-4.5-2.4-4.5 2.4.9-5L4.8 9.5l5-.7z"/></svg>;
}
