import {expect, test} from 'vitest';
import {addLocalDays} from '../local-date';
import {weekLines, weekPattern} from './week';

// Session AJ (item 10; COMPANIONS.md P2). 2026-10-29 is a Thursday: this week runs Monday 26 Oct to Sunday 1 Nov.
const TODAY = '2026-10-29';
const series = (from: string, n: number, value: (d: string, i: number) => number | null) => Object.fromEntries(Array.from({length: n}, (_, i) => addLocalDays(from, i)).flatMap((d, i) => { const v = value(d, i); return v === null ? [] : [[d, v]]; }));
test('fewer than 4 rated days this week: nothing is shown', () => {
  const p = weekPattern({energy: series('2026-10-26', 3, () => 4), mood: {}, today: TODAY});
  expect(p.week.map(d => d.date)).toEqual(['2026-10-26', '2026-10-27', '2026-10-28', '2026-10-29', '2026-10-30', '2026-10-31', '2026-11-01']);
  expect(p.rated).toBe(3); expect(p.shown).toBe(false); expect(weekLines(p)).toEqual([]);
});
test('four days: the averages; the previous 4 weeks compared only with 14 rated days there', () => {
  const energy = {...series('2026-09-28', 28, () => 3), ...series('2026-10-26', 4, () => 4)};
  const p = weekPattern({energy, mood: series('2026-10-26', 4, () => 3), today: TODAY});
  expect(weekLines(p)).toEqual(['This week: energy averaged 4.0 of 5; mood 3.0 of 5.', 'Energy: higher than your previous 4 weeks (3.0).']);
  const few = weekPattern({energy: {...series('2026-09-28', 10, () => 3), ...series('2026-10-26', 4, () => 3.1)}, mood: {}, today: TODAY});
  expect(few.compareEnergy).toBeNull();
  const same = weekPattern({energy: {...series('2026-09-28', 28, () => 3), ...series('2026-10-26', 4, () => 3)}, mood: {}, today: TODAY});
  expect(weekLines(same)).toContain('Energy: about the same as your previous 4 weeks.');
});
test('the weekday line needs 28 days, 4 ratings per weekday named and half a point between them', () => {
  // The 8 weeks before Monday 26 Oct: energy 4 on Saturdays, 2 on Mondays, 3 otherwise.
  const energy = {...series('2026-08-31', 56, d => { const w = new Date(`${d}T12:00:00Z`).getUTCDay(); return w === 6 ? 4 : w === 1 ? 2 : 3; }), ...series('2026-10-26', 4, () => 3)};
  const p = weekPattern({energy, mood: {}, today: TODAY});
  expect(p.weekday).toMatchObject({series: 'energy', highest: {weekday: 5, value: 4}, lowest: {weekday: 0, value: 2}, label: 'consistent'});
  expect(weekLines(p).at(-1)).toBe('Your energy was highest on Saturdays (4.0) and lowest on Mondays (2.0), over the 8 weeks before this one (consistent).');
  const flat = weekPattern({energy: {...series('2026-08-31', 56, () => 3), ...series('2026-10-26', 4, () => 3)}, mood: {}, today: TODAY});
  expect(flat.weekday).toBeNull();
  for (const line of weekLines(p)) expect(line).not.toMatch(/better|worse|bad|good day/i);
});
