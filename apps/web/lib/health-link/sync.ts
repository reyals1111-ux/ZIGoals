import {forgetTokens, readTokens, sealTokens, type LinkTokens} from '../links/token-store';
import {emptyItems, type ImportItems} from '../import/switch/apply';
import {LinkError, linkData, refreshTokens} from './client';
import {LINK_REQUESTS, mapResponses, type LinkWindow} from './mappers';
import {userIdOf} from './flow';
import {localDay} from '../import/switch/common';
import type {LinkProvider} from './providers';

/**
 * One sync of a linked service (Session W Part 8): the sealed tokens, refreshed first when they are about to expire (one
 * refresh at a time across tabs, under a Web Lock, because Oura, Withings and Strava rotate refresh tokens and a second
 * refresh with the old one would fail), then the provider's named requests for the last 30 days, mapped
 * to the same records an import makes (deterministic ids, so a record already here is never doubled). The caller
 * previews and writes them under the Health store's size rule. A refresh the service refuses removes the tokens and asks
 * to connect again.
 */
export class ReconnectRequired extends Error { constructor(readonly provider: LinkProvider) { super('The link expired or was removed at the service. Connect again.'); this.name = 'ReconnectRequired'; } }
const withLock = <T,>(name: string, work: () => Promise<T>): Promise<T> => { const locks = (globalThis.navigator as Navigator | undefined)?.locks; return locks ? locks.request(name, work) as unknown as Promise<T> : work(); };
/** Fresh tokens for a call: the stored ones, or refreshed ones (sealed again before use). */
export async function freshTokens(account: string, scope: string, provider: LinkProvider, now = Date.now()): Promise<LinkTokens> {
  return withLock(`zigoals-link-${scope}-${provider}`, async () => {
    const tokens = await readTokens(scope, provider);
    if (!tokens) throw new ReconnectRequired(provider);
    const expires = tokens.expiresAt ? Date.parse(tokens.expiresAt) : Infinity;
    if (expires > now + 60_000) return tokens;
    if (!tokens.refreshToken) { await forgetTokens(scope, provider); throw new ReconnectRequired(provider); }
    try {
      const next = await refreshTokens(account, provider, tokens.refreshToken);
      // The rotated refresh token replaces the old one; the service's user id stays (flow.ts keeps it as `user:<id>`).
      const user = next.userId ?? userIdOf(tokens);
      const sealed: LinkTokens = {accessToken: next.accessToken, refreshToken: next.refreshToken ?? tokens.refreshToken, ...(next.expiresAt ? {expiresAt: next.expiresAt} : {}), ...(user ? {scope: `user:${user}`} : {})};
      await sealTokens(scope, provider, sealed);
      return sealed;
    } catch (error) {
      if (error instanceof LinkError && (error.code === 'RECONNECT_REQUIRED' || error.code === 'TOKEN_EXPIRED')) { await forgetTokens(scope, provider); throw new ReconnectRequired(provider); }
      throw error;
    }
  });
}
/** Records from a linked service over the last 30 days (the services' own windows), days counted in the journal's zone. */
export async function syncLink(account: string, scope: string, provider: LinkProvider, {zone, now = Date.now(), days = 30}: {zone: string; now?: number; days?: number}): Promise<ImportItems> {
  const tokens = await freshTokens(account, scope, provider, now);
  const from = now - days * 86_400_000, responses: Record<string, unknown[]> = {};
  const window: LinkWindow = {fromDay: localDay(from, zone), toDay: localDay(now, zone), fromEpoch: Math.floor(from / 1000), toEpoch: Math.floor(now / 1000)};
  for (const request of LINK_REQUESTS[provider]) {
    const pages: unknown[] = [];
    let params: Record<string, string> | undefined = request.params?.(window);
    for (let page = 0; page < 10; page++) {
      let json: unknown;
      try { json = await linkData(account, provider, tokens.accessToken, request.name, params); }
      catch (error) { if (error instanceof LinkError && error.code === 'TOKEN_EXPIRED') { await forgetTokens(scope, provider); throw new ReconnectRequired(provider); } throw error; }
      pages.push(json);
      const next = request.next?.(json, params, page, window);
      if (!next) break;
      params = next;
    }
    responses[request.name] = pages;
  }
  return mapResponses(provider, responses, {zone, now}) ?? emptyItems();
}
