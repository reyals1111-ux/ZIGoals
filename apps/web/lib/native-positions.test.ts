import { it, expect } from 'vitest';
import { toBech32 } from '@cosmjs/encoding';
import { denominationEvidenceMatches, readNativePositions, replaceObservation, markObservationError } from './native-positions';
import { READ_NETWORKS } from './position-reader';
import { emptyPlatform } from './positions';
const account=toBech32('zig',new Uint8Array(20).fill(3)),validator=toBech32('zigvaloper',new Uint8Array(20).fill(4));
/** The bank metadata the official LCD answered for azig on both networks on 2026-10-03 (docs/earn/EVIDENCE_2026-10.md F03). */
export const LIVE_AZIG_METADATA={metadata:{description:'The native staking and gas token of ZIGChain (18-decimal base denom azig).',denom_units:[{denom:'azig',exponent:0,aliases:[]},{denom:'zig',exponent:18,aliases:[]}],base:'azig',display:'zig',name:'ZIG',symbol:'ZIG',uri:'',uri_hash:''}};
/** What mainnet answered before the v5 redenomination of 2026-09-30: the unit this reader used to be configured for. */
export const LEGACY_UZIG_METADATA={metadata:{base:'uzig',display:'ZIG',denom_units:[{denom:'ZIG',exponent:6}]}};
function endpoint(path:string,search=""):unknown {
 if(path.includes('/blocks/latest'))return {block:{header:{height:'100',chain_id:'zigchain-1',time:'2026-09-17T00:00:00Z'}}};
 if(path.includes('node_info'))return {default_node_info:{network:'zigchain-1'}};
 if(path.includes('denoms_metadata'))return LIVE_AZIG_METADATA;
 if(path.endsWith('/params'))return {params:{bond_denom:'azig'}};
 // Session AF: the stZIG balance is read beside the ZIG one (lib/native-positions.ts STZIG); this address holds none.
 if(path.includes('by_denom')){const denom=new URLSearchParams(search).get('denom')??'azig';return denom==='azig'?{balance:{denom:'azig',amount:'9007199254740993000'}}:{balance:{denom,amount:'0'}};}
 if(path.includes('/rewards'))return {rewards:[{validator_address:validator,reward:[{denom:'azig',amount:'12.987654321012345678'}]}],total:[{denom:'azig',amount:'12.987654321012345678'}]};
 if(path.includes('unbonding_delegations'))return {unbonding_responses:[{delegator_address:account,validator_address:validator,entries:[{creation_height:'5',completion_time:'2026-10-01T00:00:00Z',balance:'20'}]}],pagination:{next_key:null}};
 // Session Z-Cloud Part 5 (C4): the validator list, one page, instead of one read per validator.
 if(path.endsWith('/staking/v1beta1/validators'))return {validators:[{operator_address:validator,description:{moniker:'Fixture validator'},status:'BOND_STATUS_BONDED',commission:{commission_rates:{rate:'0.100000000000000000'}},tokens:'100000'}],pagination:{next_key:null}};
 return {delegation_responses:[{delegation:{delegator_address:account,validator_address:validator},balance:{denom:'azig',amount:'1000'}}],pagination:{next_key:null}};
}
it('reads exact public mainnet Positions with GET-only, no credentials or private payload',async()=>{
 const requests:{url:string;init?:RequestInit}[]=[];
 const fetcher=(async(url,init)=>{requests.push({url:String(url),init});return Response.json(endpoint(new URL(String(url)).pathname,new URL(String(url)).search),{headers:{'x-cosmos-block-height':'100'}});}) as typeof fetch;
 const ps=await readNativePositions('MAINNET_READ_ONLY',account,fetcher);
 expect(ps.map(p=>p.quantity)).toEqual(['9007199254740993000','1000','12','20']);
 expect(ps.every(p=>p.executionAuthority==='NONE'&&p.network==='zigchain-1'&&p.denom==='azig'&&p.decimals===18)).toBe(true);
 expect(requests.every(r=>r.url.startsWith('https://api.zigchain.com/')&&r.init?.method==='GET'&&r.init.credentials==='omit'&&!r.init.body)).toBe(true);
});
it('rejects malformed addresses before requests and wrong network/denom evidence',async()=>{
 let count=0; const fetcher=(async()=>{count++;return Response.json({default_node_info:{network:'wrong'}});}) as typeof fetch;
 await expect(readNativePositions('MAINNET_READ_ONLY','private notes',fetcher)).rejects.toThrow();expect(count).toBe(0);
 await expect(readNativePositions('MAINNET_READ_ONLY',account,fetcher)).rejects.toThrow();
});
it('fails closed on duplicate responses and incomplete pagination',async()=>{
 const fetcher=(async(url)=>{const value=endpoint(new URL(String(url)).pathname,new URL(String(url)).search) as Record<string,unknown>;if(value.delegation_responses)value.pagination={next_key:'repeat'};return Response.json(value,{headers:{'x-cosmos-block-height':'100'}});}) as typeof fetch;
 await expect(readNativePositions('MAINNET_READ_ONLY',account,fetcher)).rejects.toThrow();
});
it('Session Z-Cloud C4: validators come from the paged list, one read per page however many the address touches; one missing from the list fails closed',async()=>{
 const other=toBech32('zigvaloper',new Uint8Array(20).fill(5));let listReads=0;
 const fetcher=(missing:boolean)=>(async(url)=>{const at=new URL(String(url));if(at.pathname.endsWith('/staking/v1beta1/validators')){listReads++;const second=at.searchParams.get('pagination.key')==='page-2';
  const row=(address:string)=>({operator_address:address,description:{moniker:'Fixture '+address.slice(-4)},status:'BOND_STATUS_BONDED',commission:{commission_rates:{rate:'0.050000000000000000'}},tokens:'7'});
  return Response.json(second?{validators:missing?[]:[row(validator)],pagination:{next_key:null}}:{validators:[row(other)],pagination:{next_key:'page-2'}},{headers:{'x-cosmos-block-height':'100'}});}
  return Response.json(endpoint(at.pathname,at.search),{headers:{'x-cosmos-block-height':'100'}});}) as typeof fetch;
 const ps=await readNativePositions('MAINNET_READ_ONLY',account,fetcher(false));
 expect(listReads).toBe(2);expect(ps.find(p=>p.validator)?.validator).toMatchObject({address:validator,commission:'0.050000000000000000'});
 await expect(readNativePositions('MAINNET_READ_ONLY',account,fetcher(true))).rejects.toThrow('Validator identity mismatch.');
});
it('retains vanished Positions as zero and their allocations for deficit review',async()=>{
 const ps=await readNativePositions('MAINNET_READ_ONLY',account,(async(url)=>Response.json(endpoint(new URL(String(url)).pathname,new URL(String(url)).search),{headers:{'x-cosmos-block-height':'100'}})) as typeof fetch);
 const s={...emptyPlatform(),positions:ps};const next=replaceObservation(s,'zigchain-1',account,[], '2026-09-18T00:00:00Z');
 expect(next.positions.every(p=>p.quantity==='0')).toBe(true);expect(next.snapshots).toHaveLength(4);
});
it('reads the testnet with the same azig/18 unit and keeps the two networks apart by chain id',async()=>{
 const ps=await readNativePositions('TESTNET_READ_ONLY',account,(async(url)=>{
  const value=JSON.parse(JSON.stringify(endpoint(new URL(String(url)).pathname,new URL(String(url)).search)).replaceAll('zigchain-1','zig-test-2'));
  return Response.json(value,{headers:{'x-cosmos-block-height':'100'}});
 }) as typeof fetch);
 expect(ps.every(p=>p.network==='zig-test-2'&&p.denom==='azig'&&p.decimals===18)).toBe(true);
 expect(ps.map(p=>p.quantity)).toEqual(['9007199254740993000','1000','12','20']);
 expect(READ_NETWORKS.MAINNET_READ_ONLY).toMatchObject({chainId:'zigchain-1',denom:'azig',decimals:18});expect(READ_NETWORKS.TESTNET_READ_ONLY).toMatchObject({chainId:'zig-test-2',denom:'azig',decimals:18});
});
// Regression (Session P): the pre-upgrade assumption, mainnet uzig with 6 decimals, must never pass the chain's live evidence.
it('the old mainnet uzig/6 assumption fails closed against the live azig metadata, and a chain still on uzig fails against the azig reader without reading any balance',async()=>{
 const live=LIVE_AZIG_METADATA.metadata;
 expect(denominationEvidenceMatches({chainId:'zigchain-1',denom:'uzig',decimals:6},'zigchain-1','azig',live)).toBe(false);
 expect(denominationEvidenceMatches({chainId:'zigchain-1',denom:'uzig',decimals:6},'zigchain-1','uzig',live)).toBe(false);
 expect(denominationEvidenceMatches({chainId:'zigchain-1',denom:'azig',decimals:6},'zigchain-1','azig',live)).toBe(false);
 expect(denominationEvidenceMatches(READ_NETWORKS.MAINNET_READ_ONLY,'zigchain-1','azig',live)).toBe(true);
 expect(denominationEvidenceMatches(READ_NETWORKS.TESTNET_READ_ONLY,'zig-test-2','azig',live)).toBe(true);
 expect(denominationEvidenceMatches(READ_NETWORKS.MAINNET_READ_ONLY,'zig-test-2','azig',live)).toBe(false);
 const paths:string[]=[];
 const stale=(async(url)=>{const path=new URL(String(url)).pathname;paths.push(path);const value=path.includes('denoms_metadata')?LEGACY_UZIG_METADATA:path.endsWith('/params')?{params:{bond_denom:'uzig'}}:endpoint(path,new URL(String(url)).search);return Response.json(value,{headers:{'x-cosmos-block-height':'100'}});}) as typeof fetch;
 await expect(readNativePositions('MAINNET_READ_ONLY',account,stale)).rejects.toThrow('Public network or denomination evidence does not match.');
 expect(paths.some(p=>p.includes('/balances/')||p.includes('/delegations/')||p.includes('/rewards'))).toBe(false);
});

