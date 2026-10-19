'use client';
import Link from 'next/link';
import {useMemo} from 'react';
import {useDeviceRecord} from '../ai/use-device-record';
import type {LayoutAttrs} from '../layout-edit';
import type {HabitData} from '../../lib/habits';
import type {HealthData} from '../../lib/health';
import type {Platform} from '../../lib/positions';
import {STORIES_ROUTE} from '../../lib/af-extras-keys';
import {STORIES} from '../../lib/stories/store';
import {storiesDoor, type StoriesDoor} from '../../lib/stories/door';
import {formatNumber} from '../../lib/visual-format';
import './today-stories-card.css';

/**
 * Today's Stories door (Session AF, L5b; P9.3, ADR-028 H29), exported for the lead to mount — a For you card, added only
 * while it shows (`useTodayStoriesCard(...).state === 'shown'`): the week's story is ready (three logged days in the last
 * seven) and not opened this week. The hook takes the records Today already holds, so it reads only Stories' own small
 * record; neither it nor the card writes anything. One DOM root, one short block on a phone.
 */
export function useTodayStoriesCard({habits, health, platform, today}: {habits: HabitData | null; health: HealthData | null; platform: Platform | null; today: string}): StoriesDoor {
  const record = useDeviceRecord(STORIES);
  return useMemo(() => storiesDoor({records: habits && health && platform && record.loaded ? {habits, health, platform, today} : null, stories: record.loaded ? record.data : null, unreadable: record.unreadable}), [habits, health, platform, today, record.loaded, record.data, record.unreadable]);
}
export function TodayStoriesCard({loggedDays, ...layout}: Partial<LayoutAttrs> & {loggedDays: number}) {
  return <section {...layout} className="panel today-stories-card" aria-labelledby="today-stories-title">
    <span className="today-stories-mark" aria-hidden="true"><i /><i /><i /></span>
    <div className="today-stories-body">
      <p className="eyebrow">Stories</p>
      <h2 id="today-stories-title">Your week’s story is ready</h2>
      <p className="today-stories-line">{formatNumber(loggedDays)} logged days, told in a few cards you can share.</p>
      <Link className="today-stories-open text-link" href={STORIES_ROUTE}>Open your stories →</Link>
    </div>
  </section>;
}
export default TodayStoriesCard;
