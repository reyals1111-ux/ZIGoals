'use client';
import Link from 'next/link';
import {Suspense, lazy, useMemo, useState} from 'react';
import {formatDate, formatWeekday} from '../../lib/visual-format';
import {useDeviceRecord} from '../ai/use-device-record';
import {addLocalDays, localDate} from '../../lib/local-date';
import {ENERGY, ENERGY_WORDS} from '../../lib/energy/schema';
import {JOURNAL, removeJournalEntry, restoreJournalEntry, type JournalEntry} from '../../lib/journal/schema';
import {showStatus, showUndo} from '../ui/undo-toast';
import {patternLine, patterns} from '../../lib/journal/reflect';
import {JournalCompose} from './journal-compose';
import {weekLines, weekPattern} from '../../lib/checkin/week';
import {MOOD_WORDS} from '../../lib/wrap-up/engine';
import {healthGroupIn} from '../../lib/vault/w-homes';
import {isShown} from '../../lib/pages/visibility';
import {useHealth} from '../health/use-health';
import {usePagesView} from '../pages/use-pages-view';
import './journal.css';
// Session AK (lane S, item 13): Year in Pixels, its code loaded when its fold is opened.
import {OnDemandFold} from '../insights/compare/on-demand-fold';
import {LoadBoundary} from '../load-boundary';
import {ArtNote} from '../illustrations/art-note';
import {useUndoShortcut} from '../tasks/use-undo-shortcut';

const YearPixels = lazy(() => import('./year-pixels'));
// Session AK (BUILD list 2 #3): "On this day" and its Privacy switch, each loaded on its own after the page.
const OnThisDay = lazy(() => import('./on-this-day'));
const OnThisDaySwitch = lazy(() => import('./on-this-day-switch'));
// Session AK (BUILD list 2 #12, lane G1a): your own 1–5 scales, loaded on its own after the page.
const YourScales = lazy(() => import('../scales/your-scales'));

/**
 * Session AI (feature 6): the Journal page — write, ZIGi's question, the entries (newest first, delete with Undo), the
 * patterns over the last 14 entries, the last 14 days of energy, and the two privacy switches: ZIGi's questions on or
 * off, and whether ZIGi may send the journal to the person's own AI (off by default). Everything stays on this device.
 */
