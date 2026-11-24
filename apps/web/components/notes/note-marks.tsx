'use client';
import {useId, useState} from 'react';
import {HIGHLIGHT_COLOURS, type HighlightColour} from '../../lib/ai/safe-render';
import {insertTick, wrapHighlight, type Edit} from '../../lib/notes/marks';
import {COLOUR_WORDS} from './note-render';

/**
 * Session AV lane 2 (r3-notes; LEDGER #264, #267, Obsidian's tick boxes and highlights): two buttons under a note's text
 * while it is edited — "Tick box" (the caret's line becomes "- [ ] …") and "Highlight" in one of six named colours (the
 * chosen words become ==…==). Typing the marks by hand works the same. Focus goes back to the text with the words
 * chosen. Its own chunk.
 */
export default function NoteMarks({value, onChange, maxLength, field}: {value: string; onChange: (text: string) => void; maxLength: number; field: () => HTMLTextAreaElement | null}) {
  const id = useId(), [colour, setColour] = useState<HighlightColour>('yellow'), [said, setSaid] = useState('');
  const apply = (make: (el: HTMLTextAreaElement | null) => Edit, words: string) => {
    const el = field(), out = make(el);
    if (out.text.length > maxLength) { setSaid(`A note holds at most ${maxLength.toLocaleString('en-US')} characters.`); return; }
    onChange(out.text); setSaid(words);
    requestAnimationFrame(() => { if (el) { el.focus(); el.setSelectionRange(out.start, out.end); } });
  };
  return <div className="note-marks" role="group" aria-label="Marks">
    <button type="button" className="quiet" onClick={() => apply(el => insertTick(value, el?.selectionStart ?? value.length), 'A tick box starts the line. Tick it when you read the note.')}>Tick box</button>
    <span className="note-marks-hl">
      <label className="sr-only" htmlFor={`${id}-colour`}>Highlight colour</label>
      <select id={`${id}-colour`} value={colour} onChange={e => setColour(e.target.value as HighlightColour)}>{HIGHLIGHT_COLOURS.map(c => <option key={c} value={c}>{COLOUR_WORDS[c]}</option>)}</select>
      <button type="button" className="quiet" onClick={() => apply(el => wrapHighlight(value, el?.selectionStart ?? value.length, el?.selectionEnd ?? value.length, colour), `${COLOUR_WORDS[colour]} highlight added round the words you chose.`)}><span className="note-hl-swatch" data-hl={colour} aria-hidden="true"/>Highlight</button>
    </span>
    <p className="sr-only" role="status" aria-live="polite">{said}</p>
  </div>;
}
