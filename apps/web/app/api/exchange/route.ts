import {exchangeRelay} from '../../../lib/server/exchange-relay';
export const dynamic = 'force-dynamic';
/** Session AI (J14; `TIER 3 (egress routes)`): the read-only exchange relay (lib/server/exchange-relay.ts). */
export const POST = (request: Request) => exchangeRelay(request);
