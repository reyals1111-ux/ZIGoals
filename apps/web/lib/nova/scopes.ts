import * as z from 'zod';
import {readDeviceRecord} from '../device-record';
import {DEFAULT_NOVA_SCOPES, NOVA_SCOPES, type NovaScope, type NovaScopes} from '../ai/context-pack/nova';
import {NOVA_SETUP, novaSetupSchema, type NovaSetup} from './setup';

/**
 * NOVA's per-pillar read permissions (Session AK, owner follow-up 2 N2/N4): the eight scopes lane NE's context pack reads
 * (`NovaScopes`, lib/ai/context-pack/nova.ts), kept as an optional `scopes` field of the loose setup record
 * `zigoals:nova-setup:v1` (TIER 3 (stored format): additive; NC's schema is loose, so its builds keep the field on their
 * writes). Each scope the person never touched reads as NE's default — Health, Notes and the Journal off — and Health
 * also needs ZIGi's own three-part Health gate wherever it is read. A value this build cannot read falls back to the
 * default of that scope, never to "on".
 */
export const novaScopesSchema = z.looseObject(Object.fromEntries(NOVA_SCOPES.map(s => [s, z.boolean().optional().catch(undefined)])) as Record<NovaScope, z.ZodCatch<z.ZodOptional<z.ZodBoolean>>>);
export type StoredScopes = z.infer<typeof novaScopesSchema>;
/** The stored choices over NE's defaults. */
export function scopesOf(record: NovaSetup): NovaScopes {
  const parsed = novaScopesSchema.safeParse((record as {scopes?: unknown}).scopes ?? {});
  const stored: StoredScopes = parsed.success ? parsed.data : {};
  return Object.fromEntries(NOVA_SCOPES.map(s => [s, stored[s] ?? DEFAULT_NOVA_SCOPES[s]])) as NovaScopes;
}
/** One scope on or off; the other stored choices stay as they are. */
export function setScope(record: NovaSetup, scope: NovaScope, on: boolean): NovaSetup {
  const was = novaScopesSchema.safeParse((record as {scopes?: unknown}).scopes ?? {});
  return novaSetupSchema.parse({...record, version: 1, scopes: {...(was.success ? was.data : {}), [scope]: on}});
}
/** Back to the defaults (Health, Notes and the Journal off): the field goes. */
export function resetScopes(record: NovaSetup): NovaSetup { const next: Record<string, unknown> = {...record}; delete next.scopes; return novaSetupSchema.parse(next); }
/** The scopes on this device; an unreadable record reads as the defaults (the sensitive ones stay off). */
export function readNovaScopes(storage: Pick<Storage, 'getItem'>): NovaScopes {
  try { const read = readDeviceRecord(storage, NOVA_SETUP); return read.unreadable ? {...DEFAULT_NOVA_SCOPES} : scopesOf(read.data); } catch { return {...DEFAULT_NOVA_SCOPES}; }
}
