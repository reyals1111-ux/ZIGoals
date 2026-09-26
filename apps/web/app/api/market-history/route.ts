import {isJsonMediaType} from '../../../lib/json-media-type';
import {z} from 'zod';
import {boundedQuoteText} from '../../../lib/market-quotes';
import {historyRequestSchema} from '../../../lib/market-history';
import {configuredDurableHistory} from '../../../lib/server/market-data-route';
import {serverMarketHistoryCache} from '../../../lib/server/market-history-service';
export const dynamic='force-dynamic';
const headers={'Cache-Control':'no-store','Referrer-Policy':'no-referrer','X-Content-Type-Options':'nosniff'};
const bodySchema=z.object({request:historyRequestSchema,refresh:z.boolean().optional()}).strict();
export async function POST(request:Request):Promise<Response>{
 if(!isJsonMediaType(request.headers.get('content-type')))return Response.json({error:'Unsupported public market request media type.'},{status:415,headers});
 let body:z.infer<typeof bodySchema>;
 try{
  if(new URL(request.url).search)throw Error('Unsupported query');
  body=bodySchema.parse(JSON.parse(await boundedQuoteText(new Response(request.body),8192)));
 }catch{return Response.json({error:'Invalid public market history request.'},{status:400,headers});}
 const result=(await configuredDurableHistory(body.request))??await serverMarketHistoryCache.load(body.request,body.refresh);
 return Response.json(result,{status:result.history?200:503,headers});
}
