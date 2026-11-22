'use client';
import Link from 'next/link';
import {Suspense, lazy, useEffect, useMemo, useState} from 'react';
import {formatDate, formatNumber, formatWeekday} from '../../lib/visual-format';
import {useDeviceRecord} from '../ai/use-device-record';
import {addLocalDays, localDate} from '../../lib/local-date';
import {ENERGY, ENERGY_WORDS} from '../../lib/energy/schema';
import {JOURNAL, restoreJournalEntry, type EntryVersion, type JournalEntry} from '../../lib/journal/schema';
import {putBackVersions, removeWithVersions} from '../../lib/journal/versions';
import {showStatus, showUndo} from '../ui/undo-toast';
import {patternLine, patterns} from '../../lib/journal/reflect';
import {wordCount, wordsThisYear, writingStreak} from '../../lib/journal/stats';
import {JournalCompose} from './journal-compose';
import {weekLines, weekPattern} from '../../lib/checkin/week';
import {useMoodLook} from '../mood-look/use-mood-look';
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
// Session AV (follow-up 1, F-JOURNAL-TAGS): tags on entries, and a filter by tag.
import {EntryTags} from './entry-tags';
import {changeEntry, tagCounts, withTag, withoutTag} from '../../lib/journal/tags';
import {JournalFold} from './journal-fold';
import {daysWords, reminderOf, streakNudge} from '../../lib/journal/reminder';
import {bookCounts, bookOf, booksOf, type BookChoice} from '../../lib/journal/books';
import {dateQuery, filterEntries} from '../../lib/journal/search';
import {entriesLinkingTo, hasLinks} from '../../lib/journal/entry-links';

const YearPixels = lazy(() => import('./year-pixels'));
// Session AK (BUILD list 2 #3): "On this day" and its Privacy switch, each loaded on its own after the page.
const OnThisDay = lazy(() => import('./on-this-day'));
const OnThisDaySwitch = lazy(() => import('./on-this-day-switch'));
// Session AV (owner follow-up 1, F-JOURNAL-DAY): that day's own records under an entry (the daily note's strip).
const ThisDayStrip = lazy(() => import('../notes/this-day-strip'));
// Session AK (BUILD list 2 #12, lane G1a): your own 1–5 scales, loaded on its own after the page.
const YourScales = lazy(() => import('../scales/your-scales'));
// Session AV lane 2 (journal; LEDGER #40): the reminder to write, its code loaded when its fold opens.
const JournalReminder = lazy(() => import('./journal-reminder'));
// Session AV lane 2 (journal; LEDGER #43): your journals and the calendar, each loaded when its fold opens.
const JournalBooks = lazy(() => import('./journal-books'));
const JournalCalendar = lazy(() => import('./journal-calendar'));
const EntryMore = lazy(() => import('./entry-more'));
// Session AV lane 2 (journal; LEDGER #35, #42): an entry's [[links]], photos and voice note, each loaded only for an entry that has them.
const EntryRichText = lazy(() => import('./entry-rich-text'));
const EntryMedia = lazy(() => import('./entry-media'));
// Session AV lane 2 (journal; LEDGER #44): Import and export, loaded when its fold opens.
const JournalFiles = lazy(() => import('./journal-files'));
// Session AV lane 2 (bodymind-r2; LEDGER #231, Reflectly): a page that is never saved, loaded when its fold opens.
const WriteItOut = lazy(() => import('./write-it-out'));
// Session AV lane 2 (bodymind-r2; LEDGER #233, Moodnotes): the thought check with thinking traps, loaded when its fold opens.
const ThoughtCheck = lazy(() => import('./thought-check'));
// Session AV lane 2 (r3-notes; LEDGER #265, Grid Diary): every answer to one prompt, loaded when its fold opens.
const PromptAnswers = lazy(() => import('./prompt-answers'));
// Session AV lane 2 (r3-notes; LEDGER #266): a Mandala entry drawn as its 3 × 3 grid.
const EntryGrid = lazy(() => import('./entry-grid'));
const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Session AI (feature 6): the Journal page — write, ZIGi's question, the entries (newest first, delete with Undo), the
 * patterns over the last 14 entries, the last 14 days of energy, and the two privacy switches: ZIGi's questions on or
 * off, and whether ZIGi may send the journal to the person's own AI (off by default). Everything stays on this device.
 */
