'use client';
import {useEffect, useRef} from 'react';
import {applyChessCheckIn, chessCheckIn, markApplied} from '../../lib/skills/chess/engine';
import type {HabitsStore} from '../habits/use-habits';
import type {useChess} from './use-chess';

/**
 * Ticks off the habit set in Chess once a game of the person's ended that day (Session W Part 14), while the Chess page
 * or Today's chess card is open: the habit's entry first, then the day's marker in settings v3 `chess`, so a day is
 * applied once; the Showcase changes nothing.
 */
export function useChessCheckIn(state: ReturnType<typeof useChess>, habits: Pick<HabitsStore, 'data' | 'loaded' | 'error' | 'update'>) {
  const running = useRef(false), {settings, cache, showcase} = state;
  useEffect(() => {
    if (showcase || running.current || !settings.loaded || settings.error || !cache.loaded || cache.unreadable || !habits.loaded || habits.error) return;
    const item = chessCheckIn(habits.data, settings.data, cache.data.games, new Date());
    if (!item) return;
    running.current = true;
    void (async () => {
      try {
        let changed = false;
        await habits.update(data => { const next = applyChessCheckIn(data, item, new Date()); changed = next !== data; return next; });
        if (changed) await settings.update(s => markApplied(s, item.day, new Date().toISOString()));
      } catch { /* tried again on the next change; nothing half-written: the marker follows the entry */ }
      finally { running.current = false; }
    })();
  }, [showcase, settings, cache.loaded, cache.unreadable, cache.data.games, habits]);
}
