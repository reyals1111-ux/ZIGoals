'use client';
import type {CSSProperties} from 'react';
import {templateById} from '../../lib/journal-prompts/templates';
import {MANDALA_PLACES, gridOf} from '../../lib/journal/grid';
import type {JournalEntry} from '../../lib/journal/schema';

/**
 * Session AV lane 2 (r3-notes; LEDGER #266): a Mandala entry in the list, drawn as its 3 × 3 grid (the centre first for a
 * screen reader, then the eight around it; one column on a phone). Its words stay the entry's own text. Its own chunk.
 */
export default function EntryGrid({entry}: {entry: JournalEntry}) {
  const t = templateById(entry.template);
  if (!t) return <p className="journal-entry-text">{entry.text}</p>;
  const lang = t.headings.nl.some(h => entry.text.includes(h)) && !t.headings.en.some(h => entry.text.includes(h)) ? 'nl' : 'en';
  const {prefix, cells} = gridOf(entry.text.replace(/\s*\(SHOWCASE DATA\)\s*$/, ''), t);
  return <>
    {prefix && <p className="journal-entry-text">{prefix}</p>}
    <ul className="entry-grid" aria-label={`${t.title[lang]}, as a grid`} lang={lang}>{t.headings[lang].map((h, i) => { const place = MANDALA_PLACES[i]!; return <li key={i} className={i === 0 ? 'is-centre' : undefined} style={{'--row': place[0], '--col': place[1]} as CSSProperties}>
      <strong>{h}</strong><p>{cells[i] || '—'}</p>
    </li>; })}</ul>
  </>;
}
