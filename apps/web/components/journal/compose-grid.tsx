'use client';
import {useId, useState, type CSSProperties} from 'react';
import type {JournalTemplate, PromptLang} from '../../lib/journal-prompts/templates';
import {MANDALA_PLACES, gridOf, gridText, type Grid} from '../../lib/journal/grid';
import {MAX_TEXT} from '../../lib/journal/schema';

/**
 * Session AV lane 2 (r3-notes; LEDGER #266, Grid Diary's grid layout and the Mandala): the entry written as a grid of
 * cards, one box per heading of the template it started from; the Mandala as a 3 × 3 grid with the theme in the centre
 * and eight boxes around it (written and read centre first, then clockwise from the top left; one column on a phone).
 * Every box is a labelled text field; the entry is still saved as text with headings. Its own chunk.
 */
export default function ComposeGrid({template, lang, text, onChange}: {template: JournalTemplate; lang: PromptLang; text: string; onChange: (text: string) => void}) {
  const id = useId(), [grid, setGrid] = useState<Grid>(() => gridOf(text, template)), [hadPrefix] = useState(() => !!grid.prefix);
  const put = (next: Grid) => { const words = gridText(next, template, lang); if (words.length > MAX_TEXT) return; setGrid(next); onChange(words); };
  const mandala = template.grid === 'mandala';
  return <div className={`compose-grid${mandala ? ' is-mandala' : ''}`} role="group" aria-label={mandala ? `${template.title[lang]}, as a 3 by 3 grid` : `${template.title[lang]}, as a grid`}>
    {hadPrefix && <label className="field compose-grid-prefix"><span>Above the grid</span><textarea rows={2} value={grid.prefix} onChange={e => put({...grid, prefix: e.target.value})}/></label>}
    {template.headings[lang].map((h, i) => { const place = mandala ? MANDALA_PLACES[i] : undefined; return <label key={i} className={`compose-grid-cell${mandala && i === 0 ? ' is-centre' : ''}`} style={place ? {'--row': place[0], '--col': place[1]} as CSSProperties : undefined}>
      <span id={`${id}-h${i}`} lang={lang}>{h}</span>
      <textarea rows={mandala ? 3 : 4} value={grid.cells[i] ?? ''} aria-labelledby={`${id}-h${i}`} onChange={e => put({...grid, cells: grid.cells.map((c, k) => k === i ? e.target.value : c)})}/>
    </label>; })}
  </div>;
}
