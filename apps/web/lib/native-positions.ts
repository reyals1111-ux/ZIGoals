/** Public address observations only. Intentionally has no wallet/transaction imports. */
import { fromBech32 } from '@cosmjs/encoding';
import { z } from 'zod';
import { platformSchema, positionSchema, units, type Platform, type Position } from './positions';
export const READ_NETWORKS = Object.freeze({
 MAINNET_READ_ONLY:{chainId:'zigchain-1',rest:'https://api.zigchain.com',denom:'uzig',decimals:6},
 TESTNET_READ_ONLY:{chainId:'zig-test-2',rest:'https://testnet-api.zigchain.com',denom:'azig',decimals:18},
});
export type ReadMode=keyof typeof READ_NETWORKS;
const coin=z.object({denom:z.string(),amount:units});
const address=z.string().max(100).refine(v=>{try{const b=fromBech32(v,90);return b.prefix==='zig'&&b.data.length===20;}catch{return false;}});
const validatorAddress=z.string().max(100).refine(v=>{try{const b=fromBech32(v,90);return b.prefix==='zigvaloper'&&b.data.length===20;}catch{return false;}});
const delegation=z.object({delegation:z.object({delegator_address:address,validator_address:validatorAddress}),balance:coin});
const unbonding=z.object({delegator_address:address,validator_address:validatorAddress,entries:z.array(z.object({creation_height:units,completion_time:z.iso.datetime({offset:true}),balance:units})).max(100)});
const reward=z.object({validator_address:validatorAddress,reward:z.array(z.object({denom:z.string(),amount:z.string().regex(/^\d{1,78}(\.\d{1,18})?$/)})).max(100)});
const page=z.object({pagination:z.object({next_key:z.string().max(2000).nullable().optional()}).nullable().optional()});
export async function readNativePositions(mode:ReadMode,account:string,fetcher:typeof fetch=fetch):Promise<Position[]>{
 address.parse(account);const network=READ_NETWORKS[mode];if(!network)throw Error('Unsupported read-only network.');
 const provenance=network.rest;const observedAt=new Date().toISOString();
 async function read(path:string):Promise<unknown>{
  const response=await fetcher(network.rest+path,{method:'GET',credentials:'omit',referrerPolicy:'no-referrer',redirect:'error',signal:AbortSignal.timeout(12000),cache:'no-store'});
  if(!response.ok)throw Error('Public chain data is unavailable. Previous observations were preserved.');
  const text=await response.text();if(text.length>2000000)throw Error('Public response exceeds safety limit.');return JSON.parse(text);
 }
 const [node,params,metadata]=await Promise.all([read('/cosmos/base/tendermint/v1beta1/node_info'),read('/cosmos/staking/v1beta1/params'),read(`/cosmos/bank/v1beta1/denoms_metadata/${network.denom}`)]);
 const n=z.object({default_node_info:z.object({network:z.string()})}).parse(node);
 const m=z.object({metadata:z.object({base:z.string(),display:z.string(),denom_units:z.array(z.object({denom:z.string(),exponent:z.number()}))})}).parse(metadata).metadata;
 if(n.default_node_info.network!==network.chainId||z.object({params:z.object({bond_denom:z.string()})}).parse(params).params.bond_denom!==network.denom||m.base!==network.denom||!m.denom_units.some(d=>d.denom===m.display&&d.exponent===network.decimals))throw Error('Public network or denomination evidence does not match.');
 async function pages<T>(path:string,key:string,schema:z.ZodType<T>):Promise<T[]>{
  const all:T[]=[];let cursor='';const seen=new Set<string>();
  for(let i=0;i<20;i++){
   const value=await read(`${path}?pagination.limit=100${cursor?`&pagination.key=${encodeURIComponent(cursor)}`:''}`);
   const obj=z.record(z.string(),z.unknown()).parse(value);const rows=z.array(schema).max(100).parse(obj[key]);all.push(...rows);
   cursor=page.parse(value).pagination?.next_key??'';if(!cursor)return all;
   if(seen.has(cursor))throw Error('Repeated pagination cursor.');seen.add(cursor);
  }throw Error('Position query exceeds pagination limit; no partial total was saved.');
 }
 const encoded=encodeURIComponent(account);
 const [bank,delegations,unbondings,rewardsRaw]=await Promise.all([
  read(`/cosmos/bank/v1beta1/balances/${encoded}/by_denom?denom=${network.denom}`),
  pages(`/cosmos/staking/v1beta1/delegations/${encoded}`,'delegation_responses',delegation),
  pages(`/cosmos/staking/v1beta1/delegators/${encoded}/unbonding_delegations`,'unbonding_responses',unbonding),
  read(`/cosmos/distribution/v1beta1/delegators/${encoded}/rewards`),
 ]);
 const balance=z.object({balance:coin}).parse(bank).balance;if(balance.denom!==network.denom)throw Error('Wrong liquid denomination.');
 const rewards=z.object({rewards:z.array(reward).max(1000)}).parse(rewardsRaw).rewards;
 const base={providerId:'native-zig',network:network.chainId,account,asset:'ZIG',denom:network.denom,decimals:network.decimals,verification:'VERIFIED_READ_ONLY',sync:'CURRENT',observedAt,provenance,executionAuthority:'NONE'};
 const make=(suffix:string,fields:Record<string,unknown>)=>positionSchema.parse({...base,id:`${network.chainId}:${account}:${suffix}`,...fields});
 const result:Position[]=[make('liquid',{sourceType:'WALLET_LIQUID',quantity:balance.amount,liquidity:'LIQUID'})];
 const validatorIds=[...new Set([...delegations.map(d=>d.delegation.validator_address),...rewards.map(r=>r.validator_address),...unbondings.map(u=>u.validator_address)])];
 if(validatorIds.length>100)throw Error('Too many validators for one observation.');
 const validators=new Map<string,Position['validator']>();
 // Bounded sequential reads avoid flooding public infrastructure.
 for(const v of validatorIds){
  const raw=await read(`/cosmos/staking/v1beta1/validators/${encodeURIComponent(v)}`);
  const parsed=z.object({validator:z.object({operator_address:validatorAddress,description:z.object({moniker:z.string().max(200)}),status:z.string().max(100),tokens:units,commission:z.object({commission_rates:z.object({rate:z.string()})})})}).parse(raw).validator;
  if(parsed.operator_address!==v)throw Error('Validator identity mismatch.');
  validators.set(v,{address:v,name:parsed.description.moniker,status:parsed.status,votingTokens:parsed.tokens,commission:parsed.commission.commission_rates.rate});
 }
 for(const d of delegations){
  if(d.delegation.delegator_address!==account||d.balance.denom!==network.denom)throw Error('Delegation scope mismatch.');
  result.push(make(`stake:${d.delegation.validator_address}`,{sourceType:'NATIVE_STAKING',quantity:d.balance.amount,principal:d.balance.amount,liquidity:'BONDED',validator:validators.get(d.delegation.validator_address),risk:'Bonded stake is not liquid. Validator and slashing risk apply.'}));
 }
 for(const r of rewards){
  // Cosmos DecCoin has fractional base units. Floor once per validator; never float.
  const zig=r.reward.filter(c=>c.denom===network.denom);if(zig.length>1)throw Error('Duplicate reward denomination.');
  const quantity=(zig[0]?.amount??'0').split('.')[0]!;
  result.push(make(`reward:${r.validator_address}`,{sourceType:'NATIVE_REWARDS',quantity,unclaimedRewards:quantity,liquidity:'LOCKED',validator:validators.get(r.validator_address),notes:'Unclaimed rewards; fractional base units excluded. Not liquid until claimed externally.'}));
 }
 for(const u of unbondings){
  if(u.delegator_address!==account)throw Error('Unbonding scope mismatch.');
  for(const e of u.entries)result.push(make(`unbonding:${u.validator_address}:${e.creation_height}:${e.completion_time}`,{sourceType:'NATIVE_UNBONDING',quantity:e.balance,liquidity:'UNBONDING',exitDate:e.completion_time,unbondingHeight:e.creation_height,validator:validators.get(u.validator_address)}));
 }
 if(new Set(result.map(p=>p.id)).size!==result.length)throw Error('Duplicate public Position evidence.');
 return result;
}
export function replaceObservation(s:Platform,network:string,account:string,incoming:Position[],observedAt=new Date().toISOString()):Platform{
 if(incoming.some(p=>p.network!==network||p.account!==account||p.providerId!=='native-zig'))throw Error('Observation scope mismatch.');
 const previous=s.positions.filter(p=>p.network===network&&p.account===account&&p.providerId==='native-zig');
 const retained=s.positions.filter(p=>!previous.includes(p));
 const missing=previous.filter(p=>!incoming.some(n=>n.id===p.id)).map(p=>({...p,quantity:'0',principal:p.principal===undefined?undefined:'0',unclaimedRewards:p.unclaimedRewards===undefined?undefined:'0',observedAt,sync:'CURRENT' as const}));
 const positions=[...retained,...incoming,...missing];
 return platformSchema.parse({...s,positions,snapshots:[...s.snapshots,...[...incoming,...missing].map(p=>({positionId:p.id,quantity:p.quantity,observedAt:p.observedAt}))].slice(-2000)});
}
