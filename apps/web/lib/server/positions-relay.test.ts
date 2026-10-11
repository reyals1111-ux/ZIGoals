import {afterEach,expect,it,vi} from 'vitest';
import {toBech32} from '@cosmjs/encoding';
import {readNativePositions} from '../native-positions';
import {CLIENT_READS_PER_MINUTE,POSITIONS_CACHE_MS,READS_LIMITED,positionsRelay} from './positions-relay';
import {MAINNET_REFUSED} from '../position-reader';

// Session Z-Cloud Part 5 (C4, option a, ADR-019 C38): what one read costs upstream, the 60 s answers, the limits, and
// mainnet refused on the public builds.
const address=toBech32('zig',new Uint8Array(20).fill(3)),validator=(n:number)=>toBech32('zigvaloper',new Uint8Array(20).fill(n));
afterEach(()=>{vi.unstubAllGlobals();vi.unstubAllEnvs();});
/** A testnet chain where the address delegates to three validators, has rewards from two and unbonds from one. */
function chain(){
 const calls:string[]=[];
 const fetcher=(async(url:string)=>{
  const u=new URL(url),path=u.pathname;calls.push(path+u.search);
  const v=[validator(1),validator(2),validator(3)];
  const data=path.includes('/blocks/latest')?{block:{header:{height:'77',chain_id:'zig-test-2',time:'2026-10-10T00:00:00Z'}}}
   :path.includes('node_info')?{default_node_info:{network:'zig-test-2'}}
   :path.includes('denoms_metadata')?{metadata:{base:'azig',display:'zig',denom_units:[{denom:'azig',exponent:0},{denom:'zig',exponent:18}]}}
   :path.endsWith('/params')?{params:{bond_denom:'azig'}}
   :path.includes('by_denom')?{balance:{denom:'azig',amount:'5'}}
   :path.includes('unbonding_delegations')?{unbonding_responses:[{delegator_address:address,validator_address:v[2],entries:[{creation_height:'70',completion_time:'2026-10-30T00:00:00Z',balance:'9'}]}],pagination:{next_key:null}}
   :path.includes('rewards')?{rewards:[{validator_address:v[0],reward:[{denom:'azig',amount:'1.5'}]},{validator_address:v[1],reward:[{denom:'azig',amount:'2'}]}]}
   :path.endsWith('/staking/v1beta1/validators')?{validators:v.map((a,i)=>({operator_address:a,description:{moniker:'Fictional '+i},status:'BOND_STATUS_BONDED',tokens:'1000',commission:{commission_rates:{rate:'0.05'}}})),pagination:{next_key:null}}
   :{delegation_responses:v.map(a=>({delegation:{delegator_address:address,validator_address:a},balance:{denom:'azig',amount:'100'}})),pagination:{next_key:null}};
  return Response.json(data,{headers:{'x-cosmos-block-height':'77'}});
 }) as unknown as typeof fetch;
 return {calls,fetcher};
}

it('one read costs at most 10 upstream calls, however many validators the address touches',async()=>{
 const {calls,fetcher}=chain();
 const positions=await readNativePositions('TESTNET_READ_ONLY',address,fetcher);
 expect(calls.length).toBeLessThanOrEqual(10);
 expect(calls.filter(c=>c.includes('/staking/v1beta1/validators')).length).toBe(1);
 expect(positions.filter(p=>p.sourceType==='NATIVE_STAKING').map(p=>p.validator?.name)).toEqual(['Fictional 0','Fictional 1','Fictional 2']);
 expect(positions.find(p=>p.sourceType==='NATIVE_UNBONDING')?.validator?.name).toBe('Fictional 2');
});
it('an answer is kept 60 seconds per network and address and shared while it is read; a failed read is not kept',async()=>{
 let t=1_000_000,reads=0,fail=false;
 const relay=positionsRelay({now:()=>t,read:async()=>{reads++;await Promise.resolve();if(fail)throw Error('upstream');return [];}});
 await Promise.all([relay('TESTNET_READ_ONLY',address,'a'),relay('TESTNET_READ_ONLY',address,'b')]);expect(reads).toBe(1);
 t+=POSITIONS_CACHE_MS-1;await relay('TESTNET_READ_ONLY',address,'c');expect(reads).toBe(1);
 t+=1;await relay('TESTNET_READ_ONLY',address,'c');expect(reads).toBe(2);
 fail=true;t+=POSITIONS_CACHE_MS;await expect(relay('TESTNET_READ_ONLY',address,'d')).rejects.toThrow();
 fail=false;await relay('TESTNET_READ_ONLY',address,'d');expect(reads).toBe(4);
});
it('a client may start 10 chain reads a minute; answers from the cache are free',async()=>{
 let t=5_000_000;const relay=positionsRelay({now:()=>t,read:async()=>[]});
 const addresses=Array.from({length:CLIENT_READS_PER_MINUTE+1},(_,i)=>toBech32('zig',new Uint8Array(20).fill(i+10)));
 for(const a of addresses.slice(0,CLIENT_READS_PER_MINUTE))expect(await relay('TESTNET_READ_ONLY',a,'client')).toEqual({positions:[]});
 expect(await relay('TESTNET_READ_ONLY',addresses[0]!,'client')).toEqual({positions:[]});
 expect(await relay('TESTNET_READ_ONLY',addresses.at(-1)!,'client')).toEqual({retryAfter:60});
 expect(await relay('TESTNET_READ_ONLY',addresses.at(-1)!,'another client')).toEqual({positions:[]});
 t+=60_000;expect(await relay('TESTNET_READ_ONLY',toBech32('zig',new Uint8Array(20).fill(99)),'client')).toEqual({positions:[]});
});
it('the public builds refuse mainnet with a plain sentence and read nothing; a local demo build still reads it',async()=>{
 const {GET}=await import('../../app/api/positions/route');
 for(const environment of ['PUBLIC_ALPHA_UNDEPLOYED','TESTNET_DEPLOYED']){
  vi.stubEnv('NEXT_PUBLIC_APP_ENVIRONMENT',environment);const calls:string[]=[];vi.stubGlobal('fetch',async(url:unknown)=>{calls.push(String(url));throw Error('must not fetch');});
  const response=await GET(new Request(`http://localhost/api/positions?network=MAINNET_READ_ONLY&address=${address}`));
  expect(response.status).toBe(403);expect(await response.json()).toEqual({error:MAINNET_REFUSED,code:'MAINNET_NOT_ON_PUBLIC_ALPHA'});expect(calls).toEqual([]);
  expect(response.headers.get('cache-control')).toContain('no-store');
 }
 vi.stubEnv('NEXT_PUBLIC_APP_ENVIRONMENT','PUBLIC_ALPHA_UNDEPLOYED');
 const {fetcher}=chain();vi.stubGlobal('fetch',fetcher);
 const testnet=await GET(new Request(`http://localhost/api/positions?network=TESTNET_READ_ONLY&address=${address}`));expect(testnet.status).toBe(200);
 vi.stubEnv('NEXT_PUBLIC_APP_ENVIRONMENT','LOCAL_DEMO');vi.stubGlobal('fetch',async()=>{throw Error('offline');});
 expect((await GET(new Request(`http://localhost/api/positions?network=MAINNET_READ_ONLY&address=${address}`))).status).toBe(502);
 expect(READS_LIMITED).toMatch(/^Too many reads just now/);
});
