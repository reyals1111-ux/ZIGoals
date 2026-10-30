import {coinGeckoProvider} from '../../../lib/server/market-service';
import {configuredDurableCatalog} from '../../../lib/server/market-data-route';
import {marketClientGroup} from '../../../lib/server/market-client-address';
import {CATALOG_WIRE_HEADER,CATALOG_WIRE_VERSION,etagOf,toCompactCatalog} from '../../../lib/market-catalog-wire';
export const dynamic='force-dynamic';
/**
 * The market catalog for the browser's search. Session AJ (item 5, WE16; D8): a client that sends
 * `x-zigoals-catalog: 2` gets the compact rows (lib/market-catalog-wire.ts) with their version as an ETag, and 304
 * with no body when its If-None-Match already names that version; every other request gets version 1, unchanged.
 */
export async function GET(request:Request):Promise<Response>{
 const headers={'Cache-Control':'no-store','Referrer-Policy':'no-referrer','X-Content-Type-Options':'nosniff'};
 if(new URL(request.url).search)return Response.json({error:'Search the cached catalog locally.'},{status:400,headers});
 const result=(await configuredDurableCatalog(request.signal,marketClientGroup(request.headers.get('cf-connecting-ip'))))??await coinGeckoProvider.catalog();
 if(request.headers.get(CATALOG_WIRE_HEADER)!==CATALOG_WIRE_VERSION)return Response.json(result,{status:result.assets.length?200:503,headers});
 const compact=await toCompactCatalog(result),etag=etagOf(compact.catalogVersion);
 // The browser revalidates every time it asks (no-cache, never no-store here), and an unchanged catalog costs one 304.
 const v2={'Cache-Control':'private, no-cache','Referrer-Policy':'no-referrer','X-Content-Type-Options':'nosniff',ETag:etag,Vary:CATALOG_WIRE_HEADER};
 if(result.assets.length&&request.headers.get('if-none-match')===etag)return new Response(null,{status:304,headers:v2});
 return Response.json(compact,{status:result.assets.length?200:503,headers:result.assets.length?v2:headers});
}
