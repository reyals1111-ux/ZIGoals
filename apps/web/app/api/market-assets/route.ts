import {coinGeckoProvider} from '../../../lib/server/market-service';
import {configuredDurableCatalog} from '../../../lib/server/market-data-route';
export const dynamic='force-dynamic';
export async function GET(request:Request):Promise<Response>{
 const headers={'Cache-Control':'no-store','Referrer-Policy':'no-referrer','X-Content-Type-Options':'nosniff'};
 if(new URL(request.url).search)return Response.json({error:'Search the cached catalog locally.'},{status:400,headers});
 const result=(await configuredDurableCatalog())??await coinGeckoProvider.catalog();return Response.json(result,{status:result.assets.length?200:503,headers});
}
