'use client';
import {useSyncExternalStore} from 'react';
import {currentDayGoal, emptyDayGoal, subscribeDayGoal, type DayGoal} from '../../lib/checklist/day-goal-core';

/** Session AP (owner decision 14 Nov): "A day counts as done at N" on this page (set by the shell's keeper; off on the server). */
const SERVER = emptyDayGoal();
export function useDayGoal(): DayGoal { return useSyncExternalStore(subscribeDayGoal, currentDayGoal, () => SERVER); }
