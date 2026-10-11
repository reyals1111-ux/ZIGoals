import {afterEach,expect,test,vi} from 'vitest';
import {getCloudflareContext} from '@opennextjs/cloudflare';
import {loadRuntimeBindings} from './runtime-bindings';
import {marketRuntime} from './market-runtime';
vi.mock('@opennextjs/cloudflare',()=>({getCloudflareContext:vi.fn()}));
afterEach(()=>{vi.unstubAllEnvs();vi.unstubAllGlobals();vi.resetAllMocks();});
test('binding values are read for each request; process state never substitutes a missing production binding',async()=>{
 vi.stubEnv('NODE_ENV','production');vi.stubEnv('COINGECKO_DEMO_API_KEY','must-not-use');vi.stubEnv('ZIGOALS_MARKET_QUOTES_MODE','durable-v1');
 vi.mocked(getCloudflareContext).mockResolvedValueOnce({env:{marker:'first'}} as never).mockResolvedValueOnce({env:{marker:'second'}} as never);
 expect(await loadRuntimeBindings()).toEqual({marker:'first'});expect(await loadRuntimeBindings()).toEqual({marker:'second'});
 vi.mocked(getCloudflareContext).mockRejectedValue(Error('unavailable'));
 expect(await marketRuntime()).toEqual({mode:'unavailable'});
});
test('SSG never starts Wrangler or reads bindings',async()=>{
 vi.stubGlobal('__NEXT_DATA__',{nextExport:true});
 expect(await loadRuntimeBindings()).toEqual({});expect(getCloudflareContext).not.toHaveBeenCalled();
});
test('direct development requires explicit selection and cannot bypass an existing durable binding',async()=>{
 vi.stubEnv('NODE_ENV','development');vi.stubEnv('ZIGOALS_MARKET_LOCAL_MODE','direct');vi.mocked(getCloudflareContext).mockResolvedValue({env:{}} as never);
 expect(await marketRuntime()).toEqual({mode:'development'});
 vi.mocked(getCloudflareContext).mockResolvedValue({env:{ZIGOALS_MARKET_QUOTES_MODE:'durable-v1'}} as never);
 expect(await marketRuntime()).toEqual({mode:'unavailable'});
 const binding={fetch:vi.fn()};vi.mocked(getCloudflareContext).mockResolvedValue({env:{MARKET_QUOTES:binding}} as never);
 expect(await marketRuntime()).toEqual({mode:'unavailable'});
});
