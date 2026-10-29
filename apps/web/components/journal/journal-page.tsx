'use client';
import {useMemo, useState} from 'react';
import {formatWeekday} from '../../lib/visual-format';
import {useDeviceRecord} from '../ai/use-device-record';
import {addLocalDays, localDate} from '../../lib/local-date';
import {ENERGY, ENERGY_WORDS} from '../../lib/energy/schema';
import {JOURNAL, type JournalEntry} from '../../lib/journal/schema';
import {patternLine, patterns} from '../../lib/journal/reflect';
import {JournalCompose} from './journal-compose';
import {weekLines, weekPattern} from '../../lib/checkin/week';
import {MOOD_WORDS} from '../../lib/wrap-up/engine';
import {healthGroupIn} from '../../lib/vault/w-homes';
import {isShown} from '../../lib/pages/visibility';
import {useHealth} from '../health/use-health';
import {usePagesView} from '../pages/use-pages-view';
import './journal.css';

/**
 * Session AI (feature 6): the Journal page — write, ZIGi's question, the entries (newest first, delete with Undo), the
 * patterns over the last 14 entries, the last 14 days of energy, and the two privacy switches: ZIGi's questions on or
 * off, and whether ZIGi may send the journal to the person's own AI (off by default). Everything stays on this device.
 */
