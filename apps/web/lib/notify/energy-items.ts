import {energyCurve} from '../energy-curve/curve';
import {remindedSteps} from '../evening-plan/morning';
import {stepClock} from '../evening-plan/plan';
import type {EveningRecord} from '../evening-plan/schema';
import type {Sleep} from '../sleep/schema';
import {energyReminders, type NotifyPrefs} from './prefs';
import {addDays, zonedInstant} from './zone';

/**
 * Session AV lane 2 (bodymind-r2; LEDGER #235, #236, Rise's energy schedule and habits at suggested times): the reminders
 * the day's energy curve and the plan's steps send, pure, for the notification plan's `energy` kind.
 * - From the curve (each only when chosen): the focus window's start, 15 minutes before the likely dip, and the wind-down
 *   start (45 minutes before the curve's suggested bedtime window): one-off wakes, today's and tomorrow's, since the times
 *   follow the wake time (tomorrow's from the usual one).
 * - The steps with a reminder: an evening step at its clock time each evening (a recurring wake; quiet once ticked), a
 *   morning step at its minutes after the day's wake time (one-off, today and tomorrow).
 * Every line is the app's own words; an own habit used as a step gives its name only as a label (shown only where names
 * are allowed). Never a sleep figure.
 */
export const DIP_AHEAD = 15, WIND_DOWN_AHEAD = 45;
export type EnergyOnce = {id: string; at: number; detail: string; label?: string};
export type EnergyDaily = {id: string; time: string; detail: string; label?: string; done: string[]};
export type EnergyInput = {once: EnergyOnce[]; daily: EnergyDaily[]};
const clock = (m: number) => { const x = ((Math.round(m) % 1440) + 1440) % 1440; return `${String(Math.floor(x / 60)).padStart(2, '0')}:${String(x % 60).padStart(2, '0')}`; };
/** The instant of `m` minutes after midnight of `date` (past 1440: the next day). */
const at = (date: string, m: number, zone: string) => zonedInstant(addDays(date, Math.floor(m / 1440)), clock(m), zone);

export const ENERGY_WORDS = {
  focus: 'Your good focus window starts now (an estimate from your sleep)',
  dip: `Your likely dip starts in about ${DIP_AHEAD} minutes`,
  windDown: 'Time to start winding down, from your energy curve',
  step: 'Time for a step of your plan',
} as const;

export function energyItems(input: {sleep: Sleep | null; evening: EveningRecord | null; prefs: NotifyPrefs; today: string; zone: string}): EnergyInput {
  const {sleep, evening, prefs, today, zone} = input, chosen = energyReminders(prefs), once: EnergyOnce[] = [], daily: EnergyDaily[] = [];
  const days = [today, addDays(today, 1)];
  if (sleep) for (const date of days) {
    const c = energyCurve(sleep, date);
    if (!c) continue;
    if (chosen.focus) once.push({id: `energy:focus@${date}`, at: at(date, c.focus.from, zone), detail: ENERGY_WORDS.focus});
    if (chosen.dip) once.push({id: `energy:dip@${date}`, at: at(date, c.dip.from - DIP_AHEAD, zone), detail: ENERGY_WORDS.dip});
    if (chosen.windDown) once.push({id: `energy:wind-down@${date}`, at: at(date, c.bedtime.from - WIND_DOWN_AHEAD, zone), detail: ENERGY_WORDS.windDown});
    for (const id of evening ? remindedSteps(evening) : []) {
      const s = evening!.morning?.steps.find(x => x.id === id);
      if (s && !(evening!.mornings?.[date] ?? []).includes(id)) once.push({id: `step:${id}@${date}`, at: at(date, c.wake + s.minutesAfter, zone), detail: `Morning step: ${s.label}`});
    }
  }
  if (evening?.plan) for (const id of remindedSteps(evening)) {
    const s = evening.plan.steps.find(x => x.id === id);
    if (!s) continue;
    const done = Object.entries(evening.days).filter(([, t]) => t.includes(id)).map(([d]) => d);
    daily.push(s.habitId ? {id: `step:${id}`, time: stepClock(evening.plan.bedtime, s.minutesBefore), detail: ENERGY_WORDS.step, label: s.label, done} : {id: `step:${id}`, time: stepClock(evening.plan.bedtime, s.minutesBefore), detail: `Evening step: ${s.label}`, done});
  }
  return {once, daily};
}
