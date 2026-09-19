import { it, expect } from 'vitest';
import { toBech32 } from '@cosmjs/encoding';
import { readNativePositions, replaceObservation, markObservationError } from './native-positions';
import { emptyPlatform } from './positions';
const account=toBech32('zig',new Uint8Array(20).fill(3)),validator=toBech32('zigvaloper',new Uint8Array(20).fill(4));
function endpoint(path:string):unknown {
 if(path.includes('/blocks/latest'))return {block:{header:{height:'100',chain_id:'zigchain-1',time:'2026-09-17T00:00:00Z'}}};
 if(path.includes('node_info'))return {default_node_info:{network:'zigchain-1'}};
 if(path.includes('denoms_metadata'))return {metadata:{base:'uzig',display:'ZIG',denom_units:[{denom:'ZIG',exponent:6}]}};
 if(path.endsWith('/params'))return {params:{bond_denom:'uzig'}};
 if(path.includes('by_denom'))return {balance:{denom:'uzig',amount:'9007199254740993000'}};
 if(path.includes('/rewards'))return {rewards:[{validator_address:validator,reward:[{denom:'uzig',amount:'12.987654321012345678'}]}],total:[{denom:'uzig',amount:'12.987654321012345678'}]};
 if(path.includes('unbonding_delegations'))return {unbonding_responses:[{delegator_address:account,validator_address:validator,entries:[{creation_height:'5',completion_time:'2026-10-01T00:00:00Z',balance:'20'}]}],pagination:{next_key:null}};
 if(path.includes('/validators/'))return {validator:{operator_address:validator,description:{moniker:'Fixture validator'},status:'BOND_STATUS_BONDED',commission:{commission_rates:{rate:'0.100000000000000000'}},tokens:'100000'}};
 return {delegation_responses:[{delegation:{delegator_address:account,validator_address:validator},balance:{denom:'uzig',amount:'1000'}}],pagination:{next_key:null}};
}
it('reads exact public mainnet Positions with GET-only, no credentials or private payload',async()=>{
 const requests:{url:string;init?:RequestInit}[]=[];
 const fetcher=(async(url,init)=>{requests.push({url:String(url),init});return Response.json(endpoint(new URL(String(url)).pathname),{headers:{'x-cosmos-block-height':'100'}});}) as typeof fetch;
 const ps=await readNativePositions('MAINNET_READ_ONLY',account,fetcher);
 expect(ps.map(p=>p.quantity)).toEqual(['9007199254740993000','1000','12','20']);
 expect(ps.every(p=>p.executionAuthority==='NONE'&&p.network==='zigchain-1')).toBe(true);
 expect(requests.every(r=>r.url.startsWith('https://api.zigchain.com/')&&r.init?.method==='GET'&&r.init.credentials==='omit'&&!r.init.body)).toBe(true);
});
it('rejects malformed addresses before requests and wrong network/denom evidence',async()=>{
 let count=0; const fetcher=(async()=>{count++;return Response.json({default_node_info:{network:'wrong'}});}) as typeof fetch;
 await expect(readNativePositions('MAINNET_READ_ONLY','private notes',fetcher)).rejects.toThrow();expect(count).toBe(0);
 await expect(readNativePositions('MAINNET_READ_ONLY',account,fetcher)).rejects.toThrow();
});
it('fails closed on duplicate responses and incomplete pagination',async()=>{
 const fetcher=(async(url)=>{const value=endpoint(new URL(String(url)).pathname) as Record<string,unknown>;if(value.delegation_responses)value.pagination={next_key:'repeat'};return Response.json(value,{headers:{'x-cosmos-block-height':'100'}});}) as typeof fetch;
 await expect(readNativePositions('MAINNET_READ_ONLY',account,fetcher)).rejects.toThrow();
});
it('retains vanished Positions as zero and their allocations for deficit review',async()=>{
 const ps=await readNativePositions('MAINNET_READ_ONLY',account,(async(url)=>Response.json(endpoint(new URL(String(url)).pathname),{headers:{'x-cosmos-block-height':'100'}})) as typeof fetch);
 const s={...emptyPlatform(),positions:ps};const next=replaceObservation(s,'zigchain-1',account,[], '2026-09-18T00:00:00Z');
 expect(next.positions.every(p=>p.quantity==='0')).toBe(true);expect(next.snapshots).toHaveLength(4);
});
it('keeps testnet azig/18 separate from mainnet uzig/6',async()=>{
 const ps=await readNativePositions('TESTNET_READ_ONLY',account,(async(url)=>{
  const value=JSON.parse(JSON.stringify(endpoint(new URL(String(url)).pathname)).replaceAll('zigchain-1','zig-test-2').replaceAll('uzig','azig').replace('"exponent":6','"exponent":18'));
  return Response.json(value,{headers:{'x-cosmos-block-height':'100'}});
 }) as typeof fetch);
 expect(ps.every(p=>p.network==='zig-test-2'&&p.denom==='azig'&&p.decimals===18)).toBe(true);
});

it('pins every accounting response to one evidenced block',async()=>{
 const fetcher=(async(url,init)=>{
  const path=new URL(String(url)).pathname;
  if(!path.includes('/blocks/latest'))expect(new Headers(init?.headers).get('x-cosmos-block-height')).toBe('100');
  return Response.json(endpoint(path),{headers:{'x-cosmos-block-height':'100'}});
 }) as typeof fetch;
 const ps=await readNativePositions('MAINNET_READ_ONLY',account,fetcher);
 expect(ps.every(p=>p.provenance.includes('100'))).toBe(true);
});
it.each([undefined,'101'])('rejects absent or mismatched block evidence: %s',async height=>{
 const fetcher=(async(url)=>{const path=new URL(String(url)).pathname;return Response.json(endpoint(path),{headers:path.includes('/rewards')?(height?{'x-cosmos-block-height':height}:{}):{'x-cosmos-block-height':'100'}});}) as typeof fetch;
 await expect(readNativePositions('MAINNET_READ_ONLY',account,fetcher)).rejects.toThrow(/height/i);
});
it('failed observation retains exact quantities, dates, allocations and history but marks the scoped source ERROR',async()=>{
 const ps=await readNativePositions('MAINNET_READ_ONLY',account,(async(url)=>Response.json(endpoint(new URL(String(url)).pathname),{headers:{'x-cosmos-block-height':'100'}})) as typeof fetch);
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
  return Response.json(endpoint(new URL(String(url)).pathname),{headers:{'x-cosmos-block-height':'100'}});
 }) as typeof fetch;
 await expect(readNativePositions('MAINNET_READ_ONLY',account,edgeFetch)).resolves.toHaveLength(4);
 expect(calls.length).toBeGreaterThan(1);
 let redirectCalls=0;
 const redirectFetch=(async(_url,init)=>{expect(init?.redirect).toBe('manual');redirectCalls++;return new Response(null,{status:302,headers:{Location:'https://untrusted.invalid/collect'}});}) as typeof fetch;
 await expect(readNativePositions('MAINNET_READ_ONLY',account,redirectFetch)).rejects.toThrow(/unavailable/);
 expect(redirectCalls).toBe(1);
});
