import {describe,expect,it} from 'vitest';
import {toBech32} from '@cosmjs/encoding';
import {formatUnits} from '@zigoals/chain-config';
import {READ_NETWORKS,type ReadMode} from './position-reader';
import {readNativePositions} from './native-positions';
import {allocatedNativePrincipal,emptyPlatform,goalProgress,markObservationError,needsMarketQuotes,platformSchema,positionSchema,privateGoalSchema,replaceObservation,type Platform,type Position} from './positions';
import {isNativeZig,legacyNativeZigIdentity,nativeZigIdentity,quoteMatchesPosition,type MarketQuote} from './market-quotes';
import {wealthOverview} from './wealth';
import {stakingWidgetSource} from './dashboard-metrics';

// Session P, PR 1 (ADR-004 addendum): every amount path on both networks after the v5 redenomination, and the records
// a reader saved before it. Mainnet and testnet both answer azig with 18 decimals (official LCD, 2026-10-03); a
// record saved before 2026-09-30 still carries uzig with 6 decimals. 10^12 base units apart, the same ZIG.
const account=toBech32('zig',new Uint8Array(20).fill(7)),validator=toBech32('zigvaloper',new Uint8Array(20).fill(8));
const now=Date.parse('2026-10-03T12:00:00Z'),at=new Date(now).toISOString();
/** The bank metadata both official LCDs answered for azig on 2026-10-03 (docs/earn/EVIDENCE_2026-10.md, F03). */
const LIVE_AZIG={metadata:{description:'The native staking and gas token of ZIGChain (18-decimal base denom azig).',denom_units:[{denom:'azig',exponent:0,aliases:[]},{denom:'zig',exponent:18,aliases:[]}],base:'azig',display:'zig',name:'ZIG',symbol:'ZIG',uri:'',uri_hash:''}};
/** What mainnet answered before the upgrade, and what the reader used to be configured for. */
const LEGACY_UZIG={metadata:{base:'uzig',display:'ZIG',denom_units:[{denom:'ZIG',exponent:6}]}};
const ZIG=(whole:string,decimals:number)=>whole+'0'.repeat(decimals);
/** A chain that answers like both networks do today: balances in azig. `legacy` answers like mainnet did before v5. */
function chain(chainId:string,legacy=false):typeof fetch{
 const denom=legacy?'uzig':'azig';
 return (async(url,init)=>{
  const path=new URL(String(url)).pathname;
  if(!path.includes('/blocks/latest'))expect(new Headers(init?.headers).get('x-cosmos-block-height')).toBe('12632388');
  const value=path.includes('/blocks/latest')?{block:{header:{height:'12632388',chain_id:chainId,time:'2026-10-03T16:14:58.255411936Z'}}}
   :path.includes('node_info')?{default_node_info:{network:chainId}}
   :path.includes('denoms_metadata')?(legacy?LEGACY_UZIG:LIVE_AZIG)
   :path.endsWith('/params')?{params:{bond_denom:denom}}
   :path.includes('by_denom')?{balance:{denom,amount:ZIG('263000',legacy?6:18)}}
   :path.includes('/rewards')?{rewards:[{validator_address:validator,reward:[{denom,amount:ZIG('12',legacy?6:18)+'.5'}]}]}
   :path.includes('unbonding_delegations')?{unbonding_responses:[{delegator_address:account,validator_address:validator,entries:[{creation_height:'5',completion_time:'2026-10-24T00:00:00Z',balance:ZIG('20',legacy?6:18)}]}],pagination:{next_key:null}}
   :path.includes('/validators/')?{validator:{operator_address:validator,description:{moniker:'Fixture validator'},status:'BOND_STATUS_BONDED',commission:{commission_rates:{rate:'0.100000000000000000'}},tokens:'100000'}}
   :{delegation_responses:[{delegation:{delegator_address:account,validator_address:validator},balance:{denom,amount:ZIG('100',legacy?6:18)}}],pagination:{next_key:null}};
  return Response.json(value,{headers:{'x-cosmos-block-height':'12632388'}});
 }) as typeof fetch;
}
const quote:MarketQuote={base:nativeZigIdentity,currency:'USD',price:'43',priceDecimals:3,source:'CoinGecko',providerAssetId:'zignaly',observedAt:at,verification:'VERIFIED'};
const native=(id:string,denom:'azig'|'uzig',decimals:6|18,quantity:string,extra:Partial<Position>={}):Position=>positionSchema.parse({id,providerId:'native-zig',sourceType:'WALLET_LIQUID',network:'zigchain-1',account,asset:'ZIG',denom,decimals,quantity,verification:'VERIFIED_READ_ONLY',sync:'CURRENT',observedAt:at,liquidity:'LIQUID',provenance:'https://api.zigchain.com · block 12549001',...extra});
const usdGoal=()=>privateGoalSchema.parse({id:'1',network:'zigchain-1',name:'Value',type:'VALUE',status:'active',asset:'USD',denom:'USD',decimals:2,target:'5000000',notes:'',createdAt:at,milestones:[]});

