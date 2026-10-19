'use client';
import Link from 'next/link';
import {TIMELINE_ROUTE} from '../../lib/af-extras-keys';
import {nextBlocks} from '../../lib/timeline/build';
import {useDayTimeline} from './use-day-timeline';
import {clockLabel} from './timeline-block';
import type {TimelineBlock} from '../../lib/timeline/build';
import './timeline.css';

const row = (b: TimelineBlock, rank: number) => <li key={b.id} data-block="" data-rank={rank} data-kind={b.kind} data-pillar={b.pillar ?? undefined}><span className="today-timeline-time">{clockLabel(b.start!)}</span><strong>{b.title}</strong></li>;

/**
 * The compact Day Timeline (Session AF, L5b): now, the next three blocks, and the door. Nothing written.
 * Critique round 2 (L5c): the rows wear the timeline page's own look — a short rail, a node in each block's pillar colour,
 * and the "Now" pill on its line, placed where now falls among them (a block already under way sits above it).
 */
export default function TodayTimelineBody() {
  const {loaded, day} = useDayTimeline({sources: false});
  const next = day ? nextBlocks(day, 3) : [];
  const nowAt = day ? (i => i < 0 ? next.length : i)(next.findIndex(b => b.start! > day.nowMinute)) : 0;
  const nowRow = day ? <li key="now" className="today-timeline-now-row" data-now=""><span>Now · {clockLabel(day.nowMinute)}</span></li> : null;
  return <>
    <div className="today-timeline-head">
      <p className="eyebrow" id="today-timeline-title">Day timeline</p>
      {day && !next.length && <span className="today-timeline-now">Now · {clockLabel(day.nowMinute)}</span>}
    </div>
    {!loaded || !day ? <div className="today-timeline-skeleton" aria-hidden="true" /> : next.length ? <ol className="today-timeline-next" aria-label="Next on your timeline">{[
      ...next.slice(0, nowAt).map((b, i) => row(b, i)), nowRow, ...next.slice(nowAt).map((b, i) => row(b, nowAt + i)),
    ]}</ol>
      : <p className="today-timeline-line">{day.quiet ? 'A quiet day: nothing is scheduled yet.' : 'Nothing else is scheduled for today.'}</p>}
    <Link className="today-timeline-open text-link" href={TIMELINE_ROUTE}>Open the day timeline →</Link>
  </>;
}
