import type {HealthData} from '../health';
import {forgetTokens, readTokens, sealTokens, type LinkTokens} from '../links/token-store';
import {previewImport, sizeCheck, type ImportItems} from '../import/switch/apply';
import {exchangeCode, registerPolar, revokeLink} from './client';
import type {LinkProvider} from './providers';

/**
 * The steps of linking a service, outside the page so they can be tested end to end with MOCK answers (Session W
 * Part 8). The service's user id (Withings and Polar need it to revoke) is kept inside the sealed tokens as
 * `user:<id>` in their `scope` field: the token store's format stays as it is, and the OAuth scope itself is not used.
 */
const USER = 'user:';
export const userIdOf = (tokens: LinkTokens | null): string | undefined => tokens?.scope?.startsWith(USER) ? tokens.scope.slice(USER.length) : undefined;
/** The provider's code exchanged (Polar's required registration next), the tokens sealed on this device. */
export async function finishLink(scope: string, provider: LinkProvider, code: string, verifier?: string, memberId: () => string = () => crypto.randomUUID()): Promise<void> {
  const tokens = await exchangeCode(scope, provider, code, verifier);
  if (provider === 'polar') await registerPolar(scope, tokens.accessToken, memberId());
  await sealTokens(scope, provider, {
    accessToken: tokens.accessToken,
    ...(tokens.refreshToken ? {refreshToken: tokens.refreshToken} : {}),
    ...(tokens.expiresAt ? {expiresAt: tokens.expiresAt} : {}),
    ...(tokens.userId ? {scope: `${USER}${tokens.userId}`} : {}),
  });
}
/** What a sync adds, or why it adds nothing: the import's preview under the Health store's size limit. */
export function syncedHealth(latest: HealthData, items: ImportItems, limit: number): {next: HealthData; added: number} {
  const r = previewImport(latest, items);
  if (!sizeCheck(r.next, limit).fits) throw Error('Your Health storage is full, so nothing new was brought in.');
  return {next: r.next, added: r.preview.sleep.added + r.preview.meditation.added + r.preview.vitals.added + r.preview.activity.added + r.preview.weights.added};
}
/** Disconnect: revoke at the service where it offers a way (best effort), then forget the tokens whatever happened. */
export async function unlink(scope: string, provider: LinkProvider): Promise<{revoked: boolean}> {
  let revoked = false;
  try { const tokens = await readTokens(scope, provider); if (tokens) revoked = await revokeLink(scope, provider, tokens.accessToken, userIdOf(tokens)); } catch { revoked = false; }
  await forgetTokens(scope, provider).catch(() => undefined);
  return {revoked};
}
