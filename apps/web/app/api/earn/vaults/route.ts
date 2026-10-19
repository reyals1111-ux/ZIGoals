/** Session AF chunk 2 (ADR-028 H84, H88): the USDC vaults, Nawa's stZIG vault and DeFa's counter, read at one block height (lib/server/earn/vaults.ts). */
import {vaultsRoute} from '../../../../lib/server/earn/routes';
export const dynamic = 'force-dynamic';
export const GET = vaultsRoute();
