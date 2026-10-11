'use client';
import {useCallback, useEffect, useMemo, useState} from 'react';
import {ACCOUNT_CHANGE} from '../../lib/account-session';
import {getAppStorage} from '../../lib/showcase-storage';
import {WEEKLY_REVIEW_KEY, emptyWeeklyReview, type WeeklyReview} from '../../lib/weekly-review/schema';
import {readWeeklyReview, startOverWeeklyReview, updateWeeklyReview} from '../../lib/weekly-review/store';
import {DASHBOARD_SETTINGS_KEY, dashboardSettingsSchema, emptyDashboardSettings} from '../../lib/dashboard-settings';
import {SYNC_WRITES} from '../../lib/vault/sync-writes';
import {weeklyReviewIn} from '../../lib/vault/sync-homes';
import {updateHome} from '../../lib/sync-homes-store';
import {usePrivateStore} from '../use-private-store';
import {useSharedHealth} from '../use-shared-health';
import {useDeviceMerge} from '../use-device-merge';

const EVENT = 'zigoals:weekly-review-change';
/** This device's weekly reviews (lib/weekly-review), switch off. Read after mount; only the review's own actions and the Settings day field write. */
function useDeviceWeeklyReview() {
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
  const update = useCallback(async (change: (current: WeeklyReview) => WeeklyReview) => {
    const next = updateWeeklyReview(getAppStorage(), change);
    setState({data: next, unreadable: false, loaded: true});
    window.dispatchEvent(new Event(EVENT));
    return next;
  }, []);
  const startOver = useCallback(async () => {
    const next = startOverWeeklyReview(getAppStorage());
    setState({data: next, unreadable: false, loaded: true});
    window.dispatchEvent(new Event(EVENT));
    return next;
  }, []);
  return {...state, error: '', update, startOver};
}

/**
 * Switch on: the review lives in settings v2 (`weeklyReview`) and its Health notes in Health v3 (`reviewNotes`, synced
 * only under the Health consent), merged with this device's key. The same actions write; nothing is written on view.
 */
function useHomeWeeklyReview() {
  const settings = usePrivateStore(DASHBOARD_SETTINGS_KEY, dashboardSettingsSchema, emptyDashboardSettings), health = useSharedHealth();
  const error = settings.error || health.error, ready = settings.loaded && health.loaded && !error;
  const settled = useDeviceMerge(ready);
  const data = useMemo(() => weeklyReviewIn(settings.data, health.data), [settings.data, health.data]);
  const update = useCallback((change: (current: WeeklyReview) => WeeklyReview) => updateHome('weeklyReview', change), []);
  const startOver = useCallback(async (): Promise<WeeklyReview> => { throw Error(error || 'Nothing was changed.'); }, [error]);
  return {data, unreadable: !!error, error, loaded: settings.loaded && health.loaded && (settled || !!error), update, startOver};
}

export const useWeeklyReview: () => ReturnType<typeof useDeviceWeeklyReview> = SYNC_WRITES ? useHomeWeeklyReview : useDeviceWeeklyReview;
export type WeeklyReviewStore = ReturnType<typeof useWeeklyReview>;
