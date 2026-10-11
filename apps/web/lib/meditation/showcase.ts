import {meditationSchema, type Meditation, type MeditationSession} from './schema';
import {addDays, instantAt} from '../zone-time';

/**
 * Showcase meditation (Session W Part 5): 30 fictional days ending on the Showcase day, with sessions on most mornings
 * (rest days left empty), a few breathing guides and mindful minutes, moods on some, one note marked as Showcase data, a
 * weekly goal and a bell. Deterministic: the same day always gives the same sessions.
 */
const ZONE = 'Europe/Brussels';
export function showcaseMeditation(day: string): Meditation {
  let seed = 11;
  const next = (n: number) => { seed = (seed * 48271) % 2147483647; return seed % n; };
  const sessions: MeditationSession[] = [];
  for (let i = 29; i >= 0; i--) {
    const date = addDays(day, -i), r = [next(10), next(25), next(3), next(5)] as const;
    if (r[0] < 3 && i !== 0) continue; // a rest day
    const kind = i % 6 === 2 ? 'breathing' : i % 9 === 4 ? 'manual' : 'timer';
    const minutes = kind === 'breathing' ? 3 + r[2] : kind === 'manual' ? 15 : [5, 10, 10, 15, 20][r[3]]!;
    const at = `${date}T09:00:00.000Z`;
    sessions.push({id: `health_med-showcase-${String(29 - i).padStart(4, '0')}`, startedAt: new Date(instantAt(date, `07:${String(5 + r[1]).padStart(2, '0')}`, ZONE)).toISOString(), seconds: minutes * 60, kind,
      ...(kind === 'breathing' ? {pattern: (['box', 'coherent', '478'] as const)[r[2]]} : {}), ...(kind !== 'manual' && r[3] > 1 ? {moodBefore: 2 + r[2], moodAfter: Math.min(5, 3 + r[2])} : {}),
      ...(i === 1 ? {note: 'SHOWCASE DATA · fictional session'} : {}), timeZone: ZONE, source: kind === 'breathing' ? 'breathing' : kind === 'manual' ? 'manual' : 'timer', createdAt: at, updatedAt: at});
  }
  const stamp = `${addDays(day, -29)}T09:00:00.000Z`;
  return meditationSchema.parse({version: 1, sessions, goal: {minutesPerWeek: 60, updatedAt: stamp}, bells: {sound: 'bowl', volume: 60, updatedAt: stamp}});
}
