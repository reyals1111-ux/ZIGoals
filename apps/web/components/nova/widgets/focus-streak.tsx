'use client';
import {useMemo} from 'react';
import {focusTrack} from '../../../lib/ai/local-answers/exact/day';
import type {FocusSessions} from '../../../lib/focus-sessions/schema';
import {trackStreak} from '../../../lib/nova/cards/ax/day-streaks';
import {StreakBody} from '../cards/ax/day-streak-body';
import type {AxProps} from '../cards/ax/kit';
import {FocusSource} from './ax/sources';

/**
 * Session AS (ADR-042 Part 2, family: flames): "Focus streak" — the days in a row with a focus session and the longest
 * run of the last year, as two flames (the exact layer's own count: lib/ai/local-answers/exact/day.ts `focusTrack`).
 */
export default function FocusStreak({size}: AxProps) {
  return <FocusSource>{(focus, today) => <Run focus={focus} today={today} size={size}/>}</FocusSource>;
}
function Run({focus, today, size}: {focus: FocusSessions; today: string; size: AxProps['size']}) {
  const view = useMemo(() => trackStreak(focusTrack(focus.sessions, today), today), [focus.sessions, today]);
  return <StreakBody kind="focus-streak" size={size} view={view} did="with a focus session" what="a focus session" source="Your focus sessions" today={today}/>;
}
