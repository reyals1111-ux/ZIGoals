/** Public-only same-origin relay: browsers cannot expose upstream block-height evidence. */
import {READS_LIMITED,positionsRelay} from '../../../lib/server/positions-relay';
import {MIN_HEIGHT,READ_NETWORKS,publicZigAddress,type ReadMode} from '../../../lib/position-reader';
import {marketClientGroup} from '../../../lib/server/market-client-address';
export const dynamic='force-dynamic';
const headers={'Cache-Control':'no-store','Referrer-Policy':'no-referrer','X-Content-Type-Options':'nosniff'};
// Session Z-Cloud Part 5 (C4, option a): one relay per server instance (its 60 s answers and its read limits).
const relay=positionsRelay();
/**
 * Session AF (ADR-028 H16, owner amendment 6; `TIER 3 (egress routes)`): Session Z-Cloud's C4 refusal of mainnet on the
 * public builds is lifted: ZIGChain address-bearing reads for display go through this relay on both networks, at one
 * block height, cached 60 s, 10 reads a minute per client and 120 per server, egress only to the two official LCDs
 * (READ_NETWORKS), no address logged. `minHeight` (digits, ≤ 20) asks for an answer at least that recent, right after a
 * signed staking action. Any other query key is refused.
 */
export async function GET(request:Request):Promise<Response> {
 const query=new URL(request.url).searchParams,mode=query.get('network'),account=query.get('address'),minHeight=query.get('minHeight');
 if([...query.keys()].some(k=>k!=='network'&&k!=='address'&&k!=='minHeight')||query.getAll('network').length!==1||query.getAll('address').length!==1||query.getAll('minHeight').length>1||!mode||!Object.hasOwn(READ_NETWORKS,mode)||!publicZigAddress.safeParse(account).success||(minHeight!==null&&!MIN_HEIGHT.test(minHeight)))
  return Response.json({error:'A supported read-only network and public ZIG address are required.'},{status:400,headers});
 try {
  const answer=await relay(mode as ReadMode,account!,marketClientGroup(request.headers.get('cf-connecting-ip'))??'',minHeight??undefined);
  if('retryAfter' in answer)return Response.json({error:READS_LIMITED,code:'TRY_LATER'},{status:429,headers:{...headers,'Retry-After':String(answer.retryAfter)}});
  return Response.json({positions:answer.positions},{headers});
 }
 catch {return Response.json({error:'A coherent public snapshot could not be verified. Previous local observations are unchanged.'},{status:502,headers});}
}
