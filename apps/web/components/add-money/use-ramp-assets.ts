'use client';
import {useEffect, useState} from 'react';
import {rampAssetsWire, type RampAssets} from '../../lib/onramps/ramp-assets';

/**
 * Session AF (L2b, Part 4, ADR-028 H35, H89): Ramp's live asset list through ZIGoals' own address-free route, once per page
 * and currency. A failed or unreadable answer is "unavailable" (the page then states no Ramp figure at all).
 */
export type RampState = {phase: 'loading'} | {phase: 'ready'; data: RampAssets} | {phase: 'failed'};
export function useRampAssets(currency: 'USD' | 'EUR'): RampState {
  const [state, setState] = useState<RampState>({phase: 'loading'});
  useEffect(() => {
    let alive = true;
    setState({phase: 'loading'});
    void fetch(`/api/onramps/ramp-assets?currency=${currency}`, {credentials: 'omit', referrerPolicy: 'no-referrer', redirect: 'error', cache: 'no-store', signal: AbortSignal.timeout(20_000)})
      .then(async r => { const parsed = rampAssetsWire.safeParse(await r.json()); if (alive) setState(parsed.success ? {phase: 'ready', data: parsed.data} : {phase: 'failed'}); })
      .catch(() => { if (alive) setState({phase: 'failed'}); });
    return () => { alive = false; };
  }, [currency]);
  return state;
}
