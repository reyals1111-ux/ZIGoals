import {test,expect,vi} from 'vitest';
import {fetchPublicMarketQuotes} from './market-quote-client';
const request={marketRef:{provider:'coingecko' as const,kind:'coin' as const,id:'bitcoin'},currency:'USD' as const};
test('an aborted quote client explicitly cancels only its random request capability',async()=>{
 const controller=new AbortController(),calls:{url:string;init?:RequestInit}[]=[];
 const fetcher=vi.fn(async(url:RequestInfo|URL,init?:RequestInit)=>{calls.push({url:String(url),init});if(String(url).endsWith('/cancel'))return new Response(null,{status:204});return new Promise<Response>((_resolve,reject)=>init!.signal!.addEventListener('abort',()=>reject(new DOMException('Aborted','AbortError')),{once:true}));});
 const pending=fetchPublicMarketQuotes([request],false,fetcher,controller.signal);controller.abort();await pending;
 expect(calls).toHaveLength(2);const token=new Headers(calls[0]!.init!.headers).get('x-market-cancel-token');expect(token).toMatch(/^[a-f0-9-]{36}$/);expect(calls[1]).toMatchObject({url:'/api/market-quotes/cancel',init:{keepalive:true,credentials:'omit',body:JSON.stringify({cancelToken:token})}});
});
