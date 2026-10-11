'use client';
import {useEffect, useRef, useState, useSyncExternalStore} from 'react';
import type {useHealth} from '../health/use-health';
import type {HabitsStore} from './use-habits';
import {useHabitHealthLinks} from './use-habit-health-links';
import {applyAutoCompletion, autoCheckInMarker, autoCompletions} from '../../lib/habit-health-links/engine';
import {recordAutoCheckIn} from '../../lib/habit-health-links/store';
import {useJournalZone} from '../use-journal-zone';

// A refused automatic check-in is said once on its habit's card and retried on the next run (H7, "Hook").
const notices = new Map<string, string>();
const NOTICE_EVENT = 'zigoals:auto-checkin-notice';
let noticeVersion = 0;
function setNotice(habitId: string, message: string | null) {
  if (message === null ? !notices.delete(habitId) : notices.get(habitId) === message) return;
  if (message !== null) notices.set(habitId, message);
  noticeVersion++; window.dispatchEvent(new Event(NOTICE_EVENT));
}
const subscribe = (listener: () => void) => { window.addEventListener(NOTICE_EVENT, listener); return () => window.removeEventListener(NOTICE_EVENT, listener); };
/** The notice for one habit, if its last automatic check-in was refused. */
export function useAutoCheckInNotice(habitId: string): string | null {
  useSyncExternalStore(subscribe, () => noticeVersion, () => 0);
  return notices.get(habitId) ?? null;
}
/**
 * Ticks linked habits off from the Health journal (lib/habit-health-links/engine.ts): once both stores and the links
 * have loaded, on mount, on each store change, on focus and every 30 s. Items are applied one at a time through the
 * habits store; the marker is written only after the update changed the data. The same habit and day is never applied
 * twice: the marker, or the entry another tab wrote, stops the next run.
 */
export function useAutoCheckIns({habits, health}: {habits: Pick<HabitsStore, 'data' | 'loaded' | 'error' | 'update'>; health: Pick<ReturnType<typeof useHealth>, 'data' | 'loaded' | 'error'>}) {
  const links = useHabitHealthLinks();
  const running = useRef(false);
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const bump = () => setTick(t => t + 1);
    const timer = window.setInterval(bump, 30000);
    window.addEventListener('focus', bump);
    return () => { window.clearInterval(timer); window.removeEventListener('focus', bump); };
  }, []);
  const {data: linkData, loaded: linksLoaded, unreadable, update: updateLinks} = links;
  const {data: habitData, loaded: habitsLoaded, error: habitsError, update: updateHabits} = habits;
  const {data: healthData, loaded: healthLoaded, error: healthError} = health;
  // Session W Part 17: days may follow the journal zone, so nothing is ticked off before the settings say which it is.
  const {zone: journalZone, ready: journalReady} = useJournalZone();
  useEffect(() => {
    if (!journalReady || !habitsLoaded || habitsError || !healthLoaded || healthError || !linksLoaded || unreadable || running.current) return;
    const items = autoCompletions({links: linkData, habits: habitData, health: healthData, now: new Date()});
    if (!items.length) return;
    running.current = true;
    void (async () => {
      for (const item of items) {
        let changed = false;
        try {
          await updateHabits(data => { const next = applyAutoCompletion(data, item, new Date()); changed = next !== data; return next; });
          if (changed) await updateLinks(current => recordAutoCheckIn(current, autoCheckInMarker(item, new Date())));
          setNotice(item.habitId, null);
        } catch (error) {
          setNotice(item.habitId, `This habit could not be ticked off automatically. ${error instanceof Error ? error.message : 'Try again later.'}`);
        }
      }
    })().finally(() => { running.current = false; });
  }, [tick, linkData, linksLoaded, unreadable, updateLinks, habitData, habitsLoaded, habitsError, updateHabits, healthData, healthLoaded, healthError, journalReady, journalZone]);
  return links;
}
