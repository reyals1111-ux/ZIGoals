'use client';
import {useEffect, useId, useMemo, useRef, useState, type FormEvent} from 'react';
import {useDeviceRecord} from '../ai/use-device-record';
import {journalDay} from '../../lib/journal/journal-day';
import {JOURNAL, type JournalEntry} from '../../lib/journal/schema';
import {GOOD_THING_MAX, GOOD_THINGS_ID, goodThingsInMonth, goodThingsText} from '../../lib/journal/good-things';
import {lineLanguage} from '../../lib/quick-log/multi';
import {plural} from '../../lib/plural';
import {SecretGuard} from '../secret-guard/secret-guard';

/**
 * Session AV (owner follow-up 1, F-GOOD-THINGS; Day One, Finch): "Three good things" in one go on the Journal page — up
 * to three short lines, saved as one ordinary journal entry from the existing template, and how many good things this
 * month holds. Calm: no streak to lose, no score. Private like every entry; nothing is sent. Its own chunk.
 * Session AV (1c, q4 #4, fresh-agent review): open at the top of Write (the person can fold it), and Today's journal card
 * links here (#good-things), which puts the cursor in the first line.
 */
const LABELS = ['A good thing today', 'Another good thing', 'One more'] as const;
export default function ThreeGoodThings() {
  const journal = useDeviceRecord(JOURNAL), today = journalDay(), id = useId();
  const [items, setItems] = useState<string[]>(['', '', '']), [status, setStatus] = useState(''), [problem, setProblem] = useState('');
  const first = useRef<HTMLInputElement>(null);
  useEffect(() => { if (journal.loaded && typeof location !== 'undefined' && location.hash === '#good-things') requestAnimationFrame(() => { first.current?.scrollIntoView({block: 'center'}); first.current?.focus(); }); }, [journal.loaded]);
  const month = useMemo(() => goodThingsInMonth(journal.data.entries, today.slice(0, 7)), [journal.data.entries, today]);
  const save = (event: FormEvent) => {
    event.preventDefault(); setProblem('');
    const words = items.join(' ').trim();
    if (!words) return setProblem('Write at least one good thing first.');
    const text = goodThingsText(items, lineLanguage(words) === 'nl' ? 'nl' : 'en');
    const entry: JournalEntry = {id: crypto.randomUUID(), date: today, text, createdAt: new Date().toISOString(), template: GOOD_THINGS_ID};
    try { journal.update(current => ({...current, entries: [...current.entries, entry].slice(-5000)})); } catch { return setProblem('This could not be saved on this device. Nothing was changed.'); }
    const n = items.filter(i => i.trim()).length;
    setItems(['', '', '']); setStatus(`Saved ${n} good ${plural(n, 'thing', 'things')} in your journal, on this device.`);
  };
  if (!journal.loaded) return null;
  const summary = month.things ? `${month.things} good ${plural(month.things, 'thing', 'things')} this month, on ${month.days} ${plural(month.days, 'day', 'days')}` : 'None this month yet';
  return <details id="good-things" className="good-things-fold" open>
    <summary>Three good things <span className="fine">· {summary}</span></summary>
    <form className="good-things" onSubmit={save} aria-label="Three good things">
      <p className="fine">Small things count: a warm drink, a kind word, a walk. Write one, two or three; they are kept as one entry.</p>
      {LABELS.map((label, i) => <label key={label} className="field"><span>{label}</span><input ref={i === 0 ? first : undefined} id={`${id}-${i}`} maxLength={GOOD_THING_MAX} autoComplete="off" enterKeyHint={i < 2 ? 'next' : 'done'} value={items[i]} onChange={e => { const v = e.target.value; setItems(list => list.map((x, k) => k === i ? v : x)); }}/></label>)}
      <SecretGuard text={items.join(' ')} onRemove={() => setItems(['', '', ''])}/>
      {problem && <p role="alert">{problem}</p>}
      <div className="journal-actions"><button type="submit" className="primary">Save good things</button></div>
    </form>
    <p className="journal-status" role="status" aria-live="polite">{status}</p>
  </details>;
}
