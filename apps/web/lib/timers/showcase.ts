import {TIMERS_KEY, type Timers} from './store';

/**
 * Session AW (X1, LEDGER #440): the Showcase person's kept timers, labelled "(Showcase)" — kept to start again, none
 * running, so no strip shows until the visitor starts one. In the record's own format, in the Showcase tab's storage only.
 */
export function showcaseTimers(now: number): Timers {
  const used = (hoursAgo: number) => Math.max(0, Math.round(now - hoursAgo * 3_600_000));
  return {version: 1, timers: [
    {id: 'tm-showcase-pasta', name: 'Pasta (Showcase)', seconds: 9 * 60, used: used(20)},
    {id: 'tm-showcase-laundry', name: 'Laundry (Showcase)', seconds: 45 * 60, used: used(30)},
    {id: 'tm-showcase-tea', name: 'Tea (Showcase)', seconds: 4 * 60, used: used(50)},
  ]};
}
export function withAwX1Showcase(records: Record<string, string>, day: string): void {
  records[TIMERS_KEY] = JSON.stringify(showcaseTimers(Date.parse(`${day}T12:00:00Z`)));
}
