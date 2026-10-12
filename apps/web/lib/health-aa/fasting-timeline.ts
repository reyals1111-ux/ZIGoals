import {elapsedMs} from '../fasting/engine';
import type {FastingSession} from '../fasting/schema';

/**
 * N8: the fasting timeline: the hours of the current (or last) fast against neutral milestones described plainly,
 * without health claims: what the milestone IS (an hour mark people commonly pick), never what it does to the body.
 */
export const FASTING_MILESTONES = [
  {hours: 12, title: '12 hours', line: 'Half a day. Many overnight fasts end here.'},
  {hours: 16, title: '16 hours', line: 'The common 16:8 target.'},
  {hours: 18, title: '18 hours', line: 'A longer daily window.'},
  {hours: 24, title: '24 hours', line: 'A full day; the app’s timer stops here.'},
] as readonly {hours: number; title: string; line: string}[];
export type TimelineStop = {hours: number; title: string; line: string; reached: boolean; target: boolean};
export type FastingTimeline = {session: FastingSession; hours: number; running: boolean; stops: TimelineStop[]; share: number; targetHours: number};
export function fastingTimeline(session: FastingSession, now: Date): FastingTimeline {
  const ms = session.endedAt === null ? elapsedMs(session, now).ms : Date.parse(session.endedAt) - Date.parse(session.startedAt);
  const hours = Math.max(0, ms / 3_600_000);
  const stops = FASTING_MILESTONES.map(m => ({...m, reached: hours >= m.hours, target: m.hours === session.targetHours}));
  if (!stops.some(s => s.target)) stops.push({hours: session.targetHours, title: `${session.targetHours} hours`, line: 'Your own target.', reached: hours >= session.targetHours, target: true});
  stops.sort((a, b) => a.hours - b.hours);
  return {session, hours, running: session.endedAt === null, stops, share: Math.min(1, hours / Math.max(session.targetHours, 1)), targetHours: session.targetHours};
}
