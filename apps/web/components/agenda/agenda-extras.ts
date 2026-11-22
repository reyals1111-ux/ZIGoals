import type {Platform} from '../../lib/positions';
import type {AgendaPlanned, AgendaUnbonding} from '../../lib/agenda/build';
import {showcaseAgendaExtras} from '../../lib/agenda/showcase';
import {unbondingEvents} from '../../lib/zigchain-eco/staking-clarity';
import {journalTimeZone} from '../../lib/journal-zone';
import {agendaPlanned, type PlannedRecord} from '../../lib/workouts/planned';
import type {Workouts} from '../../lib/workouts/schema';

/**
 * Session AK (F5d): the agenda's inputs that have no record of their own here — unbonding dates and planned workouts.
 * Unbonding: the ZIG unstakes recorded in Wealth (lane F4's `unbondingEvents()`, only for a person who staked), each on the
 * day it becomes usable in the journal's zone. Planned workouts: the person's own (Session AV lane 2, round 4, LEDGER #330:
 * zigoals:planned-workouts:v1, those still to do or missed; none set aside or done). The Showcase shows its labelled
 * examples, as before.
 */
/** The agenda's words for an unbonding date: no amount, no validator. */
export const unbondingTitle = (practice: boolean) => practice ? 'Unstaked test ZIG becomes usable' : 'Unstaked ZIG becomes usable';
export function agendaExtras({platform, showcase, day, planned = null, workouts = null}: {platform: Platform | null; showcase: boolean; day: string; planned?: PlannedRecord | null; workouts?: Workouts | null}): {unbonding: AgendaUnbonding[]; plannedWorkouts: AgendaPlanned[]} {
  if (showcase) return showcaseAgendaExtras(day);
  const zone = journalTimeZone() ?? undefined;
  // Security review F10 (R1-F1, R2-F3): the agenda and its calendar file never carry a figure or a validator's name —
  // only that unstaked ZIG becomes usable that day (the amount stays on Earn).
  const unbonding = unbondingEvents(platform?.positions ?? [], {now: Date.now(), ...(zone ? {timeZone: zone} : {})}).map(e => ({id: e.id, date: e.date, title: unbondingTitle(e.practice), href: e.href}));
  return {unbonding, plannedWorkouts: agendaPlanned(planned, workouts, day)};
}
