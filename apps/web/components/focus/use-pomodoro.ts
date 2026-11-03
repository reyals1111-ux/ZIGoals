'use client';
import {useSyncExternalStore} from 'react';
import {pomodoroSnapshot, serverPomodoroSnapshot, subscribePomodoro} from '../../lib/focus-sessions/pomodoro-run';

/** Session AK (T3): the page's one Pomodoro run (lib/focus-sessions/pomodoro-run.ts), read by any view. */
export const usePomodoro = () => useSyncExternalStore(subscribePomodoro, pomodoroSnapshot, serverPomodoroSnapshot);
/** "12:05" for seconds left. */
export const clockOf = (seconds: number) => `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`;
export const PHASE_WORDS = {work: 'Focus', break: 'Short break', 'long-break': 'Long break'} as const;
