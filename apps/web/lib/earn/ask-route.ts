/**
 * Session AF (L1): how the Earn page asks one of the app's own routes (same-origin only; the browser never talks to an LCD
 * or DefiLlama, ADR-028 H16). CI20: its own small module, so the live hook asks the route the moment it mounts, as it
 * did before CI14, while the readers that check the answer (lib/earn/client.ts with its schemas) load in their own chunk.
 * It never throws: a failed ask is `{failed}` (`timeout` when the 40 s limit ran out), read by client.ts as before.
 */
export type RouteAnswer = {status: number; body: unknown} | {failed: true; timeout: boolean};
export async function askRoute(url: string): Promise<RouteAnswer> {
  try {
    if (!url.startsWith('/api/')) throw new Error('Earn reads only the app\'s own routes.');
    const response = await fetch(url, {method: 'GET', credentials: 'omit', cache: 'no-store', referrerPolicy: 'no-referrer', redirect: 'error', signal: AbortSignal.timeout(40_000)});
    const text = await response.text();
    if (text.length > 3_000_000) return {status: 0, body: null};
    try { return {status: response.status, body: JSON.parse(text)}; } catch { return {status: response.status, body: null}; }
  } catch (error) {
    return {failed: true, timeout: error instanceof Error && error.name === 'TimeoutError'};
  }
}
