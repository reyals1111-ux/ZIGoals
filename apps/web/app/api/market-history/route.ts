import {z} from 'zod';
import {boundedQuoteText} from '../../../lib/market-quotes';
import {historyRequestSchema} from '../../../lib/market-history';
import {serverMarketHistoryCache} from '../../../lib/server/market-history-service';
export const dynamic='force-dynamic';
const headers={'Cache-Control':'no-store','Referrer-Policy':'no-referrer','X-Content-Type-Options':'nosniff'};
const bodySchema=z.object({request:historyRequestSchema,refresh:z.boolean().optional()}).strict();
export async function POST(request:Request):Promise<Response>{
 let body:z.infer<typeof bodySchema>;
 try{
  if(new URL(request.url).search)throw Error('Unsupported query');
  body=bodySchema.parse(JSON.parse(await boundedQuoteText(new Response(request.body),8192)));
 }catch{return Response.json({error:'Invalid public market history request.'},{status:400,headers});}
 const result=await serverMarketHistoryCache.load(body.request,body.refresh);
 return Response.json(result,{status:result.history?200:503,headers});
}