export function JournalPage({showcase = false}: {showcase?: boolean}) {
  const journal = useDeviceRecord(JOURNAL), energy = useDeviceRecord(ENERGY), today = localDate();
  const [removed, setRemoved] = useState<JournalEntry | null>(null), [query, setQuery] = useState('');
  const entries = useMemo(() => [...journal.data.entries].reverse().filter(e => !query.trim() || e.text.toLowerCase().includes(query.trim().toLowerCase())), [journal.data.entries, query]);
  const found = useMemo(() => patterns(journal.data, energy.data), [journal.data, energy.data]);
  const days = Array.from({length: 14}, (_, i) => addLocalDays(today, i - 13));
  // Session AJ (item 10; COMPANIONS.md P2): this week's check-ins, energy and (while Health shows) the day's mood.
  const health = useHealth(), healthShown = isShown(usePagesView(), 'health');
  const moodDays = useMemo(() => healthShown && health.loaded && !health.error ? Object.fromEntries(Object.entries(healthGroupIn(health.data, 'moods')?.days ?? {}).map(([d, m]) => [d, m.mood])) : {}, [healthShown, health.loaded, health.error, health.data]);
  const week = useMemo(() => weekPattern({energy: Object.fromEntries(Object.entries(energy.data.days).map(([d, v]) => [d, v.energy])), mood: moodDays, today}), [energy.data.days, moodDays, today]);
  const remove = (e: JournalEntry) => { journal.update(c => ({...c, entries: c.entries.filter(x => x.id !== e.id)})); setRemoved(e); };
  const undo = () => { if (removed) journal.update(c => ({...c, entries: [...c.entries, removed].sort((a, b) => a.createdAt.localeCompare(b.createdAt))})); setRemoved(null); };
  if (!journal.loaded) return <p className="fine">Loading your journal…</p>;
  return <div className="journal-page">
    {showcase && <p className="fine">Fictional Showcase entries.</p>}
    {journal.unreadable && <p role="alert">This device&rsquo;s journal could not be read; it is not written over.</p>}
    <section className="panel" aria-labelledby="journal-write"><h2 id="journal-write">Write</h2><JournalCompose/></section>
    <section className="panel journal-week" aria-labelledby="journal-week-title"><h2 id="journal-week-title">Your week</h2>
      <ol className="journal-week-days" aria-label="This week's check-ins">{week.week.map(d => <li key={d.date} data-empty={d.energy === null && d.mood === null ? '' : undefined}>
        <span className="journal-week-day">{formatWeekday(`${d.date}T12:00:00Z`, {timeZone: 'UTC'})}</span>
        <span className="journal-week-dot" data-level={d.energy ?? undefined}>{d.energy ?? '·'}</span>
        {healthShown && <span className="journal-week-dot is-mood" data-level={d.mood ?? undefined}>{d.mood ?? '·'}</span>}
        <span className="sr-only">{d.date}: {d.energy === null && d.mood === null ? 'no check-in' : [d.energy !== null ? `energy ${d.energy} of 5` : null, d.mood !== null ? `mood ${MOOD_WORDS[d.mood - 1]}` : null].filter(Boolean).join(', ')}</span>
      </li>)}</ol>
      <p className="fine journal-week-legend">Top: energy 1–5{healthShown ? ' · below: the day’s mood 1–5' : ''} · a dot means no check-in that day.</p>
      {week.shown ? <ul className="journal-week-lines">{weekLines(week).map(line => <li key={line}>{line}</li>)}</ul> : <p className="fine">The week&rsquo;s averages show once 4 of its days have a check-in ({week.rated} so far).</p>}
      <p className="fine">Counted from your own check-ins on this device; never a judgement and not advice.</p>
    </section>
    <section className="panel" aria-labelledby="journal-energy-title"><h2 id="journal-energy-title">Energy, the last 14 days</h2>
      <ol className="journal-energy-bars" aria-label="Energy per day">{days.map(d => { const v = energy.data.days[d]?.energy; return <li key={d} title={`${d}: ${v ? `${v} of 5, ${ENERGY_WORDS.en[v - 1]}` : 'not rated'}`}><span className="journal-energy-bar" style={{height: `${v ? v * 20 : 4}%`}} data-empty={v ? undefined : ''}/><span className="sr-only">{d}: {v ? `${v} of 5` : 'not rated'}</span></li>; })}</ol>
    </section>
    {found.length > 0 && <section className="panel" aria-labelledby="journal-patterns"><h2 id="journal-patterns">Patterns</h2><ul>{found.slice(0, 4).map(p => <li key={p.theme}>{patternLine(p, 'en')}</li>)}</ul><p className="fine">Counts from your own entries, never a diagnosis.</p></section>}
    <section className="panel" aria-labelledby="journal-entries"><h2 id="journal-entries">Entries</h2>
      <label className="field"><span>Search your journal</span><input type="search" value={query} onChange={e => setQuery(e.target.value)}/></label>
      {removed && <p role="status">Entry removed. <button type="button" className="text-link" onClick={undo}>Undo</button></p>}
      {entries.length ? <ol className="journal-entries">{entries.map(e => <li key={e.id}>
        <p className="journal-entry-date">{e.date}</p><p className="journal-entry-text">{e.text}</p>
        {e.followUp && <p className="fine journal-entry-followup">ZIGi asked: {e.followUp.question}{e.followUp.answer ? <> — <span>{e.followUp.answer}</span></> : null}</p>}
        <button type="button" className="text-link" aria-label={`Remove the entry of ${e.date}`} onClick={() => remove(e)}>Remove</button>
      </li>)}</ol> : <p className="fine">{query ? 'No entry has those words.' : 'No entries yet. Write a few lines above.'}</p>}
    </section>
    <section className="panel" aria-labelledby="journal-privacy"><h2 id="journal-privacy">Privacy</h2>
      <label className="switch-row"><input type="checkbox" checked={journal.data.followUps} onChange={e => journal.update(c => ({...c, followUps: e.target.checked}))}/> <span>ZIGi asks one question after an entry (made on this device)</span></label>
      <label className="switch-row"><input type="checkbox" checked={journal.data.shareWithAi} onChange={e => journal.update(c => ({...c, shareWithAi: e.target.checked}))}/> <span>Let ZIGi send journal entries to my own AI when I ask about them (off by default)</span></label>
      <p className="fine">The journal stays on this device and is in Export everything. Turning sharing off keeps every entry here.</p>
    </section>
  </div>;
}
