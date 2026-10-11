import * as z from 'zod';

/**
 * The one-time "What's new" card (Session P): a device-only flag, shown once per device and never during onboarding.
 * {version: 1, dismissed: [releaseId]} holds no personal content; unreadable bytes count as dismissed (fail closed).
 */
export const WHATS_NEW_KEY = 'zigoals:whats-new:v1';
/**
 * Session X-Local bumped the release so the card showed once more (ZIGi comes alive; docs/handoff/X_LOCAL_TO_CLOUD.md);
 * Session Y bumps it again for its visible changes (ADR-018 Y40). Same key and schema: an earlier build reads the id as
 * one more dismissed string.
 */
export const WHATS_NEW_RELEASE = '2026-10-session-y';
export const whatsNewSchema = z.strictObject({version: z.literal(1), dismissed: z.array(z.string().min(1).max(40)).max(50)});
export type WhatsNew = z.infer<typeof whatsNewSchema>;
type Read = Pick<Storage, 'getItem'>;
type ReadWrite = Pick<Storage, 'getItem' | 'setItem'>;
/** True when this release's card was dismissed on this device, or when the flag cannot be read (then it is never shown). */
export function whatsNewSeen(storage: Read, release = WHATS_NEW_RELEASE): boolean {
  let raw: string | null;
  try { raw = storage.getItem(WHATS_NEW_KEY); } catch { return true; }
  if (raw === null) return false;
  try { const parsed = whatsNewSchema.safeParse(JSON.parse(raw)); return parsed.success ? parsed.data.dismissed.includes(release) : true; } catch { return true; }
}
/** Records "Got it"; earlier releases' ids are kept. Returns false when storage refused (the card may then return once). */
export function dismissWhatsNew(storage: ReadWrite, release = WHATS_NEW_RELEASE): boolean {
  try {
    const raw = storage.getItem(WHATS_NEW_KEY);
    let current: WhatsNew = {version: 1, dismissed: []};
    if (raw !== null) { const parsed = whatsNewSchema.safeParse(JSON.parse(raw)); if (parsed.success) current = parsed.data; }
    const dismissed = current.dismissed.includes(release) ? current.dismissed : [...current.dismissed, release].slice(-50);
    storage.setItem(WHATS_NEW_KEY, JSON.stringify(whatsNewSchema.parse({version: 1, dismissed})));
    return true;
  } catch { return false; }
}
