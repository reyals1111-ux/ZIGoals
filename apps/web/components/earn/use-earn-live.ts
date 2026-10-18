'use client';
import {useEffect, useRef, useState} from 'react';
import {EARN_FAMILIES, readEarn, readValidators, type EarnFamily, type FamilyData, type LiveState} from '../../lib/earn/client';

/**
 * Session AF (L1): one live family on the Earn page. Read on mount, then again every `pollMs` (2 minutes for the chain
 * and the apps, 10 for DefiLlama) only while the page is visible: a hidden tab reads nothing, and coming back reads at
 * once if the last read is older than the cadence. The last answer is kept in memory only, never stored.
 */
export function useEarnLive<F extends EarnFamily>(family: F): LiveState<FamilyData[F]> {
  const [state, setState] = useState<LiveState<FamilyData[F]>>({phase: 'loading'});
  const last = useRef(0);
  useEffect(() => {
    let alive = true, timer = 0, busy = false;
    const {pollMs} = EARN_FAMILIES[family];
    const read = async () => {
      if (busy || document.visibilityState !== 'visible') return;
      busy = true; last.current = Date.now();
      try {
        const next = (family === 'validators' ? await readValidators() : await readEarn(family as Exclude<EarnFamily, 'validators'>)) as LiveState<FamilyData[F]>;
        if (alive) setState(current => next.phase === 'unavailable' && current.phase === 'ok' && Date.now() - Date.parse(current.answer.fetchedAt) < 10 * 60_000 ? {phase: 'ok', answer: {...current.answer, stale: true, reason: next.reason === 'NOT_IN_THIS_BUILD' ? undefined : next.reason}} : next);
      } finally { busy = false; }
    };
    const schedule = () => { window.clearTimeout(timer); timer = window.setTimeout(async () => { await read(); if (alive) schedule(); }, pollMs); };
    const onVisible = () => { if (document.visibilityState === 'visible' && Date.now() - last.current >= pollMs) { void read(); schedule(); } };
    void read(); schedule();
    document.addEventListener('visibilitychange', onVisible);
    return () => { alive = false; window.clearTimeout(timer); document.removeEventListener('visibilitychange', onVisible); };
  }, [family]);
  return state;
}
/** A clock for "updated x min ago", ticking every 30 seconds. */
export function useMinuteClock(): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => { const t = window.setInterval(() => setNow(Date.now()), 30_000); return () => window.clearInterval(t); }, []);
  return now;
}
