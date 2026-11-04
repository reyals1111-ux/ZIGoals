'use client';
import {useDeviceRecord} from '../../ai/use-device-record';
import {NOVA_HUD, hudLookOf, type HudLook} from '../../../lib/nova/layout';

/** Session AL Part 11 (lane L8): NOVA's HUD record (`zigoals:nova-hud:v1`, device-only) and the look in effect. */
export function useHudRecord() {
  const hud = useDeviceRecord(NOVA_HUD);
  // Until the record has been read, Holo (the default) draws: a Classic choice switches over on the first read.
  const look: HudLook = hud.loaded && !hud.unreadable ? hudLookOf(hud.data) : 'holo';
  return {hud, look};
}
