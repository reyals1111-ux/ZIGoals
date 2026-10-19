'use client';
import Link from 'next/link';
import {TIMELINE_ROUTE} from '../../lib/af-extras-keys';
import {nextBlocks} from '../../lib/timeline/build';
import {useDayTimeline} from './use-day-timeline';
import {clockLabel} from './timeline-block';
import './timeline.css';

/** The compact Day Timeline (Session AF, L5b): now, the next three blocks, and the door. Nothing written. */
export default function TodayTimelineBody() {
  const {loaded, day} = useDayTimeline({sources: false});
  const next = day ? nextBlocks(day, 3) : [];
  return <>
    <div className="today-timeline-head">
      <p className="eyebrow" id="today-timeline-title">Your day</p>
      {day && <span className="today-timeline-now">Now · {clockLabel(day.nowMinute)}</span>}
    </div>
    {!loaded || !day ? <div className="today-timeline-skeleton" aria-hidden="true" /> : next.length ? <ol className="today-timeline-next" aria-label="Next on your timeline">{next.map(b => <li key={b.id} data-kind={b.kind} data-pillar={b.pillar ?? undefined}><span>{clockLabel(b.start!)}</span><strong>{b.title}</strong></li>)}</ol>
      : <p className="today-timeline-line">{day.quiet ? 'A quiet day: nothing is scheduled yet.' : 'Nothing else is scheduled for today.'}</p>}
    <Link className="today-timeline-open text-link" href={TIMELINE_ROUTE}>Open the day timeline →</Link>
  </>;
}
