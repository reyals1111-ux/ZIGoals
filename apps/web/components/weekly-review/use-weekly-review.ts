'use client';
import {useCallback, useEffect, useState} from 'react';
import {ACCOUNT_CHANGE} from '../../lib/account-session';
import {getAppStorage} from '../../lib/showcase-storage';
import {WEEKLY_REVIEW_KEY, emptyWeeklyReview, type WeeklyReview} from '../../lib/weekly-review/schema';
import {readWeeklyReview, startOverWeeklyReview, updateWeeklyReview} from '../../lib/weekly-review/store';

const EVENT = 'zigoals:weekly-review-change';
/** This device's weekly reviews (lib/weekly-review). Read after mount; only the review's own actions and the Settings day field write. */
export function useWeeklyReview() {
  const [state, setState] = useState<{data: WeeklyReview; unreadable: boolean; loaded: boolean}>({data: emptyWeeklyReview(), unreadable: false, loaded: false});
  const refresh = useCallback(() => {
    try { setState({...readWeeklyReview(getAppStorage()), loaded: true}); } catch { setState({data: emptyWeeklyReview(), unreadable: true, loaded: true}); }
  }, []);
  useEffect(() => {
    let active = true;
    queueMicrotask(() => { if (active) refresh(); });
    const onStorage = (event: StorageEvent) => { if (!event.key || event.key.endsWith(WEEKLY_REVIEW_KEY)) refresh(); };
    window.addEventListener('storage', onStorage); window.addEventListener(EVENT, refresh); window.addEventListener(ACCOUNT_CHANGE, refresh);
    return () => { active = false; window.removeEventListener('storage', onStorage); window.removeEventListener(EVENT, refresh); window.removeEventListener(ACCOUNT_CHANGE, refresh); };
  }, [refresh]);
  const update = useCallback((change: (current: WeeklyReview) => WeeklyReview) => {
    const next = updateWeeklyReview(getAppStorage(), change);
    setState({data: next, unreadable: false, loaded: true});
    window.dispatchEvent(new Event(EVENT));
    return next;
  }, []);
  const startOver = useCallback(() => {
    const next = startOverWeeklyReview(getAppStorage());
    setState({data: next, unreadable: false, loaded: true});
    window.dispatchEvent(new Event(EVENT));
    return next;
  }, []);
  return {...state, update, startOver};
}
export type WeeklyReviewStore = ReturnType<typeof useWeeklyReview>;