/** Session AL Part 14 (R18): a day as words ("Mon, Nov 2"), for the energy bars' tooltip and screen-reader text. */
const dayWords = (day: string) => formatDate(day, {weekday: true, year: false});

export function JournalPage({showcase = false}: {showcase?: boolean}) {
  const journal = useDeviceRecord(JOURNAL), energy = useDeviceRecord(ENERGY), today = localDate();
  // Session AV lane 2 (LEDGER #178 follow-up): the week's screen-reader line says the mood in the person's own words.
  const moodWords = useMoodLook().words;
  useUndoShortcut(); // Session AL (P-LS-08): Ctrl/⌘+Z runs the toast's Undo, never in a text field.
  const [query, setQuery] = useState(''), [tag, setTag] = useState<string | null>(null), [dayOpen, setDayOpen] = useState<ReadonlySet<string>>(new Set()), [moreOpen, setMoreOpen] = useState<ReadonlySet<string>>(new Set());
  const tags = useMemo(() => tagCounts(journal.data.entries), [journal.data.entries]);
  const knownTags = useMemo(() => tags.map(t => t.tag), [tags]); // Session AV (1c, q4 #5): offered in the tag fields
  const shownTag = tag && tags.some(t => t.tag.toLowerCase() === tag.toLowerCase()) ? tag : null;
  // Session AV lane 2 (journal; LEDGER #43, Day One): a journal, and a day range (From / To, the calendar, a typed date, or
  // ?day= and ?journal= in the address, which a [[day]] link and NOVA open) beside the words and the tag.
  const [book, setBook] = useState<BookChoice>('all'), [from, setFrom] = useState(''), [to, setTo] = useState('');
  // Session AV lane 2 (r3-notes; LEDGER #265): ?prompt=<template> opens "Every answer to a prompt" on that template (an
  // entry's More offers it).
  const [promptPick, setPromptPick] = useState<string | null>(null);
  useEffect(() => {
    const read = () => { const p = new URLSearchParams(window.location.search), d = p.get('day'), j = p.get('journal'), q = p.get('prompt'); if (d && DAY_RE.test(d)) { setFrom(d); setTo(d); } if (j) setBook(j === 'main' ? 'main' : j);
      if (q && /^[a-z0-9-]{1,40}$/.test(q)) { setPromptPick(q); requestAnimationFrame(() => { const f = document.getElementById('journal-prompt-answers') as HTMLDetailsElement | null; if (f) { f.open = true; f.scrollIntoView({block: 'start'}); } }); } };
    read(); window.addEventListener('popstate', read); return () => window.removeEventListener('popstate', read);
  }, []);
  // Session AV lane 2 (LEDGER #35, #42): photos and voice notes no entry names any more leave this browser after 30 days.
  useEffect(() => {
    if (!journal.loaded || journal.unreadable) return;
    void Promise.all([import('../../lib/journal/media'), import('../../lib/health-aa/photos')]).then(([m, p]) => m.sweepJournalMedia(p.photoScope(), m.namedMedia(journal.data.entries))).catch(() => undefined);
    // Only on arrival: media taken off an entry during this visit can still come back with Undo.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [journal.loaded]);
  const showDay = (d: string) => { setFrom(d); setTo(d); setQuery(''); setTag(null); setBook('all'); try { window.history.pushState(null, '', `/app/journal?day=${d}`); } catch { /* the filter is enough */ } requestAnimationFrame(() => document.getElementById('journal-entries')?.scrollIntoView({block: 'start'})); };
  const linkedFrom = from && from === to ? entriesLinkingTo(journal.data.entries, from) : [];
  const books = booksOf(journal.data), shownBook: BookChoice = book === 'all' || book === 'main' || books.some(b => b.id === book) ? book : 'all';
  const entries = useMemo(() => filterEntries(journal.data, {query, tag: shownTag, book: shownBook, from: from || null, to: to || null}, today), [journal.data, query, shownTag, shownBook, from, to, today]);
  const typedDate = dateQuery(query, today), dated = !!(from || to || typedDate);
  const retag = (id: string, change: (e: JournalEntry) => JournalEntry, said: string) => { try { journal.update(c => changeEntry(c, id, change)); showStatus(said); } catch { showStatus('The tag could not be saved on this device.', {tone: 'error'}); } };
  // Session AL Part 14 (RELEASE_REVIEW R18): an entry's day in words ("Mon, Nov 2, 2026"), never "2026-11-02".
  const entryDays = useMemo(() => new Map(journal.data.entries.map(e => [e.date, {long: formatDate(e.date, {weekday: true}), short: formatDate(e.date)}])), [journal.data.entries]);
  const found = useMemo(() => patterns(journal.data, energy.data), [journal.data, energy.data]);
  // Session AP: words per entry, the writing streak and the words this year, derived from the entries (nothing stored).
  const words = useMemo(() => new Map(journal.data.entries.map(e => [e.id, wordCount(e.text)])), [journal.data.entries]);
  const versionCount = useMemo(() => { const m = new Map<string, number>(); for (const v of journal.data.versions ?? []) m.set(v.entryId, (m.get(v.entryId) ?? 0) + 1); return m; }, [journal.data.versions]);
  const streak = useMemo(() => writingStreak(journal.data.entries, today), [journal.data.entries, today]), year = useMemo(() => wordsThisYear(journal.data.entries, today), [journal.data.entries, today]);
  // Session AL Part 14 (R18): each day with its words ("Mon, Nov 2") for the bars' tooltip and screen-reader text.
  const days = useMemo(() => Array.from({length: 14}, (_, i) => { const d = addLocalDays(today, i - 13); return {d, words: dayWords(d)}; }), [today]);
  // Session AJ (item 10; COMPANIONS.md P2): this week's check-ins, energy and (while Health shows) the day's mood.
  const health = useHealth(), healthShown = isShown(usePagesView(), 'health');
  const moodDays = useMemo(() => healthShown && health.loaded && !health.error ? Object.fromEntries(Object.entries(healthGroupIn(health.data, 'moods')?.days ?? {}).map(([d, m]) => [d, m.mood])) : {}, [healthShown, health.loaded, health.error, health.data]);
  const week = useMemo(() => weekPattern({energy: Object.fromEntries(Object.entries(energy.data.days).map(([d, v]) => [d, v.energy])), mood: moodDays, today}), [energy.data.days, moodDays, today]);
  // Session AL (A7, PRIMITIVES 3e): the one Undo toast; its restore puts the entry back into the latest record.
  const remove = (e: JournalEntry) => {
    // Session AV lane 2 (LEDGER #33): the entry's earlier versions go with it, and come back with its Undo.
    let kept: EntryVersion[] = [];
    try { journal.update(c => { const out = removeWithVersions(c, e.id); kept = out.versions; return out.journal; }); } catch { showStatus('This entry could not be removed on this device.', {tone: 'error'}); return; }
    showUndo({message: `Entry of ${formatDate(e.date)} removed.`, undone: 'The entry is back.', restore: () => journal.update(c => putBackVersions(restoreJournalEntry(c, e), kept))});
  };
  if (!journal.loaded) return <p className="fine">Loading your journal…</p>;
  return <div className="journal-page">
    {showcase && <p className="fine">Fictional Showcase entries.</p>}
    {journal.unreadable && <p role="alert">This device&rsquo;s journal could not be read; it is not written over.</p>}
    <LoadBoundary quiet><Suspense fallback={null}><OnThisDay entries={journal.data.entries} today={today} energy={energy.data.days} moods={moodDays}/></Suspense></LoadBoundary>
    <section className="panel" aria-labelledby="journal-write"><h2 id="journal-write">Write</h2><JournalCompose book={shownBook === 'all' || shownBook === 'main' ? null : shownBook}/>
      {/* Session AK (B2, lane B): the Journal's sibling for longer thoughts — today's note beside what this day holds. */}
      <p className="fine journal-notes-link">Longer thoughts and ideas go in <Link className="text-link" href="/app/notes?day=today">today&rsquo;s note</Link>, beside what this day holds. There, type <code>[[</code> and a name to link a goal or a habit, for example <code>[[Run a 10k]]</code>.</p>
      <JournalFold className="write-it-out-fold" label="Write it out" summary={<>Write it out <span className="fine">· a page that is never saved</span></>}><WriteItOut/></JournalFold>
      <JournalFold className="thought-check-fold" label="the thought check" summary={<>Check a thought <span className="fine">· thinking traps, as self-reflection</span></>}><ThoughtCheck/></JournalFold></section>
    {/* Session AL (DV-190b, P-DV-124): your entries right after Write, not below every chart */}
    <section className="panel" aria-labelledby="journal-entries"><h2 id="journal-entries">Entries</h2>
      {journal.data.entries.length > 0 && <dl className="journal-stats" aria-label="Your writing">
        <div><dt>Writing streak</dt><dd>{streak.current === 1 ? '1 day' : `${formatNumber(streak.current)} days`}{!streak.writtenToday && streak.current > 0 ? ' · write today to keep it' : ''}</dd></div>
        <div><dt>Longest streak</dt><dd>{streak.longest === 1 ? '1 day' : `${formatNumber(streak.longest)} days`}</dd></div>
        <div><dt>Words in {today.slice(0, 4)}</dt><dd>{formatNumber(year.words)} <small>in {year.entries === 1 ? '1 entry' : `${formatNumber(year.entries)} entries`}</small></dd></div>
      </dl>}
      {/* Session AV lane 2 (journal; LEDGER #40, Day One's reminders and streaks): what today does to the streak, and the reminder to write. */}
      {journal.data.entries.length > 0 && <p className="fine journal-streak-nudge">{streakNudge(journal.data.entries, today)}</p>}
      <JournalFold id="journal-reminder" className="journal-reminder-fold" label="the reminder" summary={<>Reminder to write <span className="fine">· {reminderOf(journal.data).on ? `${reminderOf(journal.data).time}, ${daysWords(reminderOf(journal.data).days)}` : 'off'}</span></>}><JournalReminder/></JournalFold>
      {books.length > 0 && <div className="journal-book-filter" role="group" aria-label="Show a journal">
        <button type="button" className="quiet" aria-pressed={shownBook === 'all'} onClick={() => setBook('all')}>Every journal</button>
        {bookCounts(journal.data).map(b => <button key={b.id ?? 'main'} type="button" className="quiet" aria-pressed={shownBook === (b.id ?? 'main')} onClick={() => setBook(b.id ?? 'main')}><span className="journal-book-dot" data-tone={b.theme} aria-hidden="true"/>{b.name} <small>{b.count}</small></button>)}
      </div>}
      <label className="field"><span>Search your journal</span><input type="search" value={query} onChange={e => setQuery(e.target.value)} aria-describedby="journal-search-hint"/><small id="journal-search-hint" className="fine">Words, a #tag, or a date such as 3 nov or 2026-11.</small></label>
      <JournalFold className="journal-date-fold" label="the calendar" open={!!(from || to)} summary={<>Search by date{from || to ? <span className="fine"> · {from && from === to ? formatDate(from) : `${from ? formatDate(from) : '…'} – ${to ? formatDate(to) : '…'}`}</span> : null}</>}>
        <div className="journal-date-range" role="group" aria-label="Day range">
          <label className="field"><span>From</span><input type="date" value={from} max={to || today} onChange={e => setFrom(e.target.value)}/></label>
          <label className="field"><span>To</span><input type="date" value={to} min={from || undefined} max={today} onChange={e => setTo(e.target.value)}/></label>
          {(from || to) && <button type="button" className="quiet" onClick={() => { setFrom(''); setTo(''); }}>Clear the dates</button>}
        </div>
        <JournalCalendar entries={journal.data.entries} today={today} picked={from && from === to ? from : null} onPick={d => { setFrom(d ?? ''); setTo(d ?? ''); }}/>
      </JournalFold>
      {(() => { const n = new Set(journal.data.entries.flatMap(e => e.template ? [e.template] : [])).size; return <JournalFold id="journal-prompt-answers" className="journal-prompt-answers-fold" label="every answer to a prompt" open={!!promptPick} summary={<>Every answer to a prompt <span className="fine">· {n ? `${n === 1 ? '1 prompt' : `${n} prompts`} written from` : 'what you wrote under each heading'}</span></>}><PromptAnswers journal={journal.data} picked={promptPick} onDay={showDay}/></JournalFold>; })()}
      {tags.length > 0 && <div className="journal-tag-filter" role="group" aria-label="Filter by tag">
        <button type="button" className="quiet" aria-pressed={!shownTag} onClick={() => setTag(null)}>All entries</button>
        {tags.map(t => <button key={t.tag} type="button" className="quiet" aria-pressed={shownTag?.toLowerCase() === t.tag.toLowerCase()} onClick={() => setTag(t.tag)}>#{t.tag} <small>{t.count}</small></button>)}
      </div>}
      {linkedFrom.length > 0 && <p className="fine journal-linked-from">Linked from {linkedFrom.slice(0, 5).map((x, i) => <span key={x.id}>{i ? ', ' : ''}<a className="text-link" href={`/app/journal?day=${x.date}`} onClick={ev => { ev.preventDefault(); showDay(x.date); }}>{formatDate(x.date)}</a></span>)}.</p>}
      {entries.length ? <ol className="journal-entries">{entries.map(e => { const inBook = bookOf(journal.data, e); return <li key={e.id} data-tone={inBook?.theme}>
        <p className="journal-entry-date"><time dateTime={e.date}>{entryDays.get(e.date)?.long ?? e.date}</time>{inBook && <span className="journal-entry-book"> · <span className="journal-book-dot" data-tone={inBook.theme} aria-hidden="true"/>{inBook.name}</span>}</p>{e.template === 'mandala' ? <Suspense fallback={<p className="journal-entry-text">{e.text}</p>}><EntryGrid entry={e}/></Suspense> : hasLinks(e.text) ? <Suspense fallback={<p className="journal-entry-text">{e.text}</p>}><EntryRichText text={e.text} onDay={showDay}/></Suspense> : <p className="journal-entry-text">{e.text}</p>}
        {(e.photos?.length || e.audio?.length) ? <LoadBoundary quiet><Suspense fallback={null}><EntryMedia entry={e} day={entryDays.get(e.date)?.short ?? e.date}/></Suspense></LoadBoundary> : null}
        <p className="fine journal-entry-words">{words.get(e.id) === 1 ? '1 word' : `${formatNumber(words.get(e.id) ?? 0)} words`}{e.updatedAt ? ' · changed' : ''}{versionCount.get(e.id) ? ` · ${versionCount.get(e.id) === 1 ? '1 earlier version' : `${versionCount.get(e.id)} earlier versions`} under More` : ''}</p>
        {e.followUp && <p className="fine journal-entry-followup">{/* Session AL (DV-190b): a question made on this device, not a chat with an AI */}Question for later: {e.followUp.question}{e.followUp.answer ? <> — <span>{e.followUp.answer}</span></> : null}</p>}
        {/* Session AV (1c, q4 #34): the entry's three controls (tags, That day, Remove) share one row. */}
        <div className="journal-entry-controls">
        <EntryTags tags={e.tags ?? []} day={entryDays.get(e.date)?.short ?? e.date} known={knownTags} onAdd={t => retag(e.id, x => withTag(x, t), `Tagged #${t}.`)} onRemove={t => retag(e.id, x => withoutTag(x, t), `The tag #${t} is off this entry.`)}/>
        {/* Session AV (owner follow-up 1, F-JOURNAL-DAY; Day One's metadata): that day's own records, as links, on the press. */}
        <details className="journal-that-day" onToggle={ev => { const open = (ev.currentTarget as HTMLDetailsElement).open; setDayOpen(d => { const n = new Set(d); if (open) n.add(e.id); else n.delete(e.id); return n; }); }}><summary>That day</summary>{dayOpen.has(e.id) && <Suspense fallback={<p className="fine">Reading that day…</p>}><ThisDayStrip day={e.date} exclude={['journal']} title={`On ${entryDays.get(e.date)?.short ?? e.date}`}/></Suspense>}</details>
        {/* Session AV lane 2 (journal): the less frequent things — move, edit, earlier versions, save as a template — behind one "More". */}
        <details className="journal-entry-more" onToggle={ev => { const open = (ev.currentTarget as HTMLDetailsElement).open; setMoreOpen(d => { const n = new Set(d); if (open) n.add(e.id); else n.delete(e.id); return n; }); }}><summary aria-label={`More for the entry of ${entryDays.get(e.date)?.short ?? e.date}`}>More</summary>{moreOpen.has(e.id) && <LoadBoundary quiet><Suspense fallback={<p className="fine">Opening…</p>}><EntryMore entry={e} day={entryDays.get(e.date)?.short ?? e.date}/></Suspense></LoadBoundary>}</details>
        <button type="button" className="text-link journal-entry-remove" aria-label={`Remove the entry of ${entryDays.get(e.date)?.short ?? e.date}`} onClick={() => remove(e)}>Remove</button>
        </div>
      </li>; })}</ol> : dated && !query.trim() || typedDate ? <p className="fine">No entry on {from && from === to ? formatDate(from) : typedDate && typedDate.from === typedDate.to ? formatDate(typedDate.from) : 'those days'}{shownTag ? ` with the tag #${shownTag}` : ''}. The calendar under &ldquo;Search by date&rdquo; marks the days you wrote.</p>
        : query || shownTag || shownBook !== 'all' ? <p className="fine">{shownTag && !query ? `No entry has the tag #${shownTag}.` : query ? 'No entry has those words.' : 'No entry in this journal yet. Choose it when you write, or move an entry into it.'}</p> : <ArtNote pillar="orbit"><p className="fine">No entries yet. Write a few lines above.</p></ArtNote>}
      {/* Session AV lane 2 (journal; LEDGER #43, Day One's journals and themes): make, rename, colour and remove journals. */}
      <JournalFold className="journal-books-fold" label="your journals" summary={<>Your journals <span className="fine">· {books.length ? `${books.length + 1} journals` : 'one journal'}</span></>}><JournalBooks onMade={id => setBook(id)}/></JournalFold>
    </section>
    <section className="panel" id="your-scales" aria-labelledby="journal-scales-title"><h2 id="journal-scales-title">Your own scales</h2><LoadBoundary quiet><Suspense fallback={null}><YourScales day={today}/></Suspense></LoadBoundary></section>
    <section className="panel journal-week" aria-labelledby="journal-week-title"><h2 id="journal-week-title">Your week</h2>
      {/* Session AL (DV-190c, P-DV-124): the legend before the strip it explains */}
      <p className="fine journal-week-legend">Top: energy 1–5{healthShown ? ' · below: the day’s mood 1–5' : ''} · a dot means no check-in that day.</p>
      <ol className="journal-week-days" aria-label="This week's check-ins">{week.week.map(d => <li key={d.date} data-empty={d.energy === null && d.mood === null ? '' : undefined}>
        <span className="journal-week-day">{formatWeekday(`${d.date}T12:00:00Z`, {timeZone: 'UTC'})}</span>
        <span className="journal-week-dot" data-level={d.energy ?? undefined}>{d.energy ?? '·'}</span>
        {healthShown && <span className="journal-week-dot is-mood" data-level={d.mood ?? undefined}>{d.mood ?? '·'}</span>}
        <span className="sr-only">{/* Session AL fourth pass (DV-190c): a day a screen reader says as words, not "2026-11-02" */}{formatDate(d.date, {weekday: true, year: false})}: {d.energy === null && d.mood === null ? 'no check-in' : [d.energy !== null ? `energy ${d.energy} of 5` : null, d.mood !== null ? `mood ${moodWords[d.mood - 1]}` : null].filter(Boolean).join(', ')}</span>
      </li>)}</ol>
      {week.shown ? <ul className="journal-week-lines">{weekLines(week).map(line => <li key={line}>{line}</li>)}</ul> : <p className="fine">The week&rsquo;s averages show once 4 of its days have a check-in ({week.rated} so far).</p>}
      <p className="fine">Counted from your own check-ins on this device; never a judgement and not advice.</p>
    </section>
    <section className="panel" aria-labelledby="journal-energy-title"><h2 id="journal-energy-title">Energy, the last 14 days</h2>
      <ol className="journal-energy-bars" aria-label="Energy per day">{days.map(({d, words}) => { const v = energy.data.days[d]?.energy; return <li key={d} title={`${words}: ${v ? `${v} of 5, ${ENERGY_WORDS.en[v - 1]}` : 'not rated'}`}><span className="journal-energy-bar" style={{height: `${v ? v * 20 : 4}%`}} data-empty={v ? undefined : ''}/><span className="sr-only">{words}: {v ? `${v} of 5` : 'not rated'}</span></li>; })}</ol>
    </section>
    <OnDemandFold className="year-pixels-fold" summary="Year: one square a day" label="Your year"><YearPixels today={today}/></OnDemandFold>
    {found.length > 0 && <section className="panel" aria-labelledby="journal-patterns"><h2 id="journal-patterns">Patterns</h2><ul>{found.slice(0, 4).map(p => <li key={p.theme}>{patternLine(p, 'en')}</li>)}</ul><p className="fine">Counts from your own entries, never a diagnosis.</p></section>}
    {/* Session AV lane 2 (journal; LEDGER #44, Day One's imports): bring entries in, or take the whole journal out with its photos. */}
    <section className="panel" aria-labelledby="journal-files-title"><h2 id="journal-files-title">Import and export</h2>
      <JournalFold className="journal-files-fold" label="import and export" summary={<>Day One, Markdown, text or Apple Journal <span className="fine">· or your journal as a ZIP</span></>}><JournalFiles/></JournalFold>
    </section>
    <section className="panel" aria-labelledby="journal-privacy"><h2 id="journal-privacy">Privacy</h2>
      <label className="switch-row"><input type="checkbox" checked={journal.data.followUps} onChange={e => journal.update(c => ({...c, followUps: e.target.checked}))}/> <span>ZIGi asks one question after an entry (made on this device)</span></label>
      <label className="switch-row"><input type="checkbox" checked={journal.data.shareWithAi} onChange={e => journal.update(c => ({...c, shareWithAi: e.target.checked}))}/> <span>Let ZIGi send journal entries to my own AI when I ask about them (off by default)</span></label>
      <LoadBoundary quiet><Suspense fallback={null}><OnThisDaySwitch/></Suspense></LoadBoundary>
      {/* Session AV (1c, q4 #33, owner decision: the smaller suggestion): off by default; Today shows counts only unless chosen. */}
      <label className="switch-row"><input type="checkbox" checked={journal.data.todayLines === true} onChange={e => journal.update(c => ({...c, todayLines: e.target.checked}))}/> <span>Show the first line of today&rsquo;s entries and memories on Today (off: Today shows counts only)</span></label>
      {/* Session AV lane 2 (journal; LEDGER #176, Fabulous): one affirmation a day on Today's journal card, off by default. */}
      <label className="switch-row"><input type="checkbox" checked={journal.data.affirmations === true} onChange={e => journal.update(c => ({...c, affirmations: e.target.checked}))}/> <span>Show a daily affirmation on Today, in the question&rsquo;s language (off by default)</span></label>
      {/* Session AV lane 2 (bodymind-r2; LEDGER #230, Reflectly): a small daily challenge beside it, off by default, never counted. */}
      <label className="switch-row"><input type="checkbox" checked={journal.data.challenges === true} onChange={e => journal.update(c => ({...c, challenges: e.target.checked}))}/> <span>Show a small daily challenge on Today, with Done and Another one (off by default; nothing is counted)</span></label>
      <p className="fine">The journal stays on this device and is in Export everything. Turning sharing off keeps every entry here.</p>
    </section>
  </div>;
}
