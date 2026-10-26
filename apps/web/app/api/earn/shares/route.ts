/** Session AH (AF3; `TIER 3 (egress routes)`): your OroSwap pool shares and USDC vault shares (lib/server/earn/shares.ts). */
import {publicZigAddress} from '../../../../lib/position-reader';
import {marketClientGroup} from '../../../../lib/server/market-client-address';
import {readShares} from '../../../../lib/server/earn/shares';
import {sharesRelay} from '../../../../lib/server/earn/shares-relay';
import {EARN_HEADERS} from '../../../../lib/server/earn/routes';
export const dynamic = 'force-dynamic';
const relay = sharesRelay({read: address => readShares((input, init) => fetch(input, init), address)});
export async function GET(request: Request): Promise<Response> {
  const query = new URL(request.url).searchParams, address = query.get('address');
  if ([...query.keys()].some(k => k !== 'address') || query.getAll('address').length !== 1 || !publicZigAddress.safeParse(address).success)
    return Response.json({error: 'A public ZIG address is required.'}, {status: 400, headers: EARN_HEADERS});
  try {
    const answer = await relay(address!, marketClientGroup(request.headers.get('cf-connecting-ip')) ?? '');
    if ('retryAfter' in answer) return Response.json({error: 'Too many reads just now. Try again in a minute.', code: 'TRY_LATER'}, {status: 429, headers: {...EARN_HEADERS, 'Retry-After': String(answer.retryAfter)}});
    return Response.json(answer.shares, {headers: EARN_HEADERS});
  } catch { return Response.json({error: 'Your shares could not be read at one block height just now.'}, {status: 502, headers: EARN_HEADERS}); }
}
