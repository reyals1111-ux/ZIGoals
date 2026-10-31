/**
 * Session AK Part 8.2: the Daily orbit card on Today — one look at the day across the pillars: how much of today's orbit
 * is lit (the Checklist's own count when the person keeps one, else today's due habits), the next few things due (a
 * habit at its reminder time, a Checklist planet, a goal contribution due today) and how many contributions are due.
 * Pure: the card gathers its candidates from the records (lib/checklist/derive.ts, lib/habits, lib/goal-intelligence)
 * and this decides what shows. It reads only; ticking happens on the Checklist, which the card opens.
 */
export type OrbitPillar = 'habits' | 'health' | 'goals' | 'wealth';
export type OrbitCandidate = {
  /** A stable key across sources, so a habit starred on the Checklist and due on Habits shows once (`habit:<id>`). */
  key: string;
  pillar: OrbitPillar;
  label: string;
  /** The reminder time (HH:MM) when there is one. */
  time: string | null;
  href: string;
  done: boolean;
};
export type OrbitItem = Omit<OrbitCandidate, 'done'> & {when: 'next' | 'later' | 'earlier' | 'anytime'};
export type OrbitSummary = {
  /** What the count is made of: the Checklist's planets, today's due habits, or nothing to count yet. */
  source: 'checklist' | 'habits' | 'none';
  done: number; total: number;
  next: OrbitItem[];
  contributionsDue: number;
  /** One plain line for the card and for screen readers. */
  line: string;
};
export const MAX_NEXT = 3;
const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

/**
 * `checklist`: the Checklist's summary of today (null without a path or before it reads). `now`: the wall clock as HH:MM.
 * Next items: the first not yet done at or after now by time, then those without a time, then those whose time has
 * passed ("earlier"); each key once, the first source wins.
 */
export function orbitSummary({checklist, candidates, now, contributionsDue}: {checklist: {done: number; total: number} | null; candidates: readonly OrbitCandidate[]; now: string; contributionsDue: number}): OrbitSummary {
  const seen = new Set<string>(), unique: OrbitCandidate[] = [];
  for (const c of candidates) { if (seen.has(c.key)) continue; seen.add(c.key); unique.push(c); }
  const clock = TIME.test(now) ? now : '00:00';
  const open = unique.filter(c => !c.done).map(c => ({...c, time: c.time && TIME.test(c.time) ? c.time : null}));
  const rank = (c: {time: string | null}) => c.time === null ? 1 : c.time >= clock ? 0 : 2;
  const ordered = open.map((c, i) => ({c, i})).sort((a, b) => rank(a.c) - rank(b.c) || (a.c.time ?? '').localeCompare(b.c.time ?? '') || a.i - b.i).map(({c}) => c);
  const next: OrbitItem[] = ordered.slice(0, MAX_NEXT).map((c, i) => {
    const {done: _done, ...item} = c; void _done;
    return {...item, when: c.time === null ? 'anytime' : c.time < clock ? 'earlier' : i === 0 ? 'next' : 'later'};
  });
  const habits = unique.filter(c => c.pillar === 'habits');
  const source: OrbitSummary['source'] = checklist && checklist.total > 0 ? 'checklist' : habits.length ? 'habits' : 'none';
  const done = source === 'checklist' ? checklist!.done : source === 'habits' ? habits.filter(h => h.done).length : 0;
  const total = source === 'checklist' ? checklist!.total : source === 'habits' ? habits.length : 0;
  const due = Math.max(0, Math.floor(contributionsDue));
  const count = source === 'checklist' ? `${done} of ${total} ${total === 1 ? 'planet' : 'planets'} lit` : source === 'habits' ? `${done} of ${total} ${total === 1 ? 'habit' : 'habits'} done` : 'Nothing counted yet today';
  const rest = total > 0 && done >= total && !next.length ? 'Your orbit is complete for today.' : next.length ? `Next: ${next[0]!.label}${next[0]!.time ? ` at ${next[0]!.time}` : ''}.` : '';
  const money = due ? ` ${due} ${due === 1 ? 'contribution is' : 'contributions are'} due today.` : '';
  return {source, done, total, next, contributionsDue: due, line: `${count}.${rest ? ` ${rest}` : ''}${money}`};
}
