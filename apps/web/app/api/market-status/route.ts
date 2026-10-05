import {configuredMarketStatus} from '../../../lib/server/market-data-route';
import {marketClientGroup} from '../../../lib/server/market-client-address';
export const dynamic='force-dynamic';
const headers={'Cache-Control':'no-store','Referrer-Policy':'no-referrer','X-Content-Type-Options':'nosniff'};
/** Session U Part 2d: `{version:1, policyWindowEnd, nextPolicyWindowEnd}`, when the shared market coordinator's
 * MARKET_POLICY period ends and (follow-up F2) when a next window installed in advance ends (null: not reported, or no
 * next window waiting). Information for the deploy summary and the owner's verifier; it never costs a provider read. */
export async function GET(request:Request):Promise<Response>{
 if(new URL(request.url).search)return Response.json({error:'Unsupported public market query.'},{status:400,headers});
 return Response.json(await configuredMarketStatus(request.signal,marketClientGroup(request.headers.get('cf-connecting-ip'))),{headers});
}
