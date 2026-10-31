'use client';
import {Suspense, lazy, useCallback, useMemo, useRef, useState} from 'react';
import {useDeviceRecord} from '../ai/use-device-record';
import {LoadBoundary} from '../load-boundary';
import {ActionIntent} from '../action-intent';
import {useHabits} from '../habits/use-habits';
import {useHealth} from '../health/use-health';
import {usePlatform} from '../platform/use-platform';
import type {LayoutAttrs} from '../layout-edit';
import type {HabitData} from '../../lib/habits';
import type {HealthData} from '../../lib/health';
import type {Platform} from '../../lib/positions';
import {isShowcase} from '../../lib/showcase';
import {WRAPPED} from '../../lib/wrapped/store';
import {wrappedDoor, type WrappedDoor} from '../../lib/wrapped/door';
import {formatNumber} from '../../lib/visual-format';
import './wrapped.css';

/**
 * ZIGoals Wrapped's doors (Session AK, F5d), exported for the lead to mount; each shows only while Wrapped is available
 * (lib/wrapped/door.ts: from 1 December, or with 30 logged days this year; always, labelled Example, in the Showcase):
 * - `useTodayWrappedCard(records)` + `<TodayWrappedCard/>`: a For you card on Today, until this year's Wrapped is opened.
 *   The hook takes the records Today already holds and reads only Wrapped's own small record.
 * - `<JourneyWrappedLink/>`: one line on Journey while available.
 * Both open the story over the page, loaded on the tap (wrapped-story.tsx), and both answer `?wrapped=open` (Search's
 * "Open ZIGoals Wrapped" action). Deciding writes nothing; opening writes the day it was opened.
 */
const WrappedStory = lazy(() => import('./wrapped-story'));
export const WRAPPED_INTENT = {param: 'wrapped', value: 'open'} as const;
function useOpener() {
  const [open, setOpen] = useState(false), opener = useRef<HTMLButtonElement>(null);
  const close = useCallback(() => { setOpen(false); queueMicrotask(() => opener.current?.focus()); }, []);
  const story = open ? <LoadBoundary quiet><Suspense fallback={null}><WrappedStory onClose={close} /></Suspense></LoadBoundary> : null;
  return {opener, story, show: () => setOpen(true), prefetch: () => void import('./wrapped-story').catch(() => undefined)};
}

export function useTodayWrappedCard({habits, health, platform, today}: {habits: HabitData | null; health: HealthData | null; platform: Platform | null; today: string}): WrappedDoor {
  const record = useDeviceRecord(WRAPPED);
  return useMemo(() => wrappedDoor({today, records: habits && health && platform && record.loaded ? {habits, health, platform, today} : null, record: record.loaded ? (record.unreadable ? {version: 1} : record.data) : null, showcase: record.loaded && isShowcase()}), [habits, health, platform, today, record.loaded, record.unreadable, record.data]);
}
export function TodayWrappedCard({door, ...layout}: Partial<LayoutAttrs> & {door: WrappedDoor}) {
  const {opener, story, show, prefetch} = useOpener(), example = isShowcase();
  return <section {...layout} className="panel today-wrapped-card" aria-labelledby="today-wrapped-title">
    <ActionIntent param={WRAPPED_INTENT.param} value={WRAPPED_INTENT.value} onAction={show} />
    <p className="eyebrow">{example ? 'Example · ' : ''}ZIGoals Wrapped {door.year}</p>
    <h2 id="today-wrapped-title">{door.season ? `Your ${door.year}, wrapped` : `Your ${door.year} so far, wrapped`}</h2>
    <p>{formatNumber(door.loggedDays)} logged days, told in a few cards you step through. Made on this device.</p>
    <button ref={opener} type="button" className="primary" onPointerEnter={prefetch} onClick={show}>Open Wrapped</button>
    {story}
  </section>;
}
/** Journey's line: reads the records through their own hooks (Journey does not hold them). */
export function JourneyWrappedLink() {
  const habits = useHabits(), health = useHealth(), platform = usePlatform();
  const door = useTodayWrappedCard({habits: habits.loaded && !habits.error ? habits.data : null, health: health.loaded && !health.error ? health.data : null, platform: platform.loaded && !platform.error ? platform.data : null, today: habits.today});
  const {opener, story, show, prefetch} = useOpener();
  return <>
    <ActionIntent param={WRAPPED_INTENT.param} value={WRAPPED_INTENT.value} ready={door.state !== 'loading'} onAction={show} />
    {door.state === 'shown' && <button ref={opener} type="button" className="text-link wrapped-link" onPointerEnter={prefetch} onClick={show}>{isShowcase() ? 'Example · ' : ''}ZIGoals Wrapped {door.year}: your year in a few cards →</button>}
    {story}
  </>;
}
