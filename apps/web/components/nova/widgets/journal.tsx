'use client';
import {useMemo} from 'react';
import {JOURNAL} from '../../../lib/journal/schema';
import {addLocalDays, localDate} from '../../../lib/local-date';
import {journalMonth} from '../../../lib/nova/cards/journal';
import {countText, plural} from '../../../lib/plural';
import {formatDate, formatMonth, formatRelativeDay, formatWeekday} from '../../../lib/visual-format';
import {useDeviceRecord} from '../../ai/use-device-record';
import {CardFoot, CardNotice, Fact, Hero, Lattice, type CardProps} from '../cards/kit';
import {HoloReading, HoloTable, HoloUnread} from '../holo/parts';
import '../cards/life-cards.css';

/**
 * Session AM (ADR-038; art direction §4, Mind: "a month of journal marks"): "Journal" in lilac — the days in a row with an
 * entry and the entries this month as the hero, the current month as a small calendar of the days written (weeks from
 * Monday; a day without an entry is a plain empty cell), and the day of the last entry. It reads the Journal page's own
 * record and only each entry's day (lib/nova/cards/journal.ts): what was written stays on its page.
 * S: the hero. M: the hero beside the month. L: the month larger, with the days written and the last entry.
 * AM-2: Mind is orchid — the month is a lattice of lit glass cells under its day letters, today ringed.
 */
/**
 * Design review AM-D39: a row is a week, so it is named by its ISO week ("W45"), not by a date that reads as one day in a
 * list of days; today's cell carries a ring. `monday` is the row's Monday (the selector's own key).
 */
const DAY_MS = 86_400_000, utc = (date: string) => Date.UTC(+date.slice(0, 4), +date.slice(5, 7) - 1, +date.slice(8, 10));
const dayIndex = (monday: string, day: string) => Math.round((utc(day) - utc(monday)) / DAY_MS);
/** The ISO week of the week that starts on `monday`: the week of the year its Thursday falls in. */
function isoWeek(monday: string): number {
  const thursday = utc(monday) + 3 * DAY_MS;
  return 1 + Math.floor((thursday - Date.UTC(new Date(thursday).getUTCFullYear(), 0, 1)) / (7 * DAY_MS));
}
export default function JournalWidget({size}: {size: CardProps['size']; params?: CardProps['params']}) {
  const journal = useDeviceRecord(JOURNAL), today = localDate();
  const month = useMemo(() => journal.loaded && !journal.unreadable ? journalMonth(journal.data.entries, today) : null, [journal.loaded, journal.unreadable, journal.data, today]);
  if (!journal.loaded) return <HoloReading/>;
  if (journal.unreadable || !month) return <HoloUnread what="Your journal"/>;
  if (!month.total) return <CardNotice kind="empty" ghost="lattice" title="No entries yet" href="/app/journal" action="Write today’s entry">The days you write light up here, a month at a time.</CardNotice>;
  const entries = countText(month.entries, 'entry', 'entries'), monthName = formatMonth(month.month);
  const last = month.lastDate ? formatRelativeDay(month.lastDate, today, {year: month.lastDate.slice(0, 4) !== today.slice(0, 4)}) : null;
  const hero = month.streak > 0
    ? <Hero value={`${month.streak}`} unit={`${plural(month.streak, 'day')} in a row`} label={size === 'S' ? `${month.entries} this month` : `${entries} this month`}/>
    : <Hero value={`${month.entries}`} unit={plural(month.entries, 'entry', 'entries')} label="This month"/>;
  const thisWeek = month.weeks.find(w => { const at = dayIndex(w.key, today); return at >= 0 && at < 7; });
  const calendar = <Lattice columns={Array.from({length: 7}, (_, i) => formatWeekday(addLocalDays(month.firstMonday, i)).slice(0, 1))}
    rows={month.weeks.map(w => { const at = dayIndex(w.key, today); return {key: w.key, label: `W${isoWeek(w.key)}`, cells: w.cells, today: at >= 0 && at < 7 ? at : undefined}; })}/>;
  return <div className="nc-body nc-journal" data-size={size}>
    {size === 'S' ? <div className="nc-row">{hero}{thisWeek && <span className="nc-mini nc-journal-strip" aria-hidden="true">{thisWeek.cells.map((c, i) => <i key={i} data-cell={c} data-today={dayIndex(thisWeek.key, today) === i || undefined}/>)}</span>}</div> : size === 'M' ? <div className="nc-journal-main">
      <div className="nc-journal-side">{hero}{last && <Fact label="Last entry" value={last}/>}</div>
      {calendar}
    </div> : <>
      {hero}
      <p className="nc-journal-month">{monthName}</p>
      {calendar}
      <div className="nc-facts">
        <Fact label="Days written this month" value={`${month.daysWritten}`}/>
        {last && <Fact label="Last entry" value={last}/>}
      </div>
      <p className="nc-journal-key" aria-hidden="true"><span><i data-cell="done"/>A day you wrote</span><span><i data-cell="ahead" data-today=""/>Today</span><span><i data-cell="ahead"/>Not written, or still to come</span></p>
    </>}
    <CardFoot source="Your journal" asOf="today"/>
    <HoloTable caption={`Journal, ${monthName}`} rows={[
      ['Days in a row with an entry', month.streak > 0 ? countText(month.streak, 'day') : 'No streak running'],
      ['Entries this month', `${month.entries}`],
      ['Days written this month', month.weeks.flatMap((w, r) => w.cells.map((c, i) => c === 'done' ? formatDate(addLocalDays(month.weeks[r]!.key, i), {year: false}) : '')).filter(Boolean).join(', ') || 'None yet'],
      ['Last entry', last ?? 'None up to today'],
    ]}/>
  </div>;
}
