'use client';
import {useLayoutEffect} from 'react';
import {ACCOUNT_CHANGE} from '../lib/account-session';
const DAY_ENDS_KEY = 'zigoals:day-ends:v1'; // lib/day-boundary.ts DAY_ENDS_KEY (equal by test)
import {emptyDayEnds, readDayEnds, setCurrentDayEnds} from '../lib/day-boundary-core';
// Session AP (owner decision 14 Nov): "A day counts as done at N" is read here too, the same way (no schema in the shell).
import {DAY_GOAL_KEY_LITERAL, emptyDayGoal, setCurrentDayGoal} from '../lib/checklist/day-goal-core';
import {ZIGI_STORE_EVENT} from '../lib/ai/store/keys';
import {getAppStorage} from '../lib/showcase-storage';

/**
 * Session AO (C-DVG-22): "My day ends at" for the whole page, read from this device's record (lib/day-boundary.ts) in a
 * layout effect, before any passive effect of the same commit (the day-dependent writers, as with the journal zone),
 * and again after a save, a change in another tab or an account change. Unreadable: midnight, as before.
 */
export function useDayEndsKeeper(): void {
  useLayoutEffect(() => {
    // Read without the record's schema (the shell stays light); readDayEnds keeps exactly its rules (lib/day-boundary-core.ts).
    const apply = () => {
      try { setCurrentDayEnds(readDayEnds(getAppStorage().getItem(DAY_ENDS_KEY))); } catch { setCurrentDayEnds(emptyDayEnds()); }
      // The reader loads only on a device that holds the record (most hold none: every dot, as before).
      let raw: string | null = null;
      try { raw = getAppStorage().getItem(DAY_GOAL_KEY_LITERAL); } catch { raw = null; }
      if (raw === null) setCurrentDayGoal(emptyDayGoal());
      else { const held = raw; void import('../lib/checklist/day-goal-read').then(m => setCurrentDayGoal(m.readDayGoal(held)), () => setCurrentDayGoal(emptyDayGoal())); }
    };
    apply();
    const onSaved = (event: Event) => { const key = (event as CustomEvent<string>).detail; if (!key || key === DAY_ENDS_KEY || key === DAY_GOAL_KEY_LITERAL) apply(); };
    const onStorage = (event: StorageEvent) => { if (!event.key || event.key.endsWith(DAY_ENDS_KEY) || event.key.endsWith(DAY_GOAL_KEY_LITERAL)) apply(); };
    window.addEventListener(ZIGI_STORE_EVENT, onSaved); window.addEventListener('storage', onStorage); window.addEventListener(ACCOUNT_CHANGE, apply);
    return () => { window.removeEventListener(ZIGI_STORE_EVENT, onSaved); window.removeEventListener('storage', onStorage); window.removeEventListener(ACCOUNT_CHANGE, apply); };
  }, []);
}
