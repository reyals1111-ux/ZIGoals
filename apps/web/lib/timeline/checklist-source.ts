import {readDeviceRecord} from '../device-record';
import {getAppStorage} from '../showcase-storage';
import {CHECKLIST, CHECKLIST_DAYS} from '../checklist/schema';
import {todayOf} from '../checklist/day';
import {deriveDots, type DeriveSources} from '../checklist/derive';
import type {TimelineBand, TimelineSource, TimelineSourceItem} from './sources';

/**
 * The Checklist's dots on the Day Timeline (Session AF, L5b with L3's records; P9.2 "links to the Checklist"): the source
 * the Checklist registers (components/checklist/checklist-launcher.tsx). It reads the Checklist's own two records and
 * derives today's dots with the Checklist's own `deriveDots`, exactly as the Checklist shows them; it never seals a day or
 * writes a receipt (a read only: viewing the timeline writes nothing). Each dot sits in its orbit's part of the day
 * (Morning, Afternoon, Evening; any other orbit on the Anytime shelf), and opens the Checklist. A dot that is a habit marks
 * that habit's own block instead of adding a second one.
 */
const BANDS: readonly string[] = ['morning', 'afternoon', 'evening', 'anytime'];
const PILLAR: Record<string, TimelineSourceItem['pillar']> = {habit: 'habits', goal: 'goals', 'goal-step': 'goals', health: 'health', custom: null};
export const checklistTimelineSource: TimelineSource = ({date, now, stores}) => {
  const storage = getAppStorage(), record = readDeviceRecord(storage, CHECKLIST), days = readDeviceRecord(storage, CHECKLIST_DAYS);
  if (record.unreadable || days.unreadable || !record.data.order.length) return [];
  const sources = {...(stores as Omit<DeriveSources, 'now'>), now} as DeriveSources;
  if (!sources.habits || !sources.zone) return [];
  return deriveDots(record.data, todayOf(days.data, date), date, sources).filter(dot => dot.counted && !dot.missing).map((dot): TimelineSourceItem => {
    const ref = dot.item.ref as {habitId?: unknown} | undefined, habitId = dot.kind === 'habit' && typeof ref?.habitId === 'string' ? ref.habitId : undefined;
    return {id: dot.id, title: dot.label, done: dot.state === 'done', href: '/app/checklist', band: (BANDS.includes(dot.section) ? dot.section : 'anytime') as TimelineBand, pillar: PILLAR[dot.kind] ?? null, label: 'Checklist', ...(habitId ? {habitId} : {})};
  });
};
export default checklistTimelineSource;
