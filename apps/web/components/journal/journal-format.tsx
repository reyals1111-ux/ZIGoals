'use client';
import {useId, useState} from 'react';
import {HIGHLIGHT_COLOURS, type HighlightColour} from '../../lib/ai/safe-render';
import {insertTick, wrapHighlight} from '../../lib/notes/marks';
import {markLines, wrapWords, type Edit} from '../../lib/journal/marks';
import './entry-format.css';

/**
 * Session AV lane 2 (r4-mind; LEDGER #308, Journey's paragraph styles, bold, italic and checklists): a small format bar
 * under an entry's words — Bold, Italics, Heading, List, Tick box, Quote and Highlight in six named colours. Each writes
 * the Markdown into the words (typing it by hand works the same), and focus goes back to the words with the chosen words
 * still chosen. The entry keeps its text as written. Its own chunk, loaded after the Write form.
 */
const COLOUR_WORDS: Record<HighlightColour, string> = {yellow: 'Yellow', green: 'Green', blue: 'Blue', purple: 'Purple', red: 'Red', orange: 'Orange'};
export default function JournalFormat({value, onChange, maxLength, field}: {value: string; onChange: (text: string) => void; maxLength: number; field: () => HTMLTextAreaElement | null}) {
  const id = useId(), [colour, setColour] = useState<HighlightColour>('yellow'), [said, setSaid] = useState('');
  const apply = (make: (start: number, end: number) => Edit, words: string) => {
    const el = field(), start = el?.selectionStart ?? value.length, end = el?.selectionEnd ?? value.length, out = make(start, end);
    if (out.text.length > maxLength) { setSaid(`An entry holds at most ${maxLength.toLocaleString('en-US')} characters.`); return; }
    onChange(out.text); setSaid(words);
    requestAnimationFrame(() => { if (el) { el.focus(); el.setSelectionRange(out.start, out.end); } });
  };
  return <div className="journal-format" role="group" aria-label="Format the entry" aria-describedby={`${id}-hint`}>
    <button type="button" className="quiet" aria-label="Bold" onClick={() => apply((s, e) => wrapWords(value, s, e, 'bold'), 'Bold: the words are between ** marks.')}><span className="journal-format-b" aria-hidden="true">B</span></button>
    <button type="button" className="quiet" aria-label="Italics" onClick={() => apply((s, e) => wrapWords(value, s, e, 'italic'), 'Italics: the words are between * marks.')}><span className="journal-format-i" aria-hidden="true">I</span></button>
    <button type="button" className="quiet" onClick={() => apply((s, e) => markLines(value, s, e, 'heading'), 'The line is a heading now (## at its start). Press again to make it plain.')}>Heading</button>
    <button type="button" className="quiet" onClick={() => apply((s, e) => markLines(value, s, e, 'list'), 'The line is a list item now (- at its start).')}>List</button>
    <button type="button" className="quiet" onClick={() => apply(s => insertTick(value, s), 'A tick box starts the line. Tick it in the entry once it is saved.')}>Tick box</button>
    <button type="button" className="quiet" onClick={() => apply((s, e) => markLines(value, s, e, 'quote'), 'The line is a quote now (> at its start).')}>Quote</button>
    <span className="journal-format-hl">
      <label className="sr-only" htmlFor={`${id}-colour`}>Highlight colour</label>
      <select id={`${id}-colour`} value={colour} onChange={e => setColour(e.target.value as HighlightColour)}>{HIGHLIGHT_COLOURS.map(c => <option key={c} value={c}>{COLOUR_WORDS[c]}</option>)}</select>
      <button type="button" className="quiet" onClick={() => apply((s, e) => wrapHighlight(value, s, e, colour), `${COLOUR_WORDS[colour]} highlight round the words you chose.`)}><span className="journal-format-swatch" data-hl={colour} aria-hidden="true"/>Highlight</button>
    </span>
    <span id={`${id}-hint`} className="sr-only">Choose words in the entry first, or put the cursor on a line.</span>
    <p className="sr-only" role="status" aria-live="polite">{said}</p>
  </div>;
}
