'use client';
import {useDeviceRecord} from '../ai/use-device-record';
import {AVERAGE_GOALS} from '../../lib/average-goals/store';

/** This device's average goals (G8); its own module so Goals reads them without loading the goal extras. */
export function useAverageGoals() {
  return useDeviceRecord(AVERAGE_GOALS);
}
