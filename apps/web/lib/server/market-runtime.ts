import 'server-only';
import {loadRuntimeBindings,runtimeIsStaticGeneration} from './runtime-bindings';
export type MarketBinding={fetch:(request:Request)=>Promise<Response>};
export type MarketEnvironment={ZIGOALS_MARKET_QUOTES_MODE?:string;MARKET_QUOTES?:MarketBinding;PRIVATE_SYNC?:unknown};
/** Session U Part 2e: which app calls the shared coordinator, from this app's own bindings only, never from a request:
 * the acceptance app has the private sync binding ('friends'); the public Alpha has no account path ('public'). The
 * coordinator uses it only to keep the public Alpha inside its share of the day's rows (MARKET_POLICY.partition). */
export type MarketCaller='public'|'friends';
export type MarketRuntime={mode:'durable';binding:MarketBinding;caller:MarketCaller}|{mode:'development'|'unavailable'};
/** Headers of every request to the coordinator binding. Built from scratch: no header of the incoming request is
 * forwarded, so a caller can set neither `x-market-client` nor `x-market-caller`. */
export function marketBindingHeaders(caller:MarketCaller,client?:string|null,extra:Record<string,string>={}):Record<string,string>{
 return {'content-type':'application/json',...extra,...(client?{'x-market-client':client}:{}),'x-market-caller':caller};
}
export function directMarketDevelopment(){return !runtimeIsStaticGeneration()&&process.env.NODE_ENV==='development'&&process.env.ZIGOALS_MARKET_LOCAL_MODE==='direct';}
/** An incomplete durable selection is an explicit setup gate, never fallback. */
export async function marketRuntime(load=()=>loadRuntimeBindings<MarketEnvironment>()):Promise<MarketRuntime>{
 const env=await load().catch(()=>({} as MarketEnvironment));
 if(env.ZIGOALS_MARKET_QUOTES_MODE||env.MARKET_QUOTES){return env.ZIGOALS_MARKET_QUOTES_MODE==='durable-v1'&&typeof env.MARKET_QUOTES?.fetch==='function'?{mode:'durable',binding:env.MARKET_QUOTES,caller:env.PRIVATE_SYNC?'friends':'public'}:{mode:'unavailable'};}
 return {mode:directMarketDevelopment()?'development':'unavailable'};
}