it('pins every accounting response to one evidenced block',async()=>{
 const fetcher=(async(url,init)=>{
  const path=new URL(String(url)).pathname;
  if(!path.includes('/blocks/latest'))expect(new Headers(init?.headers).get('x-cosmos-block-height')).toBe('100');
  return Response.json(endpoint(path,new URL(String(url)).search),{headers:{'x-cosmos-block-height':'100'}});
 }) as typeof fetch;
 const ps=await readNativePositions('MAINNET_READ_ONLY',account,fetcher);
 expect(ps.every(p=>p.provenance.includes('100'))).toBe(true);
});
it.each([undefined,'101'])('rejects absent or mismatched block evidence: %s',async height=>{
 const fetcher=(async(url)=>{const path=new URL(String(url)).pathname;return Response.json(endpoint(path,new URL(String(url)).search),{headers:path.includes('/rewards')?(height?{'x-cosmos-block-height':height}:{}):{'x-cosmos-block-height':'100'}});}) as typeof fetch;
 await expect(readNativePositions('MAINNET_READ_ONLY',account,fetcher)).rejects.toThrow(/height/i);
});
it('failed observation retains exact quantities, dates, allocations and history but marks the scoped source ERROR',async()=>{
 const ps=await readNativePositions('MAINNET_READ_ONLY',account,(async(url)=>Response.json(endpoint(new URL(String(url)).pathname,new URL(String(url)).search),{headers:{'x-cosmos-block-height':'100'}})) as typeof fetch);
 const s={...emptyPlatform(),positions:ps,snapshots:[{positionId:ps[0]!.id,quantity:ps[0]!.quantity,observedAt:ps[0]!.observedAt}]};
 const next=markObservationError(s,'zigchain-1',account);
 expect(next.positions.every(p=>p.sync==='ERROR')).toBe(true);expect(next.positions.map(p=>[p.quantity,p.observedAt])).toEqual(ps.map(p=>[p.quantity,p.observedAt]));expect(next.snapshots).toEqual(s.snapshots);
 expect(markObservationError(s,'zig-test-2',account)).toEqual(s);
});

