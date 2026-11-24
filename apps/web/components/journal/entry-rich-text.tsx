'use client';
import Link from 'next/link';
import {Fragment, useId, useMemo, type ReactNode} from 'react';
import {useDeviceRecord} from '../ai/use-device-record';
import {useLinkTargets} from '../notes/use-notes';
import {NOTES} from '../../lib/notes/schema';
import {linkIndex, resolveLink, type LinkIndex} from '../../lib/notes/links';
import {entrySegments} from '../../lib/journal/entry-links';
import {hasMarks} from '../../lib/journal/has-marks';
import {tickEntry} from '../../lib/journal/marks';
import {JOURNAL} from '../../lib/journal/schema';
import {undoEntryChange, type EntryUndo} from '../../lib/journal/versions';
import {parseBlocks, type NoteBlock, type NoteInline} from '../../lib/ai/safe-render';
import {formatDate} from '../../lib/visual-format';
import {showStatus, showUndo} from '../ui/undo-toast';
import './entry-format.css';

/**
 * Session AV lane 2 (journal; LEDGER #35, Day One's links to other entries): an entry's words with its [[links]] live —
 * `[[2026-11-03]]` shows that day's entries here (the Journal's date filter), `[[name]]` opens the note, goal or habit of
 * that name (as Notes' links do). A name nothing on this device carries stays as written. Loaded only for an entry
 * whose words hold a [[link]] or a mark.
 * Session AV lane 2 (r4-mind; LEDGER #308, Journey's formatting and checklists): an entry with Markdown is drawn as Notes
 * draw theirs — headings, bold, italics, lists, quotes, ==highlights== and "- [ ]" tick boxes, through round 3's
 * notes-only marks (never ZIGi's replies), with the entry's line breaks kept. Ticking a box writes "- [x]" into that
 * line of the entry; the words it had are kept as an earlier version and the message offers Undo. Focus stays on the box.
 */
