'use client';
import Link from 'next/link';
import {useMemo} from 'react';
import {useDeviceRecord} from '../ai/use-device-record';
import {useHabits} from '../habits/use-habits';
import {useHealth} from '../health/use-health';
import {usePlatform} from '../platform/use-platform';
import {usePagesView} from '../pages/use-pages-view';
import {PillarMark} from '../pillars';
import {isShown} from '../../lib/pages/visibility';
import {WORKOUTS} from '../../lib/workouts/schema';
import {MONEY_LOG} from '../../lib/money-log/schema';
import {JOURNAL} from '../../lib/journal/schema';
import {PILLAR_LABEL, thisDay, type DayPillar} from '../../lib/notes/this-day';
import {localDate} from '../../lib/local-date';

/**
 * Session AK (B2): "This day" above a daily note — that day's habits, Health logs, workouts, money entries, goal
 * contributions and journal entries, each a link to where it lives (nothing is copied into the note). A pillar the person
 * hid in Settings → Your pages stays out. A record that could not be read says so (unknown is not zero). Loaded with the
 * daily note, on its own chunk.
 */
const MARK: Partial<Record<DayPillar, 'goals' | 'habits' | 'health' | 'wealth'>> = {habits: 'habits', health: 'health', wealth: 'wealth', goals: 'goals'};
export default function ThisDayStrip({day}: {day: string}) {
  const view = usePagesView(), habits = useHabits(), health = useHealth(), platform = usePlatform();
  const workouts = useDeviceRecord(WORKOUTS), money = useDeviceRecord(MONEY_LOG), journal = useDeviceRecord(JOURNAL);
  const loaded = habits.loaded && health.loaded && platform.loaded && workouts.loaded && money.loaded && journal.loaded;
  const shown = (id: 'habits' | 'health' | 'wealth' | 'goals') => isShown(view, id);
  const {items, unread} = useMemo(() => loaded ? thisDay({
    day, today: localDate(),
    habits: !shown('habits') ? undefined : habits.error ? null : habits.data,
    health: !shown('health') ? undefined : health.error ? null : health.data,
    workouts: !shown('health') ? undefined : workouts.unreadable ? null : workouts.data,
    money: !shown('wealth') ? undefined : money.unreadable ? null : money.data,
    platform: !shown('goals') ? undefined : platform.error ? null : platform.data,
    journal: journal.unreadable ? null : journal.data,
  }) : {items: [], unread: [] as DayPillar[]},
  // eslint-disable-next-line react-hooks/exhaustive-deps -- `shown` reads `view`, listed here
  [loaded, day, view, habits.error, habits.data, health.error, health.data, workouts.unreadable, workouts.data, money.unreadable, money.data, platform.error, platform.data, journal.unreadable, journal.data]);
  return <section className="note-this-day" aria-labelledby={`this-day-${day}`}>
    <h3 id={`this-day-${day}`} className="note-this-day-title">This day</h3>
    {!loaded ? <p className="fine">Reading this day…</p> : items.length ? <ul className="note-this-day-list">
      {items.map(item => <li key={item.id}><Link href={item.href} className="note-day-chip" data-pillar={MARK[item.pillar]}>
        {MARK[item.pillar] ? <PillarMark pillar={MARK[item.pillar]!} size={14}/> : <span className="note-day-dot" aria-hidden="true"/>}
        <span className="note-day-chip-title">{item.title}</span>{item.detail && <span className="note-day-chip-detail">{item.detail}</span>}
        <span className="sr-only"> · {PILLAR_LABEL[item.pillar]}</span>
      </Link></li>)}
    </ul> : <p className="fine">Nothing logged on this day yet. Habits you check in, meals, workouts, money entries and contributions show here as links — never copied into the note.</p>}
    {unread.length > 0 && <p className="fine" role="note">{unread.map(p => PILLAR_LABEL[p]).join(', ')} could not be read on this device, so {unread.length === 1 ? 'it is' : 'they are'} not shown — not counted as nothing.</p>}
  </section>;
}
