import {sessionAllowed} from './sessions.mjs';
/**
 * Session Z-Cloud Part 5 (A6, ADR-019 C35; ADR-008): step-up with the recovery secret for the five actions that end data
 * or access: Delete cloud data, Delete account, Delete a section, Sign out all other devices and Rotate the key.
 *
 * The app derives a proof from the recovery secret itself (`apps/web/lib/vault/step-up.ts` `stepUpProof`: an HMAC keyed by
 * an HKDF of the secret's 32 bytes over the account, vault and epoch). A remembered device holds the vault's root key and
 * never the secret, so it cannot make one. The vault keeps only the verifier, the SHA-256 of the proof, registered by the
 * app when a vault is created and whenever the secret is entered (trust on first use: the first verifier for the live
 * epoch is kept; a different one is refused), and for the next epoch when a rotation begins, so the rotated vault is
 * covered from its first moment. A verifier for an older epoch no longer counts (the old secret no longer opens the vault).
 *
 * Enforcement is the owner's switch `STEP_UP_REQUIRED` ("on" in the committed config): with it on and a verifier
 * registered for the live epoch, those five requests need the proof in `x-zigoals-step-up`; with it off, or for a vault
 * with no verifier (every vault #32–#35 made), nothing changes. Unlock, sync, compaction, sessions and refresh never ask.
 * The proof travels in a header, so a Worker before this one ignores it and an app before this one never sends it.
 */
export const STEP_UP_HEADER='x-zigoals-step-up',STEP_UP_NEXT_HEADER='x-zigoals-step-up-next',STEP_UP_INTERNAL='x-zigoals-step-up-internal';
/**
 * Gate C (the security read, ADR-019 C53): trust on first use is bound to a fresh sign-in. While the live epoch has no
 * verifier, the first one (a `register`, or a rotation's `next`) is kept only from a session whose email-code sign-in
 * began within this window (`createdAt` of its record, carried across refreshes). A stolen older session therefore cannot
 * register its own verifier first and keep the owner from signing it out; the owner registers when creating a vault or
 * entering the secret after signing in. Refused: STEP_UP_SIGN_IN_AGAIN (the vault then stays as #35 had it).
 */
