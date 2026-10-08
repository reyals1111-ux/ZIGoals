'use client';
import {useCallback, useMemo} from 'react';
import {autoAcceptVerdict, noteAutoAccept, type AutoAcceptVerdict} from '../../lib/ai/actions/auto-accept';
import {AI_OPTIONS} from '../../lib/ai/store/records';
import {localDate} from '../../lib/local-date';
import {useDeviceRecord} from './use-device-record';

/**
 * Auto-accept in the chat (Session X-Local Part 5b): the verdict for a card's kind now, against the person's switches,
 * today's count and the Health gate of this very moment (`healthOpen` comes from the page's consent, fail-closed), and
 * the count's bookkeeping. An unreadable options record means nothing is automatic.
 */
export type AutoAccept = {ready: boolean; verdict: (kind: string, extra?: number) => AutoAcceptVerdict; note: () => void};
export function useAutoAccept(healthOpen: boolean): AutoAccept {
  const options = useDeviceRecord(AI_OPTIONS);
  const verdict = useCallback((kind: string, extra = 0): AutoAcceptVerdict => options.unreadable ? {ok: false, reason: 'off'} : autoAcceptVerdict(options.data, kind, localDate(), healthOpen, extra), [options.data, options.unreadable, healthOpen]);
  const note = useCallback(() => { try { options.update(o => noteAutoAccept(o, localDate())); } catch { /* the record itself was written; only the cap's count is missing, and an unreadable record stops auto-accept */ } }, [options]);
  return useMemo(() => ({ready: options.loaded, verdict, note}), [options.loaded, verdict, note]);
}
