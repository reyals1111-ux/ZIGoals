import type {Fetcher} from './upstream';

/**
 * Session AF (L1): replays a recorded Earn fixture (lib/earn/fixtures/live-*.json, written by
 * scripts/earn/record-live-fixture.test.ts) as the routes' `fetch`, for unit tests only. A request is answered only when
 * the fixture holds that exact URL with the same block-height header; anything else is a network failure, so a reader
 * that asks for something new fails its test instead of passing on a guess. `override` replaces chosen answers (a 500, a
 * timeout, a body out of range).
 */
export type FixtureRequest = {url: string; height: string | null; status: number; responseHeight: string | null; body: unknown};
export type Fixture = {version: 1; recordedAt: string; answers: Record<string, unknown>; requests: FixtureRequest[]};
export function fixtureFetcher(fixture: Pick<Fixture, 'requests'>, {override, calls, latest}: {override?: (url: string, init: RequestInit, recorded: FixtureRequest | undefined) => Response | Promise<Response> | undefined; calls?: string[];
  /** Several readers each asked for the latest block: the recorded one at this height answers (each reader's own read). */
  latest?: string} = {}): Fetcher {
  return async (url, init) => {
    calls?.push(url);
    const height = (init.headers as Record<string, string> | undefined)?.['x-cosmos-block-height'] ?? null;
    const same = fixture.requests.filter(r => r.url === url && r.height === height);
    const recorded = (latest && height === null ? same.find(r => r.responseHeight === latest || (r.body as {block?: {header?: {height?: string}}})?.block?.header?.height === latest) : undefined) ?? same[0];
    const replaced = await override?.(url, init, recorded);
    if (replaced) return replaced;
    if (!recorded) throw new TypeError('The fixture holds no answer for this request.');
    const headers = new Headers({'content-type': 'application/json'});
    if (recorded.responseHeight) headers.set('x-cosmos-block-height', recorded.responseHeight);
    return new Response(typeof recorded.body === 'string' ? recorded.body : JSON.stringify(recorded.body), {status: recorded.status, headers});
  };
}
/** A copy of a recorded body with `change` applied, as the JSON answer of `status`. */
export function changedAnswer(recorded: FixtureRequest | undefined, change: (body: never) => unknown, height?: string | null): Response {
  const body = change(structuredClone(recorded?.body) as never);
  const headers = new Headers({'content-type': 'application/json'});
  const h = height ?? recorded?.responseHeight;
  if (h) headers.set('x-cosmos-block-height', h);
  return new Response(JSON.stringify(body), {status: 200, headers});
}
