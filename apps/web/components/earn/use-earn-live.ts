'use client';
import {useEffect, useState} from 'react';
import {EARN_FAMILIES, readEarn, readValidators, type EarnFamily, type FamilyData, type LiveState} from '../../lib/earn/client';
import {recordEarnSnapshot} from '../../lib/earn/snapshot';
import {browserPollEnv, visiblePoll} from '../../lib/earn/visible-poll';

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
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => { const t = window.setInterval(() => setNow(Date.now()), 30_000); return () => window.clearInterval(t); }, []);
  return now;
}
