'use client';
import {useState} from 'react';
import {TodayWrappedCard, useTodayWrappedCard} from '../wrapped/wrapped-door';
import type {HabitData} from '../../lib/habits';
import type {HealthData} from '../../lib/health';
import type {Platform} from '../../lib/positions';

/**
 * Session AL (Q24 reopened): ZIGoals Wrapped's Today card, mounted. AK built it and left it unmounted by its own reading
 * (ADR-036 Q24, not an owner decision). It shows only while Wrapped is available for the person's own records
 * (lib/wrapped/door.ts: from 1 December with three logged days, or once the year holds 30) and until it is opened; its
 * own chunk, so Today's first load is unchanged. The Showcase keeps its Example on Journey (today-dashboard.tsx).
 * Session AL (CI 1539, Today's phone height): on Today only in its season (December and January), as AK's Q24 and the
 * scope row ("Today after 1 Dec") have it; before then, a year of 30 logged days opens it from Journey and Search, and
 * Today keeps its length the rest of the year.
 */
export default function TodayWrapped({habits, health, platform, today}: {habits: HabitData; health: HealthData; platform: Platform; today: string}) {
  const door = useTodayWrappedCard({habits, health, platform, today});
  // Session AL (CI 1632, Q24): opening the story records this year's Wrapped as opened, which ends the card; the story lives
  // inside the card, so the card stays while its story is open and goes once it is closed.
  const [held, setHeld] = useState(false), hold = () => setHeld(true), release = () => setHeld(false);
  return held || (door.state === 'shown' && door.todayCard && door.season) ? <TodayWrappedCard door={door} onOpen={hold} onClose={release}/> : null;
}