export function JournalPage({showcase = false}: {showcase?: boolean}) {
  const journal = useDeviceRecord(JOURNAL), energy = useDeviceRecord(ENERGY), today = localDate();
  useUndoShortcut(); // Session AL (P-LS-08): Ctrl/⌘+Z runs the toast's Undo, never in a text field.
  const [query, setQuery] = useState('');
  const entries = useMemo(() => [...journal.data.entries].reverse().filter(e => !query.trim() || e.text.toLowerCase().includes(query.trim().toLowerCase())), [journal.data.entries, query]);
  const found = useMemo(() => patterns(journal.data, energy.data), [journal.data, energy.data]);
  const days = Array.from({length: 14}, (_, i) => addLocalDays(today, i - 13));
  // Session AJ (item 10; COMPANIONS.md P2): this week's check-ins, energy and (while Health shows) the day's mood.
  const health = useHealth(), healthShown = isShown(usePagesView(), 'health');
  const moodDays = useMemo(() => healthShown && health.loaded && !health.error ? Object.fromEntries(Object.entries(healthGroupIn(health.data, 'moods')?.days ?? {}).map(([d, m]) => [d, m.mood])) : {}, [healthShown, health.loaded, health.error, health.data]);
  const week = useMemo(() => weekPattern({energy: Object.fromEntries(Object.entries(energy.data.days).map(([d, v]) => [d, v.energy])), mood: moodDays, today}), [energy.data.days, moodDays, today]);
  // Session AL (A7, PRIMITIVES 3e): the one Undo toast; its restore puts the entry back into the latest record.
  const remove = (e: JournalEntry) => {
    try { journal.update(c => removeJournalEntry(c, e.id)); } catch { showStatus('This entry could not be removed on this device.', {tone: 'error'}); return; }
    showUndo({message: `Entry of ${formatDate(e.date)} removed.`, undone: 'The entry is back.', restore: () => journal.update(c => restoreJournalEntry(c, e))});
  };
  if (!journal.loaded) return <p className="fine">Loading your journal…</p>;
  return <div className="journal-page">
    {showcase && <p className="fine">Fictional Showcase entries.</p>}
    {journal.unreadable && <p role="alert">This device&rsquo;s journal could not be read; it is not written over.</p>}
    <LoadBoundary quiet><Suspense fallback={null}><OnThisDay entries={journal.data.entries} today={today} energy={energy.data.days} moods={moodDays}/></Suspense></LoadBoundary>
    <section className="panel" aria-labelledby="journal-write"><h2 id="journal-write">Write</h2><JournalCompose/>
      {/* Session AK (B2, lane B): the Journal's sibling for longer thoughts — today's note beside what this day holds. */}
      <p className="fine journal-notes-link">Longer thoughts and ideas go in <Link className="text-link" href="/app/notes?day=today">today&rsquo;s note</Link>, beside what this day holds. There, type <code>[[</code> and a name to link a goal or a habit, for example <code>[[Run a 10k]]</code>.</p></section>
    {/* Session AL (DV-190b, P-DV-124): your entries right after Write, not below every chart */}
    <section className="panel" aria-labelledby="journal-entries"><h2 id="journal-entries">Entries</h2>
      <label className="field"><span>Search your journal</span><input type="search" value={query} onChange={e => setQuery(e.target.value)}/></label>
      {entries.length ? <ol className="journal-entries">{entries.map(e => <li key={e.id}>
        <p className="journal-entry-date">{e.date}</p><p className="journal-entry-text">{e.text}</p>
        {e.followUp && <p className="fine journal-entry-followup">{/* Session AL (DV-190b): a question made on this device, not a chat with an AI */}Question for later: {e.followUp.question}{e.followUp.answer ? <> — <span>{e.followUp.answer}</span></> : null}</p>}
        <button type="button" className="text-link" aria-label={`Remove the entry of ${e.date}`} onClick={() => remove(e)}>Remove</button>
      </li>)}</ol> : query ? <p className="fine">No entry has those words.</p> : <ArtNote pillar="orbit"><p className="fine">No entries yet. Write a few lines above.</p></ArtNote>}
    </section>
    <section className="panel" id="your-scales" aria-labelledby="journal-scales-title"><h2 id="journal-scales-title">Your own scales</h2><LoadBoundary quiet><Suspense fallback={null}><YourScales day={today}/></Suspense></LoadBoundary></section>
    <section className="panel journal-week" aria-labelledby="journal-week-title"><h2 id="journal-week-title">Your week</h2>
      {/* Session AL (DV-190c, P-DV-124): the legend before the strip it explains */}
      <p className="fine journal-week-legend">Top: energy 1–5{healthShown ? ' · below: the day’s mood 1–5' : ''} · a dot means no check-in that day.</p>
      <ol className="journal-week-days" aria-label="This week's check-ins">{week.week.map(d => <li key={d.date} data-empty={d.energy === null && d.mood === null ? '' : undefined}>
        <span className="journal-week-day">{formatWeekday(`${d.date}T12:00:00Z`, {timeZone: 'UTC'})}</span>
        <span className="journal-week-dot" data-level={d.energy ?? undefined}>{d.energy ?? '·'}</span>
        {healthShown && <span className="journal-week-dot is-mood" data-level={d.mood ?? undefined}>{d.mood ?? '·'}</span>}
        <span className="sr-only">{d.date}: {d.energy === null && d.mood === null ? 'no check-in' : [d.energy !== null ? `energy ${d.energy} of 5` : null, d.mood !== null ? `mood ${MOOD_WORDS[d.mood - 1]}` : null].filter(Boolean).join(', ')}</span>
      </li>)}</ol>
      {week.shown ? <ul className="journal-week-lines">{weekLines(week).map(line => <li key={line}>{line}</li>)}</ul> : <p className="fine">The week&rsquo;s averages show once 4 of its days have a check-in ({week.rated} so far).</p>}
      <p className="fine">Counted from your own check-ins on this device; never a judgement and not advice.</p>
    </section>
    <section className="panel" aria-labelledby="journal-energy-title"><h2 id="journal-energy-title">Energy, the last 14 days</h2>
      <ol className="journal-energy-bars" aria-label="Energy per day">{days.map(d => { const v = energy.data.days[d]?.energy; return <li key={d} title={`${d}: ${v ? `${v} of 5, ${ENERGY_WORDS.en[v - 1]}` : 'not rated'}`}><span className="journal-energy-bar" style={{height: `${v ? v * 20 : 4}%`}} data-empty={v ? undefined : ''}/><span className="sr-only">{d}: {v ? `${v} of 5` : 'not rated'}</span></li>; })}</ol>
    </section>
    <OnDemandFold className="year-pixels-fold" summary="Year: one square a day" label="Your year"><YearPixels today={today}/></OnDemandFold>
    {found.length > 0 && <section className="panel" aria-labelledby="journal-patterns"><h2 id="journal-patterns">Patterns</h2><ul>{found.slice(0, 4).map(p => <li key={p.theme}>{patternLine(p, 'en')}</li>)}</ul><p className="fine">Counts from your own entries, never a diagnosis.</p></section>}
    <section className="panel" aria-labelledby="journal-privacy"><h2 id="journal-privacy">Privacy</h2>
      <label className="switch-row"><input type="checkbox" checked={journal.data.followUps} onChange={e => journal.update(c => ({...c, followUps: e.target.checked}))}/> <span>ZIGi asks one question after an entry (made on this device)</span></label>
      <label className="switch-row"><input type="checkbox" checked={journal.data.shareWithAi} onChange={e => journal.update(c => ({...c, shareWithAi: e.target.checked}))}/> <span>Let ZIGi send journal entries to my own AI when I ask about them (off by default)</span></label>
      <LoadBoundary quiet><Suspense fallback={null}><OnThisDaySwitch/></Suspense></LoadBoundary>
      <p className="fine">The journal stays on this device and is in Export everything. Turning sharing off keeps every entry here.</p>
    </section>
  </div>;
}
