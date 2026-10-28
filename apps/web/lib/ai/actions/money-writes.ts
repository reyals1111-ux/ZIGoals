import {addEntry} from '../../money-log/engine';
import {MONEY_LOG, MONEY_LOG_KEY, moneyEntrySchema, type MoneyLog} from '../../money-log/schema';
import {registerDeviceWrite, type Entry} from './device-writes';

/**
 * Session AI (B3, feature 5): the expense log joins the device records a ZIGi card may change, through its own entry. The
 * one patch is `{add: entry}`, checked against the entry's own schema before it is written; a removal happens on the
 * Spending list itself (with Undo there). Loaded with the planner chunk, before any money card can exist.
 */
const object = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
export const moneyLogEntry: Entry<MoneyLog> = {spec: MONEY_LOG, apply: (log, patch) => {
  if (!object(patch) || !object(patch.add)) throw new Error('That change is not one a card can make.');
  const entry = moneyEntrySchema.safeParse(patch.add);
  if (!entry.success) throw new Error('That amount cannot be logged as proposed; check it on Wealth → Spending.');
  return addEntry(log, entry.data);
}};
registerDeviceWrite(MONEY_LOG_KEY, moneyLogEntry);
