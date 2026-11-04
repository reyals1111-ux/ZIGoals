'use client';
import {useId, useState} from 'react';
import './goal-notes.css';

/** Notes longer than this many characters start folded to four lines. */
export const NOTES_FOLD_AT = 240;

/**
 * Session AL (DV-030, P-DV-54): a Goal's notes in its header. Long notes (2,000 characters printed ~60 lines at 1920 px and
 * pushed Remaining and Fund below the fold) start folded to four lines with "Show all notes"; short notes show in full.
 * Line breaks are kept and long words wrap, so nothing runs off the card in any theme.
 */
export function GoalNotes({text}: {text: string}) {
  const [open, setOpen] = useState(false), id = useId();
  const long = text.length > NOTES_FOLD_AT || text.split('\n').length > 4;
  return <div className="goal-notes">
    <p id={id} className="goal-notes-text" data-folded={long && !open ? 'true' : undefined}>{text}</p>
    {long && <button type="button" className="text-link goal-notes-toggle" aria-expanded={open} aria-controls={id} onClick={() => setOpen(v => !v)}>{open ? 'Show less' : 'Show all notes'}</button>}
  </div>;
}
