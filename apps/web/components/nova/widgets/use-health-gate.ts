'use client';
import {dailyData} from '../../../lib/health-daily';
import {scopesOf} from '../../../lib/nova/scopes';
import {NOVA_SETUP} from '../../../lib/nova/setup';
import {useDeviceRecord} from '../../ai/use-device-record';
import {useHealth} from '../../health/use-health';
import {useHealthToday} from '../../health/use-health-today';

/**
 * Session AM-2 (step 3, "NOVA connected"; ADR-037 Q14, Q16; ADR-040 owner addition 1): the Health switch, read again
 * inside the body of the widgets that show health-type records Session AP added (mood tags, symptoms, run splits).
 *
 * The frame already holds a made or pinned widget of this catalogue behind its gate (components/nova/widget-grid.tsx with
 * components/nova/stage/use-stage.ts: NOVA's Health permission AND the device's Health switch). This is the second lock,
 * on the body itself: wherever one of these bodies is drawn, it shows nothing unless NOVA's Health permission is on — so
 * a way of drawing a widget that has no stage gates (an arrangement preview, a later layout) can never show these
 * records. 'reading': the permission is not read yet (nothing is shown meanwhile); 'locked': off, or unreadable.
 */
export type HealthGate = 'reading' | 'locked' | 'open';
export function useHealthGate(): HealthGate {
  const setup = useDeviceRecord(NOVA_SETUP);
  if (!setup.loaded) return 'reading';
  return !setup.unreadable && scopesOf(setup.data).health ? 'open' : 'locked';
}
/** The Health journal's day (its own time zone when the journal has one), as the Health page reads it. */
export function useHealthDay(): string {
  const health = useHealth();
  return useHealthToday(health.loaded && !health.error ? dailyData(health.data).preferences.timezone : null);
}
