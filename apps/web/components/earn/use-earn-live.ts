'use client';
import {useEffect, useState} from 'react';
import type {FamilyData, LiveState} from '../../lib/earn/client';
import {EARN_FAMILIES, type EarnFamily} from '../../lib/earn/families';
import {browserPollEnv, visiblePoll} from '../../lib/earn/visible-poll';
import {useDayNow} from '../use-local-today';

/**
 * CI14 (page weights; budgets are never raised): the readers (lib/earn/client.ts with its answer schemas) and the snapshot
 * ZIGi quotes are a chunk of their own, asked for as soon as this module loads; every read waits for them before it asks
 * its route, so the page shows "reading" exactly as long as before plus, at most, that chunk's arrival.
 */
const loadReaders = () => Promise.all([import('../../lib/earn/client'), import('../../lib/earn/snapshot')]);
if (typeof window !== 'undefined') void loadReaders().catch(() => undefined);
/**
 * Session AF (L1): one live family on the Earn page. Read on mount, then again every `pollMs` (2 minutes for the chain
 * and the apps, 10 for DefiLlama) only while the page is visible: a hidden tab reads nothing, and coming back reads at
 * once if the last read is older than the cadence. The last answer is kept in memory only, never stored.
 */
export function useEarnLive<F extends EarnFamily>(family: F): LiveState<FamilyData[F]> {
  const [state, setState] = useState<LiveState<FamilyData[F]>>({phase: 'loading'});
  useEffect(() => {
    let alive = true;
    const {pollMs} = EARN_FAMILIES[family];
    // The visibility gate and the cadence live in lib/earn/visible-poll.ts (unit-tested); this is what one read does.
    const read = async () => {
      let readers: Awaited<ReturnType<typeof loadReaders>>;
      try { readers = await loadReaders(); } catch { if (alive) setState(current => current.phase === 'loading' ? {phase: 'unavailable', reason: 'UPSTREAM_DOWN'} : current); return; }
      const [{readEarn, readValidators}, {recordEarnSnapshot}] = readers;
      const next = (family === 'validators' ? await readValidators() : await readEarn(family as Exclude<EarnFamily, 'validators'>)) as LiveState<FamilyData[F]>;
      // Session AF (L4, H69): what the page shows also goes into the device-side snapshot ZIGi quotes (memory only).
      if (alive) setState(current => recordEarnSnapshot(family, next.phase === 'unavailable' && current.phase === 'ok' && Date.now() - Date.parse(current.answer.fetchedAt) < 10 * 60_000 ? {phase: 'ok', answer: {...current.answer, stale: true, reason: next.reason === 'NOT_IN_THIS_BUILD' ? undefined : next.reason}} : next));
    };
    const stop = visiblePoll(read, pollMs, browserPollEnv());
    return () => { alive = false; stop(); };
  }, [family]);
  return state;
}
/** A clock for "updated x min ago", ticking every 30 seconds. */
export function useMinuteClock(): number {
  // CI4 (React #418): the first render uses the server's day (useDayNow), so the hydrated text matches; this device's
  // clock takes over right after mount and every 30 s.
  const first = useDayNow();
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => { setNow(Date.now()); const t = window.setInterval(() => setNow(Date.now()), 30_000); return () => window.clearInterval(t); }, []);
  return now ?? first;
}
