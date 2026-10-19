/** Session AF chunk 2 (ADR-028 H97): the measured native staking figure, one named validator's self-bond over 10,000 blocks (lib/server/earn/measured.ts). */
import {measuredRoute} from '../../../../lib/server/earn/routes';
export const dynamic = 'force-dynamic';
export const GET = measuredRoute();
