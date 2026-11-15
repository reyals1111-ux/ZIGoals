'use client';
import {useMemo} from 'react';
import {LIFE_REVIEW} from '../../../lib/life-review/store';
import {reviewsCard, reviewsRows} from '../../../lib/nova/cards/plan-insights';
import {formatDate} from '../../../lib/visual-format';
import {useDeviceRecord} from '../../ai/use-device-record';
import {useLocalToday} from '../../use-local-today';
import {useWeeklyReview} from '../../weekly-review/use-weekly-review';
import {CardFoot, Fact, type CardProps} from '../cards/kit';
import {HoloReading, HoloTable} from '../holo/parts';
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
  return <div className="nc-body nx-card" data-size={size} data-flat="">
    <div className="nx-main nx-pair" data-fit="rows" data-keep="">
      <p className="nx-readout">
        <span className="nx-readout-label">Weekly review</span>
        <span className="nx-readout-value">{w ? w.stateWords : '—'}</span>
        <span className="nx-readout-sub">{w ? `For the week of ${day(w.weekStart)} to ${day(w.weekEnd)}.` : 'It could not be read on this device.'}</span>
      </p>
      <p className="nx-readout">
        <span className="nx-readout-label">Next review day</span>
        <span className="nx-readout-value">{w ? formatDate(w.nextDay, {weekday: true, year: false}) : '—'}</span>
        <span className="nx-readout-sub">{w ? (w.lastDone ? `Last finished ${day(w.lastDone)}.` : 'None finished yet.') : ''}</span>
      </p>
    </div>
    {size === 'L' && <div className="nc-facts">
      {w && <Fact label="Reviews finished" value={String(w.finished)}/>}
      <Fact label="Life review" value={!l ? 'Not read on this device' : l.period === 'month' ? 'By month' : 'By week'}/>
    </div>}
    {size !== 'S' && l?.focus && <p className="nx-note">Your latest focus: {l.focus.text}</p>}
    {size === 'L' && l && !l.focus && <p className="nx-note">No focus chosen in the Life review yet.</p>}
    <CardFoot source="Your reviews" asOf="today"/>
    <HoloTable caption="Reviews" rows={reviewsRows(card, day)}/>
  </div>;
}
