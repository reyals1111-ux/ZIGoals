import type {Metadata} from 'next';
import {DayTimelinePage} from '../../../components/timeline/day-timeline';
import {TasksTimelineSource} from '../../../components/tasks/tasks-timeline-source';
// Session AF (L5b; P9.2, ADR-028 H79): the Day Timeline, its own route chunk (the timeline loads with it, never on Today).
// Session AL (PR-103, P-PR-41): tasks join the day (the source registers itself here and with Today's tasks card).
export const metadata: Metadata = {title: 'Timeline'};
export default function Timeline() { return <><TasksTimelineSource /><DayTimelinePage /></>; }
