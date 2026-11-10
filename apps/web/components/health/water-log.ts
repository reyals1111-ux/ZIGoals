'use client';
import {addWater} from '../../lib/health-daily';
import type {HealthData, WaterEntry} from '../../lib/health';
import {changeWithUndo} from '../ui/remove-with-undo';

/**
 * Session AL (NB-081, NB-089, P-NB-27): one way to log water from a tap (Health's water buttons, Today's water tile, any
 * one-tap caller): the save goes through the store's own `update`, then the app's one toast offers Undo, and Undo
 * removes exactly the entry this tap added from the LATEST record (changeWithUndo compares the record before and after
 * the save). An entry logged since, here or in another tab, is kept. Resolves to the new entry's id.
 */
export async function logWaterWithUndo(
  update: (updater: (latest: HealthData) => HealthData) => unknown,
  entry: Pick<WaterEntry, 'id' | 'date' | 'amountMilli' | 'unit'>,
  label: string,
): Promise<string> {
  await changeWithUndo(update, latest => addWater(latest, entry, new Date().toISOString()), `Water logged: ${label}.`, {undone: 'Water entry removed.'});
  return entry.id;
}
