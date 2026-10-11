/**
 * The few fields of the ZIGi device record (`zigoals:ai:v1`, settings.ts) that the launcher shell needs on every app
 * page, read with plain checks so the shell ships without the Zod schema. Read-tolerant like the full reader: anything
 * unreadable or malformed reads as "off, launcher shown" and is never rewritten by a read. No secret lives here.
 */
export const AI_SETTINGS_KEY = 'zigoals:ai:v1';
/** Dispatched on window after any save of the record, so every reader refreshes. */
export const AI_SETTINGS_EVENT = 'zigoals:ai-settings';
export type LauncherRecord = {enabled: boolean; mode: 'api' | 'local' | 'subscription' | null; provider: string | null; subscriptionApp: string | null; launcherHidden: boolean};
export const DEFAULT_LAUNCHER_RECORD: LauncherRecord = {enabled: false, mode: null, provider: null, subscriptionApp: null, launcherHidden: false};
const str = (v: unknown): string | null => typeof v === 'string' && v.length > 0 && v.length <= 200 ? v : null;
export function readLauncherRecord(storage: Pick<Storage, 'getItem'>): LauncherRecord {
  let raw: string | null;
  try { raw = storage.getItem(AI_SETTINGS_KEY); } catch { return DEFAULT_LAUNCHER_RECORD; }
  if (raw === null) return DEFAULT_LAUNCHER_RECORD;
  try {
    const v: unknown = JSON.parse(raw);
    if (!v || typeof v !== 'object' || (v as {version?: unknown}).version !== 1) return DEFAULT_LAUNCHER_RECORD;
    const o = v as Record<string, unknown>, mode = o.mode;
    return {
      enabled: o.enabled === true,
      mode: mode === 'api' || mode === 'local' || mode === 'subscription' ? mode : null,
      provider: str(o.provider),
      subscriptionApp: str(o.subscriptionApp),
      launcherHidden: o.launcherHidden === true,
    };
  } catch { return DEFAULT_LAUNCHER_RECORD; }
}
