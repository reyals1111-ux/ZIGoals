'use client';
import {useEffect, useState} from 'react';
import {checklistDay, checklistZone} from '../../lib/checklist/day';
import {everyHalfMinute} from '../half-minute';
import {useJournalZone} from '../use-journal-zone';

/**
 * The Checklist's day in a component (ADR-028 H66): local midnight in the journal zone, else the device's. Read after
 * mount (null on the server and the first paint), then again every half minute, on focus, when the tab shows again and
 * when the journal zone changes, so the path resets at midnight while it is open.
 */
export function useChecklistDay(): {date: string | null; zone: string | null} {
  const journal = useJournalZone().zone, [state, setState] = useState<{date: string | null; zone: string | null}>({date: null, zone: null});
  useEffect(() => {
    const refresh = () => { const zone = checklistZone(), date = checklistDay(new Date(), zone); setState(s => s.date === date && s.zone === zone ? s : {date, zone}); };
    refresh();
    const stop = everyHalfMinute(refresh), onVisible = () => { if (document.visibilityState === 'visible') refresh(); };
    window.addEventListener('focus', refresh); document.addEventListener('visibilitychange', onVisible);
    return () => { stop(); window.removeEventListener('focus', refresh); document.removeEventListener('visibilitychange', onVisible); };
  }, [journal]);
  return state;
}
