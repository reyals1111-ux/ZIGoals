import {privateAccountRequest} from '../../../lib/server/private-account';
export const dynamic='force-dynamic';
function handle(request:Request){
 const {ZIGOALS_AUTH_ORIGIN,ZIGOALS_AUTH_PUBLIC_KEY,ZIGOALS_SYNC_ORIGIN}=process.env;
 return privateAccountRequest(request,ZIGOALS_AUTH_ORIGIN&&ZIGOALS_AUTH_PUBLIC_KEY&&ZIGOALS_SYNC_ORIGIN?{authOrigin:ZIGOALS_AUTH_ORIGIN,publicKey:ZIGOALS_AUTH_PUBLIC_KEY,syncOrigin:ZIGOALS_SYNC_ORIGIN}:null);
}
export const GET=handle;
export const POST=handle;
