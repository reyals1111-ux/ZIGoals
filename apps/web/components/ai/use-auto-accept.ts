'use client';
import {useCallback, useMemo} from 'react';
import {autoAcceptVerdict, noteAutoAccept, type AutoAcceptVerdict} from '../../lib/ai/actions/auto-accept';
import {AI_OPTIONS} from '../../lib/ai/store/records';
import {readDeviceRecord} from '../../lib/device-record';
import {getAppStorage} from '../../lib/showcase-storage';
import {localDate} from '../../lib/local-date';
import {useDeviceRecord} from './use-device-record';

/**
 * Auto-accept in the chat (Session X-Local Part 5b): the verdict for a card's kind now, against the person's switches,
 * today's count and the Health gate of this very moment (`healthOpen` comes from the page's consent, fail-closed), and
 * the count's bookkeeping. An unreadable options record means nothing is automatic.
 */
export type AutoAccept = {ready: boolean; verdict: (kind: string, extra?: number) => AutoAcceptVerdict;
  /**
   * Session Y Part 4 (SECURITY_REVIEW_Y F2): the slot under today's cap is taken from the stored record itself, right
   * before the write it counts, so lists that run in the same moment never all see the same count. A refusal, with
   * nothing counted, when the kind is no longer allowed now (cap reached, switched off, Health gate closed, record
   * unreadable). A write that then fails keeps its slot: the cap is a ceiling, never exceeded.
   */
  reserve: (kind: string) => AutoAcceptVerdict};
export function useAutoAccept(healthOpen: boolean): AutoAccept {
  const options = useDeviceRecord(AI_OPTIONS);
  const verdict = useCallback((kind: string, extra = 0): AutoAcceptVerdict => options.unreadable ? {ok: false, reason: 'off'} : autoAcceptVerdict(options.data, kind, localDate(), healthOpen, extra), [options.data, options.unreadable, healthOpen]);
  const reserve = useCallback((kind: string): AutoAcceptVerdict => {
    try {
      const day = localDate(), read = readDeviceRecord(getAppStorage(), AI_OPTIONS);
      if (read.unreadable) return {ok: false, reason: 'off'};
      const verdict = autoAcceptVerdict(read.data, kind, day, healthOpen);
      if (verdict.ok) options.update(o => noteAutoAccept(o, day));
      return verdict;
    } catch { return {ok: false, reason: 'off'}; }
  }, [options, healthOpen]);
  return useMemo(() => ({ready: options.loaded, verdict, reserve}), [options.loaded, verdict, reserve]);
}
