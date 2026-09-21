import {validatedLogoUrl} from '../../../lib/market-insights';
import {serverMarketLogoCache} from '../../../lib/server/market-logo';
export const dynamic='force-dynamic';
const headers={'Referrer-Policy':'no-referrer','X-Content-Type-Options':'nosniff','Content-Security-Policy':"default-src 'none'; sandbox",'Cross-Origin-Resource-Policy':'same-origin'};
export async function GET(request:Request):Promise<Response>{
 const params=new URL(request.url).searchParams;const url=params.size===1?validatedLogoUrl(params.get('url')):null;if(!url)return new Response(null,{status:400,headers});
 const image=await serverMarketLogoCache.load(url);if(!image)return new Response(null,{status:404,headers:{...headers,'Cache-Control':'public, max-age=60'}});
 return new Response(image.bytes,{headers:{...headers,'Content-Type':image.contentType,'Cache-Control':'public, max-age=86400'}});
}
