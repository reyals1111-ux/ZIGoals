'use client';
import {EmptyState} from './ui/empty-state';
import Link from 'next/link';
import {memo, type ComponentProps} from 'react';
import type {ActivityFeed as Feed} from './activity-feed';
import './activity-product.css';
import {ActivityReport} from './activity/activity-report';
import {useLocalToday} from './use-local-today';
import {emptyFor} from './activity/empty-for';
import {LoadBoundary} from './load-boundary';
import {ChunkFailed, chunk} from './use-chunk';

/**
 * CI14 (page weights; budgets are never raised): Activity's list (activity-feed.tsx, with every record's reader and the
 * remove and undo flows) is a chunk of its own, asked for as soon as a page that shows it loads. Until it is there it
 * stands in exactly as the list first renders, before any record has been read (on the server too): the report with
 * nothing counted yet (on Activity) and the filter's empty view. So the first paint is the same, and the server's HTML is
 * kept as it is while the chunk arrives. Memoised, so a re-render of the page around it changes nothing in the meantime.
 */
// CI19: read through use-chunk rather than lazy()+Suspense, so the list takes over the moment its chunk is here: a
// fallback React has committed is replaced no sooner than 300 ms later, which kept the empty view up over real records.
const useFeed = chunk(() => import('./activity-feed'));
type FeedProps = ComponentProps<typeof Feed>;
const NO_ROWS: never[] = [], NO_HABITS: never[] = [];
function FeedStandIn({category = 'ALL', report = false}: FeedProps) {
  const today = useLocalToday(), e = emptyFor(category);
  return <div className="unified-activity">
    {report && <ActivityReport rows={NO_ROWS} habits={NO_HABITS} today={today}/>}
    <EmptyState className="timeline-empty" zigi="encouraging" title={e.title} action={e.href ? <Link className="text-link" href={e.href}>{e.link}</Link> : undefined}>{e.body}</EmptyState>
  </div>;
}
export const ActivityFeed = memo(function ActivityFeed(props: FeedProps) {
  const {mod, failed} = useFeed();
  return <LoadBoundary label="Your activity">{mod ? <mod.ActivityFeed {...props}/> : failed ? <ChunkFailed what="Your activity"/> : <FeedStandIn {...props}/>}</LoadBoundary>;
});
