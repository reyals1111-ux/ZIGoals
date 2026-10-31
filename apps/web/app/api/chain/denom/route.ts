/** Owner follow-up 1 (F4; TIER 3 (egress routes)): GET /api/chain/denom, one token's facts, address-free, from the network's official LCD (lib/zigchain-eco/denom-route.ts). */
import {denomRoute} from '../../../../lib/zigchain-eco/denom-route';
export const dynamic = 'force-dynamic';
export const GET = denomRoute();