export const FIRST_REGISTRATION_MS=60*60*1000;
const HEX=/^[a-f0-9]{64}$/;
/** @param {unknown} value @param {number} [status] */
const reply=(value,status=200)=>Response.json(value,{status,headers:{'Cache-Control':'no-store'}});
/** @param {unknown} value @returns {value is string} */
export const isStepUpValue=value=>typeof value==='string'&&HEX.test(value);
/** The SHA-256 of the proof's 32 bytes, as hex. @param {string} proof */
export async function verifierOf(proof){
 const bytes=new Uint8Array(32);for(let i=0;i<32;i++)bytes[i]=parseInt(proof.slice(i*2,i*2+2),16);
 return [...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(v=>v.toString(16).padStart(2,'0')).join('');
}
/**
 * The verifier that holds for the live manifest, or null when there is none for its epoch.
 * @param {{current?:{epoch:number,verifier:string}|null,next?:{epoch:number,verifier:string}|null}|undefined} record
 * @param {{epoch:number}|undefined} manifest
 */
export function activeVerifier(record,manifest){
 if(!record||!manifest)return null;
 for(const entry of [record.current,record.next])if(entry&&entry.epoch===manifest.epoch)return entry.verifier;
 return null;
}
/**
 * The record as the live manifest reads it, before anything is written: the live epoch's verifier (a rotation's staged
 * one once its epoch is published) is `current`, and `next` is kept only for an epoch still to come. Staging the next
 * rotation's verifier therefore never drops the live one (a second rotation used to leave the live epoch uncovered).
 * @param {{current?:{epoch:number,verifier:string}|null,next?:{epoch:number,verifier:string}|null}} record
 * @param {{epoch:number}|undefined} manifest
 */
export function settledRecord(record,manifest){
 const live=activeVerifier(record,manifest);
 return {version:1,current:live&&manifest?{epoch:manifest.epoch,verifier:live}:record.current??null,next:record.next&&manifest&&record.next.epoch>manifest.epoch?record.next:null};
}
/**
 * The vault's side, POST /v1/step-up. From the app (through the Worker): `register` only. From the Worker itself (the
 * internal header, which the Worker strips from every incoming request): `check` a proof, and `next` (the verifier for
 * the epoch a rotation that just began will publish).
 * @param {Request} request @param {RecordState} state @param {(request:Request,max?:number)=>Promise<any>} readJSON
 * @param {()=>number} [now]
 */
export async function stepUpRequest(request,state,readJSON,now=Date.now){
 const hash=request.headers.get('x-zigoals-token-hash'),internal=request.headers.get(STEP_UP_INTERNAL)==='1';
 if(request.method!=='POST')return reply({error:'METHOD_NOT_ALLOWED'},405);
 /** @type {any} */let input;try{input=await readJSON(request,512);}catch{return reply({error:'INVALID_STEP_UP'},400);}
 const keys=input&&typeof input==='object'&&!Array.isArray(input)?Object.keys(input).sort().join(','):'';
 const valid=input?.action==='register'&&keys==='action,epoch,verifier'&&Number.isSafeInteger(input.epoch)&&input.epoch>0&&isStepUpValue(input.verifier)
  ||internal&&input?.action==='check'&&keys==='action,proof'&&(input.proof===null||isStepUpValue(input.proof))
  ||internal&&input?.action==='next'&&keys==='action,epoch,verifier'&&Number.isSafeInteger(input.epoch)&&input.epoch>1&&(input.verifier===null||isStepUpValue(input.verifier));
 if(!valid)return reply({error:'INVALID_STEP_UP'},400);
 const proved=input.action==='check'&&input.proof?await verifierOf(input.proof):null;
 return state.storage.transaction(async store=>{
  if(await store.get('account-deleted'))return input.action==='check'?reply({checked:true}):reply({error:'ACCOUNT_DELETED'},410);
  if(!await sessionAllowed(store,hash))return reply({error:'SESSION_REVOKED'},401);
  const record=await store.get('step-up')??{version:1,current:null,next:null},manifest=await store.get('manifest'),active=activeVerifier(record,manifest);
  if(input.action==='check')return !active||proved===active?reply({checked:true}):reply({error:'STEP_UP_REQUIRED'},403);
  // The first verifier of a vault without one comes only from a fresh sign-in (FIRST_REGISTRATION_MS above).
  const born=Date.parse((await store.get(`session:${hash}`))?.createdAt??''),stale=!active&&!!input.verifier&&(!Number.isFinite(born)||now()-born>FIRST_REGISTRATION_MS);
  // Every rotation that begins sets `next` (its verifier, or none when the app sent none), so a verifier staged by an
  // aborted rotation never becomes another rotation's.
  // A rotation that begins always resets `next`: a stale session's verifier is not staged (the new epoch then has none).
  if(input.action==='next'){if(!manifest||input.epoch!==manifest.epoch+1)return reply({error:'STEP_UP_EPOCH'},409);await store.put('step-up',{...settledRecord(record,manifest),next:input.verifier&&!stale?{epoch:input.epoch,verifier:input.verifier}:null});return stale?reply({error:'STEP_UP_SIGN_IN_AGAIN'},409):reply({staged:true});}
  if(!manifest||input.epoch!==manifest.epoch)return reply({error:'STEP_UP_EPOCH'},409);
  if(active)return active===input.verifier?reply({registered:true}):reply({error:'STEP_UP_DIFFERENT'},409);
  if(stale)return reply({error:'STEP_UP_SIGN_IN_AGAIN'},409);
  await store.put('step-up',{...settledRecord(record,manifest),current:{epoch:input.epoch,verifier:input.verifier}});return reply({registered:true});
 });
}
