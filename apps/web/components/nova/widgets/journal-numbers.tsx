'use client';
import {useMemo} from 'react';
import {JOURNAL} from '../../../lib/journal/schema';
import {localDate} from '../../../lib/local-date';
import {journalNumbersCard, journalNumbersRows} from '../../../lib/nova/cards/life-insights';
import {plural} from '../../../lib/plural';
import {formatNumber} from '../../../lib/visual-format';
import {useDeviceRecord} from '../../ai/use-device-record';
import {CardFoot, CardNotice, Columns, Fact, Hero, type CardProps} from '../cards/kit';
import {HoloReading, HoloTable, HoloUnread} from '../holo/parts';
import '../cards/connect-cards.css';

/**
 * Session AM-2 (step 3, "NOVA connected"; ADR-040 Part 6, journal numbers): "Journal numbers" in orchid — the words
 * written this year, the writing streak and the words of the last six months as columns, with the Journal page's own
 * counts (lib/journal/stats.ts; figures in lib/nova/cards/life-insights.ts). Only counts are read and shown: what was
 * written never leaves its page. A month without an entry is an empty slot, never a zero. It reads under NOVA's Journal
 * permission (security review AM-S2).
 * S: the words. M: with the six months (round 6: the last fourteen days while fewer than three months hold an entry). L: with the longest
 * streak, the entries and the words per entry.
 */
export default function JournalNumbersWidget({size = 'M'}: Partial<CardProps>) {
  const journal = useDeviceRecord(JOURNAL), today = localDate();
  const card = useMemo(() => { if (!journal.loaded || journal.unreadable) return null; try { return journalNumbersCard(journal.data.entries, today); } catch { return null; } }, [journal.loaded, journal.unreadable, journal.data, today]);
  if (!journal.loaded) return <HoloReading/>;
  if (journal.unreadable || !card) return <HoloUnread what="Your journal"/>;
  if (!card.total) return <CardNotice kind="empty" ghost="columns" title="No entries yet" href="/app/journal" action="Write today’s entry">Your words add up here, month by month, with your writing streak.</CardNotice>;
  const n = card.streak.current, streak = n > 0 ? `${formatNumber(n)} ${plural(n, 'day')} in a row${card.streak.writtenToday ? '' : ' · write today to keep it'}` : 'No streak running';
  // Round 6: a journal that is younger than three months draws its last fourteen days (six months of columns were one bar); an older one, its months.
  const byDay = card.months.filter(m => m.words !== null).length < 3;
  const dayRows = byDay ? card.days.map(d => [d.name, d.words === null ? 'No entry' : `${formatNumber(d.words)} ${plural(d.words, 'word')}`] as [string, string]) : [];
  return <div className="nc-body nx-card nx-journal" data-size={size} data-lay="chart" data-by={byDay ? 'day' : 'month'}>
    <div className="nx-top"><Hero value={formatNumber(card.words)} unit={plural(card.words, 'word')} label={size === 'S' ? `In ${card.year}` : `Written in ${card.year}`}>
      {size !== 'S' && <p className="nx-note">{streak}</p>}
    </Hero></div>
    {size !== 'S' && <div className="nx-main">
      {size === 'L' && <p className="nx-cap">{byDay ? 'Words each day · the last 14 days' : 'Words each month'}</p>}
      {byDay ? <Columns values={card.days.map(d => d.words)} labels={card.days.map((d, i) => i % 2 ? d.label : '')} height={size === 'L' ? 110 : 64} mark={card.days.length - 1}/>
        : <Columns values={card.months.map(m => m.words)} labels={card.months.map(m => m.label)} height={size === 'L' ? 110 : 64} mark={card.months.length - 1}/>}
    </div>}
    {size === 'L' && <div className="nc-facts">
      <Fact label="Longest streak" value={`${formatNumber(card.streak.longest)} ${plural(card.streak.longest, 'day')}`}/>
      <Fact label={`Entries in ${card.year}`} value={formatNumber(card.entries)}/>
      <Fact label="Words per entry" value={card.average === null ? 'No entry this year' : `about ${formatNumber(card.average)}`}/>
    </div>}
    <CardFoot source="Your journal" asOf="today"/>
    <HoloTable caption="Journal numbers" rows={[...journalNumbersRows(card), ...dayRows]}/>
  </div>;
}
