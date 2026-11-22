'use client';
import {useId} from 'react';
import {LOOK_COLOUR_WORDS, TASK_LOOK_COLOURS, TASK_LOOK_GLYPHS, type TaskLook} from '../../lib/tasks/look';
import {suggestTaskLook} from '../../lib/tasks/look-words';
import '../habits/habit-look.css';
import './tasks-r3.css';

/**
 * Session AV lane 2 (r3-plan, LEDGER #257; Structured's task icons and colours): a task's symbol and colour in its editor
 * (the editor's own chunk). A suggestion from the title's words (lib/tasks/look-words.ts, English and Dutch, no model) is
 * offered as one button, never set by itself; two radio groups choose; "No symbol" clears. The colour is named in words.
 */
export function TaskLookField({title, value, onChange}: {title: string; value: TaskLook | null; onChange: (look: TaskLook | null) => void}) {
  const id = useId(), hint = suggestTaskLook(title), glyph = value?.glyph ?? null, colour = value?.colour ?? 'teal';
  const offer = hint && (hint.look.glyph !== value?.glyph || hint.look.colour !== value?.colour) ? hint : null;
  return <fieldset className="task-look-field" aria-describedby={`${id}-note`}>
    <legend>Symbol and colour — optional</legend>
    {offer && <p className="task-look-offer"><button type="button" className="secondary" onClick={() => onChange(offer.look)}><span className="habit-look" data-look-colour={offer.look.colour} aria-hidden="true">{offer.look.glyph}</span> Use the suggestion for “{offer.word}”</button></p>}
    <div className="task-look-glyphs" role="radiogroup" aria-label="Symbol">
      <label className="task-look-choice"><input type="radio" name={`${id}-glyph`} checked={glyph === null} onChange={() => onChange(null)}/><span>No symbol</span></label>
      {TASK_LOOK_GLYPHS.map(g => <label key={g} className="task-look-choice" data-look-colour={colour}><input type="radio" name={`${id}-glyph`} checked={glyph === g} onChange={() => onChange({glyph: g, colour})}/><span className="habit-look" aria-hidden="true">{g}</span><span className="sr-only">Symbol {g}</span></label>)}
    </div>
    <div className="task-look-colours" role="radiogroup" aria-label="Colour">
      {TASK_LOOK_COLOURS.map(c => <label key={c} className="task-look-choice" data-look-colour={c}><input type="radio" name={`${id}-colour`} checked={!!glyph && colour === c} disabled={!glyph} onChange={() => glyph && onChange({glyph, colour: c})}/><span className="task-look-swatch" aria-hidden="true"/><span>{LOOK_COLOUR_WORDS[c]}</span></label>)}
    </div>
    <small id={`${id}-note`} className="tasks-field-note">{value ? `Shown beside the title in your lists, on Today and on the timeline: ${LOOK_COLOUR_WORDS[value.colour].toLowerCase()} ${value.glyph}.` : 'Shown beside the title in your lists, on Today and on the timeline. Choose a symbol first, then its colour.'}</small>
  </fieldset>;
}
