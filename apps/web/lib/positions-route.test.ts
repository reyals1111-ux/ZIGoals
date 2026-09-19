import {afterEach,expect,it,vi} from 'vitest';
import {toBech32} from '@cosmjs/encoding';
import {GET} from '../app/api/positions/route';
const address=toBech32('zig',new Uint8Array(20).fill(3));
afterEach(()=>vi.unstubAllGlobals());
it.each(['network=MAINNET_READ_ONLY&address=private-notes',`network=OTHER&address=${address}`,`network=MAINNET_READ_ONLY&address=${address}&url=https://attacker.invalid`,`network=MAINNET_READ_ONLY&address=${address}&address=${address}`])('rejects malformed, arbitrary or duplicate query fields before any upstream call: %s',async query=>{
 const calls:string[]=[];vi.stubGlobal('fetch',async(url:unknown)=>{calls.push(String(url));throw Error('must not fetch');});
 const response=await GET(new Request(`http://localhost/api/positions?${query}`));expect(response.status).toBe(400);expect(calls).toEqual([]);expect(response.headers.get('cache-control')).toContain('no-store');
});
it('relays public-only GETs to fixed endpoints at one proven height without forwarding credentials',async()=>{
 vi.stubGlobal('fetch',async(url:string,init:RequestInit)=>{
  expect(url.startsWith('https://api.zigchain.com/')).toBe(true);expect(init.method).toBe('GET');expect(init.body).toBeUndefined();expect(init.credentials).toBe('omit');
  const headers=new Headers(init.headers);expect(headers.has('cookie')).toBe(false);expect(headers.has('authorization')).toBe(false);
  const path=new URL(url).pathname;
  if(!path.includes('/blocks/latest'))expect(headers.get('x-cosmos-block-height')).toBe('123');
  const data=path.includes('/blocks/latest')?{block:{header:{height:'123',chain_id:'zigchain-1',time:'2026-09-17T00:00:00Z'}}}:path.includes('node_info')?{default_node_info:{network:'zigchain-1'}}:path.includes('denoms_metadata')?{metadata:{base:'uzig',display:'ZIG',denom_units:[{denom:'ZIG',exponent:6}]}}:path.endsWith('/params')?{params:{bond_denom:'uzig'}}:path.includes('by_denom')?{balance:{denom:'uzig',amount:'123456789'}}:path.includes('unbonding_delegations')?{unbonding_responses:[],pagination:{next_key:null}}:path.includes('rewards')?{rewards:[]}:{delegation_responses:[],pagination:{next_key:null}};
  return Response.json(data,{headers:{'x-cosmos-block-height':'123'}});
 });
 const response=await GET(new Request(`http://localhost/api/positions?network=MAINNET_READ_ONLY&address=${address}`,{headers:{cookie:'private-cookie',authorization:'private-auth'}}));
 expect(response.status).toBe(200);expect(await response.json()).toMatchObject({positions:[{quantity:'123456789',executionAuthority:'NONE',decimals:6}]});
 expect(response.headers.get('cache-control')).toContain('no-store');
});
it('returns no partial snapshot or upstream error detail when evidence fails',async()=>{
 vi.stubGlobal('fetch',async()=>{throw Error('sensitive upstream detail');});
 const response=await GET(new Request(`http://localhost/api/positions?network=MAINNET_READ_ONLY&address=${address}`));expect(response.status).toBe(502);expect(await response.text()).not.toContain('sensitive');
});
