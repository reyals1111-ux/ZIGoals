import {test,expect,vi} from 'vitest';
vi.mock('./runtime-bindings',()=>({loadRuntimeBindings:vi.fn(async()=>({ZIGOALS_AUTH_ORIGIN:'https://fixture.supabase.co',ZIGOALS_AUTH_PUBLIC_KEY:'public-fixture',ZIGOALS_SYNC_ORIGIN:'https://fixture.workers.dev',PRIVATE_SYNC:{fetch:vi.fn(async()=>Response.json({revision:0,records:[]}))}}))}));
import {GET,POST} from '../../app/api/private-account/route';
import {loadRuntimeBindings} from './runtime-bindings';
test('private account route reads current request bindings and reaches named sync service without public fetch',async()=>{
 const fetcher=vi.spyOn(globalThis,'fetch').mockRejectedValue(Error('public traffic forbidden'));
 try{const response=await GET(new Request('https://app.test/api/private-account',{headers:{cookie:'zigoals_session=fixture','x-zigoals-account':'10000000-0000-4000-8000-000000000001'}}));expect(response.status).toBe(200);expect(loadRuntimeBindings).toHaveBeenCalled();expect(fetcher).not.toHaveBeenCalled();}finally{fetcher.mockRestore();}
});
test('packaged route uses overwritten middleware origin and fails closed without auth admission',async()=>{
 const fetcher=vi.spyOn(globalThis,'fetch').mockRejectedValue(Error('Provider forbidden'));
 try{const r=await POST(new Request('https://localhost:1234/api/private-account',{method:'POST',headers:{origin:'https://app.test','x-zigoals-origin':'https://app.test','content-type':'application/json'},body:JSON.stringify({action:'send',email:'fixture@example.invalid'})}));expect(r.status).toBe(503);expect(await r.json()).toMatchObject({error:'AUTH_ADMISSION_UNAVAILABLE'});expect(fetcher).not.toHaveBeenCalled();}finally{fetcher.mockRestore();}
});
