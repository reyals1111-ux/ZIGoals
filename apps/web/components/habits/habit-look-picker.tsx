'use client';
import {useEffect, useId, useRef, useState} from 'react';
import {HABIT_COLOURS, HABIT_GLYPHS, lookOf, withLook, type HabitLook} from '../../lib/habit-look';
import type {HabitExtrasState} from './use-habit-extras';

/**
 * Session AV (owner follow-up 1, F-HABIT-LOOK; Streaks): choose a habit's symbol and colour (lib/habit-look.ts). Two
 * small radio groups, Save, Remove and Cancel; 44 px targets; the colour named in words, not only shown. Lazy: loaded
 * when "Symbol and colour…" is chosen in the habit's menu.
 */
const COLOUR_WORDS: Record<HabitLook['colour'], string> = {grey: 'Grey', red: 'Red', orange: 'Orange', yellow: 'Yellow', green: 'Green', teal: 'Teal', blue: 'Blue', violet: 'Violet', pink: 'Pink'};
export default function HabitLookPicker({habitId, title, extras, onClose}: {habitId: string; title: string; extras: HabitExtrasState; onClose: (said?: string) => void}) {
  const id = useId(), current = lookOf(extras.data, habitId);
  const [glyph, setGlyph] = useState<HabitLook['glyph']>(current?.glyph ?? '●'), [colour, setColour] = useState<HabitLook['colour']>(current?.colour ?? 'teal'), [error, setError] = useState('');
  // Session AV (q4 #26, keyboard): the picker takes the focus on its checked symbol, so Escape and the arrows work at once.
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => { box.current?.querySelector<HTMLInputElement>('.habit-look-glyphs input:checked')?.focus(); }, []);
  const save = (look: HabitLook | null) => { try { extras.update(r => withLook(r, habitId, look)); onClose(look ? `${title}: ${COLOUR_WORDS[look.colour].toLowerCase()} ${look.glyph}.` : `${title}: symbol removed.`); } catch (e) { setError(e instanceof Error ? e.message : 'Not saved on this device.'); } };
  return <div ref={box} className="habit-look-picker" role="group" aria-labelledby={`${id}-title`} onKeyDown={e => { if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); onClose(); } }}>
    <p id={`${id}-title`} className="fine"><strong>Symbol and colour for {title}</strong> — shown beside its name.</p>
    <fieldset className="habit-look-glyphs"><legend>Symbol</legend>{HABIT_GLYPHS.map(g => <label key={g} className="habit-look-choice" data-look-colour={colour}><input type="radio" name={`${id}-glyph`} checked={glyph === g} onChange={() => setGlyph(g)}/><span aria-hidden="true">{g}</span><span className="sr-only">Symbol {g}</span></label>)}</fieldset>
    <fieldset className="habit-look-colours"><legend>Colour</legend>{HABIT_COLOURS.map(c => <label key={c} className="habit-look-choice" data-look-colour={c}><input type="radio" name={`${id}-colour`} checked={colour === c} onChange={() => setColour(c)}/><span aria-hidden="true" className="habit-look-swatch"/><span className="habit-look-word">{COLOUR_WORDS[c]}</span></label>)}</fieldset>
    <div className="money-actions"><button type="button" className="secondary" onClick={() => save({glyph, colour})}>Save</button>{current && <button type="button" className="quiet" onClick={() => save(null)}>Remove the symbol</button>}<button type="button" className="quiet" onClick={() => onClose()}>Cancel</button></div>
    {error && <p className="field-error" role="alert">{error}</p>}
  </div>;
}