describe('both networks (Session P, ADR-004 addendum)',()=>{
 it.each(['MAINNET_READ_ONLY','TESTNET_READ_ONLY'] as ReadMode[])('%s reads liquid, staked, reward and unbonding ZIG as azig/18 at one evidenced height',async mode=>{
  const network=READ_NETWORKS[mode],ps=await readNativePositions(mode,account,chain(network.chainId));
  expect(ps.every(p=>p.network===network.chainId&&p.denom==='azig'&&p.decimals===18&&p.provenance.includes('12632388'))).toBe(true);
  // Rewards floor the fractional base units; everything else is exact.
  expect(ps.map(p=>[p.sourceType,formatUnits(p.quantity,p.decimals)])).toEqual([['WALLET_LIQUID','263000'],['NATIVE_STAKING','100'],['NATIVE_REWARDS','12'],['NATIVE_UNBONDING','20']]);
  expect(stakingWidgetSource(ps[1]!)).toBe(true);
 });
 it('staking: allocated native principal counts mainnet azig, testnet azig and legacy mainnet uzig stake in 18-decimal units',()=>{
  for(const [network,denom,decimals] of [['zigchain-1','azig',18],['zig-test-2','azig',18],['zigchain-1','uzig',6]] as const){
   const goal=privateGoalSchema.parse({id:'7',network,name:'Stake',type:'QUANTITY',status:'active',asset:'ZIG',denom:'azig',decimals:18,target:ZIG('1000',18),notes:'',createdAt:at,milestones:[]});
   const stake=positionSchema.parse({...native('stake',denom,decimals,ZIG('100',decimals),{sourceType:'NATIVE_STAKING',liquidity:'BONDED'}),network});
   const s:Platform={...emptyPlatform(),goals:[goal],positions:[stake],allocations:[{goalId:'7',positionId:'stake',quantity:ZIG('80',decimals)}]};
   expect(allocatedNativePrincipal(s,'7')).toBe(ZIG('80',18));
   expect(goalProgress(s,'7',now).current).toBe(ZIG('80',18));
  }
 });
 it('goal valuations and Wealth: a legacy uzig/6 record and an azig/18 record of the same ZIG amount are worth the same',()=>{
  // 263,000 ZIG at $0.043 is $11,309.00, in cents 1130900, whichever base unit the record carries.
  for(const p of [native('old','uzig',6,ZIG('263000',6)),native('new','azig',18,ZIG('263000',18))]){
   const s:Platform={...emptyPlatform(),goals:[usdGoal()],positions:[p],allocations:[{goalId:'1',positionId:p.id,quantity:p.quantity}]};
   expect(needsMarketQuotes(s)).toBe(true);
   expect(goalProgress(s,'1',now,[quote])).toMatchObject({current:'1130900',verified:'1130900',missingValuation:false});
   const row=wealthOverview(s,now,[quote]).rows.find(r=>r.position.id===p.id)!;
   expect(row.value).toBe(1130900n);expect(row.currency).toBe('USD');
  }
 });
 it('the ZIG price matches both evidenced mainnet units, never a mixed one and never the testnet',()=>{
  expect(isNativeZig(nativeZigIdentity)).toBe(true);expect(isNativeZig(legacyNativeZigIdentity)).toBe(true);
  for(const [p,matches] of [[native('a','azig',18,'1'),true],[native('b','uzig',6,'1'),true],[{...native('c','uzig',6,'1'),decimals:18},false],[{...native('d','azig',18,'1'),decimals:6},false],[{...native('e','azig',18,'1'),network:'zig-test-2'},false]] as const){
   expect(quoteMatchesPosition(p,quote)).toBe(matches);
   expect(quoteMatchesPosition(p,{...quote,base:legacyNativeZigIdentity})).toBe(matches);
  }
 });
 it('a refused read stores nothing: records saved before the upgrade keep their quantities, history and allocations, only their sync state says ERROR',async()=>{
  await expect(readNativePositions('MAINNET_READ_ONLY',account,chain('zigchain-1',true))).rejects.toThrow('Public network or denomination evidence does not match.');
  const old=native(`zigchain-1:${account}:liquid`,'uzig',6,ZIG('1500000',6)),goal=privateGoalSchema.parse({id:'7',network:'zigchain-1',name:'Save ZIG',type:'QUANTITY',status:'active',asset:'ZIG',denom:'azig',decimals:18,target:ZIG('2000000',18),notes:'',createdAt:at,milestones:[]});
  const before=platformSchema.parse({...emptyPlatform(),goals:[goal],positions:[old],allocations:[{goalId:'7',positionId:old.id,quantity:ZIG('1000000',6)}],snapshots:[{positionId:old.id,quantity:ZIG('1000000',6),observedAt:'2026-09-20T00:00:00.000Z'}]});
  const after=markObservationError(before,'zigchain-1',account);
  expect(after.positions).toEqual(before.positions.map(p=>({...p,sync:'ERROR'})));
  const rest=(s:Platform)=>JSON.stringify({...s,positions:[]});expect(rest(after)).toBe(rest(before));
 });
 it('the first azig observation after the upgrade rescales that record\'s allocations and history once, so Goal progress keeps its ZIG amount',()=>{
  const id=`zigchain-1:${account}:liquid`,old=native(id,'uzig',6,ZIG('1500000',6)),manual=positionSchema.parse({id:'cash',providerId:'Savings',sourceType:'MANUAL',network:'manual',account:'local',asset:'EUR',denom:'EUR',decimals:2,quantity:'100000',verification:'MANUAL',sync:'MANUAL',observedAt:at,liquidity:'LIQUID',provenance:'Manual'});
  const goal=privateGoalSchema.parse({id:'7',network:'zigchain-1',name:'Save ZIG',type:'QUANTITY',status:'active',asset:'ZIG',denom:'azig',decimals:18,target:ZIG('2000000',18),notes:'',createdAt:at,milestones:[]});
  const eur=privateGoalSchema.parse({id:'8',network:'zigchain-1',name:'Cash',type:'VALUE',status:'active',asset:'EUR',denom:'EUR',decimals:2,target:'200000',notes:'',createdAt:at,milestones:[]});
  const before=platformSchema.parse({...emptyPlatform(),goals:[goal,eur],positions:[old,manual],allocations:[{goalId:'7',positionId:id,quantity:ZIG('1000000',6)},{goalId:'8',positionId:'cash',quantity:'50000'}],snapshots:[{positionId:id,quantity:ZIG('1000000',6),observedAt:'2026-09-20T00:00:00.000Z'}]});
  expect(goalProgress(before,'7',now).current).toBe(ZIG('1000000',18));
  const fresh=native(id,'azig',18,ZIG('1500000',18),{observedAt:'2026-10-03T16:14:58.255Z',provenance:'https://api.zigchain.com · block 12632388'});
  const after=replaceObservation(before,'zigchain-1',account,[fresh]);
  expect(after.positions.find(p=>p.id===id)).toMatchObject({denom:'azig',decimals:18,quantity:ZIG('1500000',18)});
  expect(after.allocations).toEqual([{goalId:'7',positionId:id,quantity:ZIG('1000000',18)},{goalId:'8',positionId:'cash',quantity:'50000'}]);
  expect(goalProgress(after,'7',now).current).toBe(ZIG('1000000',18));
  expect(after.snapshots).toEqual([{positionId:id,quantity:ZIG('1000000',18),observedAt:'2026-09-20T00:00:00.000Z'},{positionId:id,quantity:ZIG('1500000',18),observedAt:'2026-10-03T16:14:58.255Z'}]);
  // A later observation in the same unit changes nothing but the quantity and its new snapshot.
  const again=replaceObservation(after,'zigchain-1',account,[{...fresh,quantity:ZIG('1600000',18),observedAt:'2026-10-04T00:00:00.000Z'}]);
  expect(again.allocations).toEqual(after.allocations);expect(again.snapshots).toHaveLength(3);
 });
});
