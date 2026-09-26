import {test,expect,vi} from 'vitest';
vi.mock('./runtime-bindings',()=>({loadRuntimeBindings:vi.fn(async()=>({ZIGOALS_AUTH_ORIGIN:'https://fixture.supabase.co',ZIGOALS_AUTH_PUBLIC_KEY:'public-fixture',ZIGOALS_SYNC_ORIGIN:'https://fixture.workers.dev',PRIVATE_SYNC:{fetch:vi.fn(async()=>Response.json({revision:0,records:[]}))}}))}));
import {GET} from '../../app/api/private-account/route';
import {loadRuntimeBindings} from './runtime-bindings';
test('private account route reads current request bindings and reaches named sync service without public fetch',async()=>{
 const fetcher=vi.spyOn(globalThis,'fetch').mockRejectedValue(Error('public traffic forbidden'));
 try{const response=await GET(new Request('https://app.test/api/private-account',{headers:{cookie:'zigoals_session=fixture','x-zigoals-account':'10000000-0000-4000-8000-000000000001'}}));expect(response.status).toBe(200);expect(loadRuntimeBindings).toHaveBeenCalled();expect(fetcher).not.toHaveBeenCalled();}finally{fetcher.mockRestore();}
});
