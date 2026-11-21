'use client';
import {Suspense, lazy} from 'react';
import {useDeviceRecord} from '../ai/use-device-record';
import {PRICE_ALERTS} from '../../lib/price-alerts/schema';
import {anyActive} from '../../lib/price-alerts/engine';

/**
 * Session AJ (item 15, D9): on a page that reads prices, the alerts are checked against them — and the checking code
 * loads only when the person has an alert waiting (new features load on use).
 */
const PriceAlertWatcher = lazy(() => import('./price-alerts').then(m => ({default: m.PriceAlertWatcher})));
export function PriceAlertWatchGate() {
  const alerts = useDeviceRecord(PRICE_ALERTS);
  // Session AV (fresh-agent check q2, rank 35): a portfolio-value alert waiting loads the check too.
  if (!alerts.loaded || alerts.unreadable || !anyActive(alerts.data)) return null;
  return <Suspense fallback={null}><PriceAlertWatcher/></Suspense>;
}
