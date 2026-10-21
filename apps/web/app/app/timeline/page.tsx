import type {Metadata} from 'next';
import {DayTimelinePage} from '../../../components/timeline/day-timeline';
// Session AF (L5b; P9.2, ADR-028 H79): the Day Timeline, its own route chunk (the timeline loads with it, never on Today).
export const metadata: Metadata = {title: 'Timeline'};
export default function Timeline() { return <DayTimelinePage />; }
