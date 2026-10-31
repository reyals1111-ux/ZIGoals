import {AUTO_RULES} from '../../auto-rules/schema';
import {BILLS} from '../../bills/schema';
import {readDeviceRecord, type DeviceRecordSpec} from '../../device-record';
import {PRICE_ALERTS} from '../../price-alerts/schema';
import type {AkToolSources} from './ak-tools';

/**
 * Session AK (Part 12): the three device records ZIGi's AK tools read, read at the moment of the question (like the rest
 * of the tool sources). A record that cannot be read is null: its tool then says nothing is kept, and nothing is guessed.
 */
type Read = {getItem(key: string): string | null};
export function readAkToolSources(storage: Read): AkToolSources {
  const one = <T>(spec: DeviceRecordSpec<T>): T | null => { try { const r = readDeviceRecord(storage, spec); return r.unreadable ? null : r.data; } catch { return null; } };
  return {autoRules: one(AUTO_RULES), bills: one(BILLS), priceAlerts: one(PRICE_ALERTS)};
}
