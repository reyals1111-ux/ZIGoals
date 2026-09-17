import {fromBech32} from '@cosmjs/encoding';
import {z} from 'zod';
import {positionSchema,type Position} from './positions';
export const READ_NETWORKS = Object.freeze({
 MAINNET_READ_ONLY:{chainId:'zigchain-1',rest:'https://api.zigchain.com',denom:'uzig',decimals:6},
 TESTNET_READ_ONLY:{chainId:'zig-test-2',rest:'https://testnet-api.zigchain.com',denom:'azig',decimals:18},
});
export type ReadMode=keyof typeof READ_NETWORKS;
export const publicZigAddress=z.string().max(100).refine(v=>{try{const b=fromBech32(v,90);return b.prefix==='zig'&&b.data.length===20;}catch{return false;}});

/** Browser sends only a validated public address and a fixed network selector. */
export async function readPublicPositions(mode:ReadMode,account:string):Promise<Position[]> {
 publicZigAddress.parse(account);if(!Object.hasOwn(READ_NETWORKS,mode))throw Error('Unsupported network.');
 const response=await fetch(`/api/positions?network=${mode}&address=${encodeURIComponent(account)}`,{method:'GET',credentials:'omit',referrerPolicy:'no-referrer',redirect:'error',cache:'no-store',signal:AbortSignal.timeout(60000)});
 if(!response.ok)throw Error('Could not obtain a coherent public snapshot.');
 const text=await response.text();if(text.length>2000000)throw Error('Public snapshot exceeds safety limit.');
 return z.object({positions:z.array(positionSchema).max(1000)}).strict().parse(JSON.parse(text)).positions;
}
