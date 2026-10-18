import {fromBech32} from '@cosmjs/encoding';
import * as z from 'zod';
import {positionSchema,type Position} from './positions';
/**
 * Both networks use azig with 18 decimals since the v5 redenomination (testnet 2026-09-08 at height 7669200, mainnet
 * 2026-09-30 at height 12549000): the official LCD's bank metadata names azig as the 18-decimal base denom and uzig as
 * "Legacy 6-decimal ZIGChain base denom, retained only as IBC escrow backing" (read 2026-10-03, docs/earn/EVIDENCE_2026-10.md
 * F03). A record saved from a read before the upgrade still carries uzig/6; lib/positions.ts keeps it valid and rescales
 * it on its next observation.
 */
export const READ_NETWORKS = Object.freeze({
 MAINNET_READ_ONLY:{chainId:'zigchain-1',rest:'https://api.zigchain.com',denom:'azig',decimals:18},
 TESTNET_READ_ONLY:{chainId:'zig-test-2',rest:'https://testnet-api.zigchain.com',denom:'azig',decimals:18},
});
export type ReadMode=keyof typeof READ_NETWORKS;
export const publicZigAddress=z.string().max(100).refine(v=>{try{const b=fromBech32(v,90);return b.prefix==='zig'&&b.data.length===20;}catch{return false;}});

/**
 * Session Z-Cloud Part 5 (C4): the relay said no without reading (mainnet on a public build, or too many reads just now).
 * Its sentence is shown as is, and the saved snapshot is not marked as failed.
 */
export class PositionReadRefused extends Error {}
/** C4 (option a): the public builds read testnet only; the relay refuses mainnet with this sentence, and the form says it first. */
export const MAINNET_REFUSED='Mainnet addresses are not read on the public Alpha. Add your mainnet ZIG as a manual asset instead; snapshots you saved before stay.';
/** Session AF (ADR-028 H16, H63): a block height a fresh answer must reach, right after a signed transaction (digits, ≤ 20). */
export const MIN_HEIGHT=/^[1-9]\d{0,19}$/;
/** The block a relay answer was read at: every position the reader makes says "<LCD> · block N" (lib/native-positions.ts). */
export function snapshotHeight(positions:readonly Position[]):bigint|undefined{
 let best:bigint|undefined;
 for(const p of positions){const m=/ · block ([1-9]\d{0,19})$/.exec(p.provenance??'');if(m){const h=BigInt(m[1]!);best=best===undefined||h>best?h:best;}}
 return best;
}
/** Browser sends only a validated public address and a fixed network selector (and, after a signed staking action, the block height it confirmed at). */
export async function readPublicPositions(mode:ReadMode,account:string,options:{minHeight?:string}={}):Promise<Position[]> {
 publicZigAddress.parse(account);if(!Object.hasOwn(READ_NETWORKS,mode))throw Error('Unsupported network.');
 if(options.minHeight!==undefined&&!MIN_HEIGHT.test(options.minHeight))throw Error('Unsupported block height.');
 const response=await fetch(`/api/positions?network=${mode}&address=${encodeURIComponent(account)}${options.minHeight?`&minHeight=${options.minHeight}`:''}`,{method:'GET',credentials:'omit',referrerPolicy:'no-referrer',redirect:'error',cache:'no-store',signal:AbortSignal.timeout(60000)});
 if(response.status===403||response.status===429){const said=await response.json().catch(()=>null) as {error?:unknown}|null;throw new PositionReadRefused(typeof said?.error==='string'&&said.error.length<=300?said.error:'Public positions were not read just now. Your saved snapshots are unchanged.');}
 if(!response.ok)throw Error('Could not obtain a coherent public snapshot.');
 const text=await response.text();if(text.length>2000000)throw Error('Public snapshot exceeds safety limit.');
 return z.object({positions:z.array(positionSchema).max(1000)}).strict().parse(JSON.parse(text)).positions;
}
