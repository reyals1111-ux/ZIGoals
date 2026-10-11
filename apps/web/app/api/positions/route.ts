/** Public-only same-origin relay: browsers cannot expose upstream block-height evidence. */
import {parseAppEnvironment} from '../../../lib/app-environment';
import {MAINNET_REFUSED,READS_LIMITED,positionsRelay} from '../../../lib/server/positions-relay';
import {READ_NETWORKS,publicZigAddress,type ReadMode} from '../../../lib/position-reader';
export const dynamic='force-dynamic';
const headers={'Cache-Control':'no-store','Referrer-Policy':'no-referrer','X-Content-Type-Options':'nosniff'};
// Session Z-Cloud Part 5 (C4, option a): one relay per server instance (its 60 s answers and its read limits).
const relay=positionsRelay();
export async function GET(request:Request):Promise<Response> {
 const query=new URL(request.url).searchParams,mode=query.get('network'),account=query.get('address');
 if([...query.keys()].some(k=>k!=='network'&&k!=='address')||query.getAll('network').length!==1||query.getAll('address').length!==1||!mode||!Object.hasOwn(READ_NETWORKS,mode)||!publicZigAddress.safeParse(account).success)
  return Response.json({error:'A supported read-only network and public ZIG address are required.'},{status:400,headers});
 // Testnet only on the public builds (the owner's C4 answer); a local demo build still reads mainnet.
 const environment=parseAppEnvironment(process.env.NEXT_PUBLIC_APP_ENVIRONMENT);
 if(mode==='MAINNET_READ_ONLY'&&(environment==='PUBLIC_ALPHA_UNDEPLOYED'||environment==='TESTNET_DEPLOYED'))return Response.json({error:MAINNET_REFUSED,code:'MAINNET_NOT_ON_PUBLIC_ALPHA'},{status:403,headers});
 try {
  const answer=await relay(mode as ReadMode,account!,request.headers.get('cf-connecting-ip')??'');
  if('retryAfter' in answer)return Response.json({error:READS_LIMITED,code:'TRY_LATER'},{status:429,headers:{...headers,'Retry-After':String(answer.retryAfter)}});
  return Response.json({positions:answer.positions},{headers});
 }
 catch {return Response.json({error:'A coherent public snapshot could not be verified. Previous local observations are unchanged.'},{status:502,headers});}
}
