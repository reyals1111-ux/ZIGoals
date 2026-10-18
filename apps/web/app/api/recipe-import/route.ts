import {importRecipe, isRefusal} from '../../../lib/server/recipe-import';
import {marketClientGroup} from '../../../lib/server/market-client-address';
export const dynamic = 'force-dynamic';
const headers = {'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer', 'X-Content-Type-Options': 'nosniff'};
/** Session AA-Local N6 (`[TIER 3] (egress/security)`): at most 10 imports a minute per client group, 60 per server instance; in memory, per instance. */
const WINDOW_MS = 60_000, PER_CLIENT = 10, PER_SERVER = 60;
const clients = new Map<string, number[]>(); let server: number[] = [];
const prune = (stamps: number[], now: number) => stamps.filter(t => now - t < WINDOW_MS);
export function allow(client: string, now = Date.now()): boolean {
  server = prune(server, now); if (server.length >= PER_SERVER) return false;
  const mine = prune(clients.get(client) ?? [], now); if (mine.length >= PER_CLIENT) { clients.set(client, mine); return false; }
  mine.push(now); clients.set(client, mine); server.push(now);
  if (clients.size > 1000) for (const [k, v] of clients) if (!prune(v, now).length) clients.delete(k);
  return true;
}
export async function POST(request: Request): Promise<Response> {
  let body: unknown; try { body = await request.json(); } catch { return Response.json({error: 'INVALID_URL'}, {status: 400, headers}); }
  const url = typeof body === 'object' && body && typeof (body as {url?: unknown}).url === 'string' ? (body as {url: string}).url : '';
  if (!url || url.length > 2048) return Response.json({error: 'INVALID_URL'}, {status: 400, headers});
  const client = marketClientGroup(request.headers.get('cf-connecting-ip')) ?? 'unknown';
  if (!allow(client)) return Response.json({error: 'TRY_LATER'}, {status: 429, headers: {...headers, 'Retry-After': '60'}});
  const result = await importRecipe(url);
  if (isRefusal(result)) return Response.json({error: result.code}, {status: result.code === 'UPSTREAM' || result.code === 'TIMEOUT' || result.code === 'RESOLVER' ? 502 : result.code === 'NO_RECIPE' ? 404 : 400, headers});
  return Response.json(result, {headers});
}
