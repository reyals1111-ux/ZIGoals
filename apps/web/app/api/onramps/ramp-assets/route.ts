/** Session AF (L2b, ADR-028 H89): Ramp Network's public asset list, read by ZIGoals' server, address-free (lib/onramps/server). */
import {rampAssetsRoute} from '../../../../lib/onramps/server/route';
export const dynamic = 'force-dynamic';
export const GET = rampAssetsRoute();
