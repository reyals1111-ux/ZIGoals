'use client';
import {useCallback, useEffect, useRef, useState} from 'react';
import {usePrivateStore} from '../use-private-store';
import {useDeviceRecord} from '../ai/use-device-record';
import {DASHBOARD_SETTINGS_KEY, dashboardSettingsSchema, emptyDashboardSettings} from '../../lib/dashboard-settings';
import {CHESS_CACHE, type ChessSite} from '../../lib/skills/chess/schema';
import {ChessSiteError, readChesscom, readLichess, sitePausedFor} from '../../lib/skills/chess/api';
import {chessOf, mergeRead} from '../../lib/skills/chess/engine';
import {isShowcase} from '../../lib/showcase-storage';

/**
 * Chess's state on a page (Session W Part 14): the person's choices (settings v3 `chess`), what the sites said (the
 * device cache), and `refresh`, which asks each site with a username, one after the other. `auto` refreshes on opening
 * when the last answer is older than its age (an hour on the Chess page, six on Today); the Showcase never asks anyone.
 */
export const AUTO_AGE_MS = {page: 3_600_000, today: 21_600_000} as const;
export function useChess(auto: keyof typeof AUTO_AGE_MS | null = null) {
  const settings = usePrivateStore(DASHBOARD_SETTINGS_KEY, dashboardSettingsSchema, emptyDashboardSettings), cache = useDeviceRecord(CHESS_CACHE);
  const [busy, setBusy] = useState(false), [errors, setErrors] = useState<Partial<Record<ChessSite, string>>>({}), started = useRef(false);
  const chess = settings.loaded && !settings.error ? chessOf(settings.data) : undefined, showcase = isShowcase();
  const refresh = useCallback(async (only?: ChessSite) => {
    if (showcase || !chess || busy) return;
    setBusy(true);
    const next: Partial<Record<ChessSite, string>> = {};
    for (const site of ['chesscom', 'lichess'] as const) {
      const username = chess[site]?.username;
      if (!username || (only && only !== site)) continue;
      try {
        const read = site === 'chesscom' ? await readChesscom(username) : await readLichess(username);
        cache.update(current => mergeRead(current, read));
      } catch (error) { next[site] = error instanceof ChessSiteError || error instanceof Error ? error.message : 'Not updated.'; }
    }
    setErrors(next); setBusy(false);
  }, [showcase, chess, busy, cache]);
  useEffect(() => {
    if (!auto || started.current || showcase || !chess || !cache.loaded || cache.unreadable) return;
    started.current = true;
    const stale = (['chesscom', 'lichess'] as const).some(site => chess[site] && (!cache.data.fetchedAt[site] || Date.now() - Date.parse(cache.data.fetchedAt[site]!) > AUTO_AGE_MS[auto]) && sitePausedFor(site) === 0);
    if (stale) queueMicrotask(() => void refresh());
  }, [auto, showcase, chess, cache.loaded, cache.unreadable, cache.data.fetchedAt, refresh]);
  return {settings, cache, chess, busy, errors, refresh, showcase};
}