type Day = (day: string) => void;
function linked(text: string, index: LinkIndex, onDay: Day, key: string): ReactNode[] {
  return entrySegments(text).map((s, i) => {
    if (s.kind === 'text') return <Fragment key={`${key}-${i}`}>{s.text}</Fragment>;
    if (s.kind === 'day') return <a key={`${key}-${i}`} className="text-link journal-entry-link" href={`/app/journal?day=${s.day}`} onClick={e => { e.preventDefault(); onDay(s.day); }}>{s.label === s.day ? formatDate(s.day, {weekday: true}) : s.label}</a>;
    const hit = resolveLink(index, s.name);
    return hit ? <Link key={`${key}-${i}`} className="text-link journal-entry-link" href={hit.href}>{s.name}</Link> : <Fragment key={`${key}-${i}`}>[[{s.name}]]</Fragment>;
  });
}
const COLOUR = {yellow: 'Yellow', green: 'Green', blue: 'Blue', purple: 'Purple', red: 'Red', orange: 'Orange'} as const;
function inline(nodes: readonly NoteInline[], index: LinkIndex, onDay: Day, key = 'n'): ReactNode[] {
  return nodes.map((n, i) => {
    const k = `${key}.${i}`;
    switch (n.type) {
      case 'text': return <Fragment key={k}>{linked(n.text, index, onDay, k)}</Fragment>;
      case 'code': return <code key={k}>{n.text}</code>;
      case 'strong': return <strong key={k}>{inline(n.children, index, onDay, k)}</strong>;
      case 'em': return <em key={k}>{inline(n.children, index, onDay, k)}</em>;
      case 'link': return <a key={k} href={n.href} target="_blank" rel="noopener noreferrer">{inline(n.children, index, onDay, k)}</a>;
      case 'mark': return <mark key={k} className="journal-hl" data-hl={n.colour}><span className="sr-only">{COLOUR[n.colour]} highlight: </span>{inline(n.children, index, onDay, k)}</mark>;
    }
  });
}
function Blocks({blocks, index, onDay, onTick, id}: {blocks: readonly NoteBlock[]; index: LinkIndex; onDay: Day; onTick: (line: number, checked: boolean) => void; id: string}) {
  return <>{blocks.map((b, i) => {
    const r = (n: readonly NoteInline[]) => inline(n, index, onDay, `b${i}`);
    switch (b.type) {
      case 'paragraph': return <p key={i}>{r(b.children)}</p>;
      // An entry's headings sit under the Entries heading (an <h2>): h3–h5 keep the page's outline in order.
      case 'heading': return b.level === 1 ? <h3 key={i}>{r(b.children)}</h3> : b.level === 2 ? <h4 key={i}>{r(b.children)}</h4> : <h5 key={i}>{r(b.children)}</h5>;
      case 'quote': return <blockquote key={i}><p>{r(b.children)}</p></blockquote>;
      case 'code': return <pre key={i}><code>{b.text}</code></pre>;
      case 'table': return <div key={i} className="journal-md-table" role="region" aria-label="Table" tabIndex={0}><table><thead><tr>{b.head.map((c, k) => <th key={k} scope="col">{r(c)}</th>)}</tr></thead><tbody>{b.rows.map((row, k) => <tr key={k}>{row.map((c, m) => <td key={m}>{r(c)}</td>)}</tr>)}</tbody></table></div>;
      case 'list': {
        const items = b.items.map((it, j) => {
          const tick = b.ticks?.[j], line = b.lines?.[j];
          if (tick === null || tick === undefined || line === undefined) return <li key={j}>{r(it)}</li>;
          return <li key={j} className="journal-tick" data-ticked={tick ? '' : undefined}><input type="checkbox" className="journal-tick-box" checked={tick} aria-labelledby={`${id}-t${line}`} onChange={e => onTick(line, e.target.checked)}/><span id={`${id}-t${line}`}>{r(it)}</span></li>;
        });
        const cls = b.ticks?.some(t => t !== null) ? 'journal-ticks' : undefined;
        return b.ordered ? <ol key={i} className={cls}>{items}</ol> : <ul key={i} className={cls}>{items}</ul>;
      }
    }
  })}</>;
}
export default function EntryRichText({text, onDay, entryId, day}: {text: string; onDay: (day: string) => void; /** LEDGER #308: the entry a tick box changes, and its day in words for the message. */ entryId?: string; day?: string}) {
  const notes = useDeviceRecord(NOTES), targets = useLinkTargets(), journal = useDeviceRecord(JOURNAL), id = useId();
  const index = useMemo(() => linkIndex({notes: notes.loaded && !notes.unreadable ? notes.data.notes : [], goals: targets.goals, habits: targets.habits}), [notes.loaded, notes.unreadable, notes.data, targets.goals, targets.habits]);
  const marked = hasMarks(text), blocks = useMemo(() => marked ? parseBlocks(text, {notes: true, breaks: true}) : [], [marked, text]);
  if (!marked) return <p className="journal-entry-text">{linked(text, index, onDay, 'p')}</p>;
  const tick = (line: number, checked: boolean) => {
    if (!entryId) return;
    let undo: EntryUndo | null = null;
    try { journal.update(c => { const out = tickEntry(c, entryId, line, checked, new Date().toISOString()); undo = out.undo; return out.journal; }); }
    catch (e) { showStatus(e instanceof Error ? e.message : 'This could not be saved on this device.', {tone: 'error'}); return; }
    const made = undo as EntryUndo | null;
    if (made) showUndo({message: `${checked ? 'Ticked' : 'Unticked'} in the entry of ${day ?? 'that day'}. Its earlier words are under Earlier versions.`, undone: 'The tick box is back as it was.', restore: () => journal.update(c => undoEntryChange(c, made))});
  };
  const boxes = blocks.flatMap(b => b.type === 'list' ? (b.ticks ?? []).filter(t => t !== null) : []);
  return <div className="journal-entry-text journal-entry-md">
    <Blocks blocks={blocks} index={index} onDay={onDay} onTick={tick} id={id}/>
    {boxes.length > 1 && <p className="fine journal-tick-count">{boxes.filter(Boolean).length} of {boxes.length} ticked</p>}
  </div>;
}