it('uses an edge-compatible redirect mode and refuses redirects without following them',async()=>{
 const calls:string[]=[];
 const edgeFetch=(async(url,init)=>{
  if(init?.redirect==='error')throw new TypeError('Workers does not implement redirect:error');
  expect(init?.redirect).toBe('manual');calls.push(String(url));
  return Response.json(endpoint(new URL(String(url)).pathname,new URL(String(url)).search),{headers:{'x-cosmos-block-height':'100'}});
 }) as typeof fetch;
 await expect(readNativePositions('MAINNET_READ_ONLY',account,edgeFetch)).resolves.toHaveLength(4);
 expect(calls.length).toBeGreaterThan(1);
 let redirectCalls=0;
 const redirectFetch=(async(_url,init)=>{expect(init?.redirect).toBe('manual');redirectCalls++;return new Response(null,{status:302,headers:{Location:'https://untrusted.invalid/collect'}});}) as typeof fetch;
 await expect(readNativePositions('MAINNET_READ_ONLY',account,redirectFetch)).rejects.toThrow(/unavailable/);
 expect(redirectCalls).toBe(1);
});

// Session AF (ADR-028 H16, H44): Valdora's stZIG beside ZIG, at the same block, in stZIG units (6 decimals), never as ZIG.
it('reads the stZIG balance at the same block on both networks; shown only when held; a wrong denom in the answer fails closed',async()=>{
 const held=(network:'zigchain-1'|'zig-test-2',answer:(denom:string)=>unknown)=>(async(url:string|URL)=>{const u=new URL(String(url));const value=u.pathname.includes('by_denom')&&u.searchParams.get('denom')!=='azig'?answer(u.searchParams.get('denom')!):JSON.parse(JSON.stringify(endpoint(u.pathname,u.search)).replaceAll('zigchain-1',network));return Response.json(value,{headers:{'x-cosmos-block-height':'100'}});}) as typeof fetch;
 const mainnet=await readNativePositions('MAINNET_READ_ONLY',account,held('zigchain-1',denom=>({balance:{denom,amount:'1500000'}})));
 const st=mainnet.find(p=>p.asset==='stZIG')!;
 expect(st).toMatchObject({id:`zigchain-1:${account}:stzig`,providerId:'native-zig',sourceType:'LIQUID_STAKING',denom:'coin.zig109f7g2rzl2aqee7z6gffn8kfe9cpqx0mjkk7ethmx8m2hq4xpe9snmaam2.stzig',decimals:6,quantity:'1500000',liquidity:'LIQUID',executionAuthority:'NONE'});
 expect(st.provenance).toBe('https://api.zigchain.com · block 100');
 const testnet=await readNativePositions('TESTNET_READ_ONLY',account,held('zig-test-2',denom=>({balance:{denom,amount:'7'}})));
 expect(testnet.find(p=>p.asset==='stZIG')?.denom).toBe('coin.zig18dgnfnv0sxjn4r9wtfj2zhvfewy2tk69m9j5zlhy3xgmahcgf20s6anrnr.stzig');
 // None held: no stZIG card (the four ZIG positions only); the ZIG amounts never include stZIG.
 expect((await readNativePositions('MAINNET_READ_ONLY',account,held('zigchain-1',denom=>({balance:{denom,amount:'0'}})))).map(p=>p.asset)).toEqual(['ZIG','ZIG','ZIG','ZIG']);
 await expect(readNativePositions('MAINNET_READ_ONLY',account,held('zigchain-1',()=>({balance:{denom:'azig',amount:'5'}})))).rejects.toThrow('Wrong stZIG denomination.');
});
