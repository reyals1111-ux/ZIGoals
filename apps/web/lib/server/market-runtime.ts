import 'server-only';
import {loadRuntimeBindings,runtimeIsStaticGeneration} from './runtime-bindings';
export type MarketBinding={fetch:(request:Request)=>Promise<Response>};
export type MarketEnvironment={ZIGOALS_MARKET_QUOTES_MODE?:string;MARKET_QUOTES?:MarketBinding};
export type MarketRuntime={mode:'durable';binding:MarketBinding}|{mode:'development'|'unavailable'};
export function directMarketDevelopment(){return !runtimeIsStaticGeneration()&&process.env.NODE_ENV==='development'&&process.env.ZIGOALS_MARKET_LOCAL_MODE==='direct';}
/** An incomplete durable selection is an explicit setup gate, never fallback. */
export async function marketRuntime(load=()=>loadRuntimeBindings<MarketEnvironment>()):Promise<MarketRuntime>{
 const env=await load().catch(()=>({} as MarketEnvironment));
 if(env.ZIGOALS_MARKET_QUOTES_MODE||env.MARKET_QUOTES){return env.ZIGOALS_MARKET_QUOTES_MODE==='durable-v1'&&typeof env.MARKET_QUOTES?.fetch==='function'?{mode:'durable',binding:env.MARKET_QUOTES}:{mode:'unavailable'};}
 return {mode:directMarketDevelopment()?'development':'unavailable'};
}
