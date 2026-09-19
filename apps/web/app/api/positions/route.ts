/** Public-only same-origin relay: browsers cannot expose upstream block-height evidence. */
import {readNativePositions} from '../../../lib/native-positions';
import {READ_NETWORKS,publicZigAddress,type ReadMode} from '../../../lib/position-reader';
export const dynamic='force-dynamic';
const headers={'Cache-Control':'no-store','Referrer-Policy':'no-referrer','X-Content-Type-Options':'nosniff'};
export async function GET(request:Request):Promise<Response> {
 const query=new URL(request.url).searchParams,mode=query.get('network'),account=query.get('address');
 if([...query.keys()].some(k=>k!=='network'&&k!=='address')||query.getAll('network').length!==1||query.getAll('address').length!==1||!mode||!Object.hasOwn(READ_NETWORKS,mode)||!publicZigAddress.safeParse(account).success)
  return Response.json({error:'A supported read-only network and public ZIG address are required.'},{status:400,headers});
 try {return Response.json({positions:await readNativePositions(mode as ReadMode,account!)},{headers});}
 catch {return Response.json({error:'A coherent public snapshot could not be verified. Previous local observations are unchanged.'},{status:502,headers});}
}
