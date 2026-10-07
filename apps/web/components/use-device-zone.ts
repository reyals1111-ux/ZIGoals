'use client';
import {useSyncExternalStore} from 'react';
import {deviceTimeZone} from '../lib/journal-zone';

const unchanging = () => () => {};
/**
 * This device's time zone in a component (Session W Part 17): null on the server and while the page hydrates, so no
 * server-rendered text ever names the server's zone (it would differ from the browser's), then the device's own.
 */
export function useDeviceZone(): string | null {
  return useSyncExternalStore(unchanging, deviceTimeZone, () => null);
}
