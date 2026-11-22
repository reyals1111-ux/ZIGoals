'use client';
import {useId, useState} from 'react';
import {useDeviceRecord} from '../ai/use-device-record';
import {JOURNAL, type JournalEntry} from '../../lib/journal/schema';
import {bookOf, booksOf, moveEntry} from '../../lib/journal/books';
import {showStatus} from '../ui/undo-toast';

/**
 * Session AV lane 2 (journal): an entry's "More" — the things done less often than tagging, so each row stays light (q4
 * #34): move it to another journal (LEDGER #43). Loaded when "More" opens.
 */
export default function EntryMore({entry, day}: {entry: JournalEntry; day: string}) {
  const journal = useDeviceRecord(JOURNAL), id = useId();
  const books = booksOf(journal.data), current = bookOf(journal.data, entry)?.id ?? '';
  const [to, setTo] = useState(current);
  if (!journal.loaded) return <p className="fine">Loading…</p>;
  const move = () => {
    try { journal.update(c => moveEntry(c, entry.id, to || null)); } catch (e) { showStatus(e instanceof Error ? e.message : 'This could not be kept on this device.', {tone: 'error'}); return; }
    showStatus(`The entry of ${day} is in ${to ? books.find(b => b.id === to)?.name ?? 'that journal' : 'your main Journal'} now.`);
  };
  return <div className="journal-entry-more-body">
    {books.length > 0 ? <div className="journal-entry-move" role="group" aria-labelledby={`${id}-move`}>
      <span id={`${id}-move`} className="sr-only">Move the entry of {day}</span>
      <label className="field"><span>Journal</span><select value={to} onChange={e => setTo(e.target.value)}><option value="">Journal (main)</option>{books.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}</select></label>
      <button type="button" className="secondary" disabled={to === current} onClick={move}>Move</button>
    </div> : <p className="fine">Make a second journal under &ldquo;Your journals&rdquo; to move entries between journals.</p>}
  </div>;
}
