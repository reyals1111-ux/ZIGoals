import {PRIVATE_MAX_BYTES} from './private-storage';
import {isDurableMarker} from './vault/local';
import {MODULE_KEYS} from './export/everything';

/**
 * Session AK (owner amendment A6): how full each of the four private modules is on this device. Each is capped at
 * PRIVATE_MAX_BYTES (2 MB) in browser storage; a module kept in the account vault's durable store (IndexedDB, a marker
 * in browser storage) has room to spare and is left out. At 75 % the app says so once a day, calmly, with what to do.
 */
export const NEARLY_FULL = 0.75;
export type ModuleUse = {module: keyof typeof MODULE_KEYS; bytes: number; share: number};
const LABELS: Record<keyof typeof MODULE_KEYS, string> = {finance: 'Goals and Wealth', habits: 'Habits', health: 'Health', settings: 'Settings'};
export function moduleUse(storage: Pick<Storage, 'getItem' | 'length' | 'key'>): ModuleUse[] {
  const out: ModuleUse[] = [];
  for (const [module, key] of Object.entries(MODULE_KEYS) as [keyof typeof MODULE_KEYS, string][]) {
    // A key can be scoped per account (`…:zigoals:habits:v1`): the largest copy on this device counts.
    let bytes = 0;
    for (let i = 0; i < storage.length; i++) {
      const k = storage.key(i); if (!k || !(k === key || k.endsWith(`:${key}`) || k.endsWith(key))) continue;
      const raw = storage.getItem(k); if (raw === null || isDurableMarker(raw)) continue;
      bytes = Math.max(bytes, new TextEncoder().encode(raw).byteLength);
    }
    out.push({module, bytes, share: bytes / PRIVATE_MAX_BYTES});
  }
  return out;
}
/** The calm line to show, or null when every module has room. */
export function headroomMessage(use: ModuleUse[]): string | null {
  const full = use.filter(u => u.share >= NEARLY_FULL).sort((a, b) => b.share - a.share);
  if (!full.length) return null;
  const first = full[0]!, mb = (n: number) => (n / 1_000_000).toFixed(1);
  return `${LABELS[first.module]} on this device is nearly full (${mb(first.bytes)} of ${mb(PRIVATE_MAX_BYTES)} MB). Export everything first, then remove old imports or photos, or keep your records in the account vault.`;
}
