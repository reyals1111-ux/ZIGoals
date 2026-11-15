'use client';
import {useMemo} from 'react';
import {LIFE_REVIEW} from '../../../lib/life-review/store';
import {reviewsCard, reviewsRows} from '../../../lib/nova/cards/plan-insights';
import {formatDate} from '../../../lib/visual-format';
import {useDeviceRecord} from '../../ai/use-device-record';
import {useLocalToday} from '../../use-local-today';
import {useWeeklyReview} from '../../weekly-review/use-weekly-review';
import {CardFoot, type CardProps} from '../cards/kit';
import {HoloReading, HoloTable} from '../holo/parts';
import {NxDial, NxHead} from './nx-parts';
import {NxRows, dayInWeek} from './nx-rows';
import '../cards/connect-cards.css';

/**
 * Session AM-2 (step 3, round 2): "Reviews" in ice — the weekly review's state for the week it looks back on (due,
 * started, done or skipped), the next review day, the last one finished, and the latest focus the person chose in the
 * Life review (lib/weekly-review/window.ts, lib/life-review/store.ts; figures in lib/nova/cards/plan-insights.ts). The
 * numbers of a week are never stored, only the person's own words; the focus is shown on the screen and is not part of
 * NOVA's answer. Read only: a review is written on its own page.
 */
export default function ReviewsWidget({size = 'M'}: Partial<CardProps>) {
  const weekly = useWeeklyReview(), life = useDeviceRecord(LIFE_REVIEW), today = useLocalToday();
  const card = useMemo(() => reviewsCard(weekly.unreadable ? null : weekly.data, life.unreadable ? null : life.data, today), [weekly.unreadable, weekly.data, life.unreadable, life.data, today]);
  if (!weekly.loaded || !life.loaded) return <HoloReading/>;
  const w = card.weekly, l = card.life, day = (date: string) => formatDate(date, {year: date.slice(0, 4) !== today.slice(0, 4)});
  const left = w ? Math.max(0, dayInWeek(today, w.nextDay)) : null, open = !!w && (w.state === 'due' || w.state === 'draft');
  const next = w ? formatDate(w.nextDay, {weekday: true, year: false}) : null;
  return <div className="nc-body nx-card" data-size={size} data-lay="dial">
    {/* A countdown ring: full while this week's review is open, otherwise filling as the next review day nears. */}
    <NxDial share={!w ? null : open ? 1 : left === null ? null : Math.max(0, 1 - left / 7)} figure={!w ? '—' : open ? 'Now' : String(left)} caption={!w || open ? null : left === 1 ? 'day' : 'days'} ticks={28} spin={size === 'L'}/>
    <NxHead label="Weekly review" title={!w ? 'Not read on this device' : open ? `${w.stateWords} · week of ${day(w.weekStart)}` : `${w.stateWords} · next ${next}`} note={w ? (w.lastDone ? `Last finished ${day(w.lastDone)}` : 'None finished yet') : null}/>
    {size !== 'S' && <div className="nx-main" data-fit="rows" data-wr-limit="">
      <NxRows label="Your reviews" min={0} rows={[
        ...(w ? [{key: 'window', name: 'This review covers', value: `${day(w.weekStart)} – ${day(w.weekEnd)}`}] : []),
        ...(w && open ? [{key: 'next', name: 'Next review day', value: next}] : []),
        ...(w ? [{key: 'done', name: 'Reviews finished', value: String(w.finished)}] : []),
        {key: 'life', name: 'Life review', value: !l ? 'Not read' : l.period === 'month' ? 'By month' : 'By week', sub: l?.focus ? `Your latest focus: ${l.focus.text}` : l ? 'No focus chosen yet' : null},
      ]}/>
    </div>}
    <CardFoot source="Your reviews" asOf="today"/>
    <HoloTable caption="Reviews" rows={reviewsRows(card, day)}/>
  </div>;
}
