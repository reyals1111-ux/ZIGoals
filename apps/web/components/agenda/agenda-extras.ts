import type {Platform} from '../../lib/positions';
import type {AgendaPlanned, AgendaUnbonding} from '../../lib/agenda/build';
import {showcaseAgendaExtras} from '../../lib/agenda/showcase';
import {unbondingEvents} from '../../lib/zigchain-eco/staking-clarity';
import {journalTimeZone} from '../../lib/journal-zone';

/**
 * Session AK (F5d): the agenda's inputs that have no record of their own here — unbonding dates and planned workouts.
 * Unbonding: the ZIG unstakes recorded in Wealth (lane F4's `unbondingEvents()`, only for a person who staked), each on the
 * day it becomes usable in the journal's zone. Planned workouts stay empty until a feature keeps them. The Showcase shows
 * its labelled examples.
 */
export function agendaExtras({platform, showcase, day}: {platform: Platform | null; showcase: boolean; day: string}): {unbonding: AgendaUnbonding[]; plannedWorkouts: AgendaPlanned[]} {
  if (showcase) return showcaseAgendaExtras(day);
  const zone = journalTimeZone() ?? undefined;
  const unbonding = unbondingEvents(platform?.positions ?? [], {now: Date.now(), ...(zone ? {timeZone: zone} : {})}).map(e => ({id: e.id, date: e.date, title: e.title, href: e.href}));
  return {unbonding, plannedWorkouts: []};
}
