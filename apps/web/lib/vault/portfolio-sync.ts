import {z} from 'zod';
import {openRecord,sealRecord,type EncryptedEnvelope,type VaultManifest} from './crypto';
import {RevisionConflict} from './cloud-sync';
import {PORTFOLIO_KEY,emptyPortfolioData,portfolioDataSchema,type PortfolioData} from '../portfolio/schema';
import {checkHistories,readPortfolios} from '../portfolio/store';

/**
 * Session U Part 9 ([TIER 3] (sync), ADR-013): the opt-in encrypted copy of the Portfolio. The Portfolio stays a
 * device record (`zigoals:portfolio:v1`, never read by Wealth, Goals or anything else); when the person ticks "Also sync
 * my Portfolio", the whole Portfolio travels as one sealed snapshot in its own keyspace of the account's vault
 * (workers/private-sync/portfolio.mjs), compare-and-swap on its revision.
 *
 * - Parts: the canonical JSON in pieces of at most PORTFOLIO_PART_CHARS characters, each sealed with the vault key for
 *   its own place (`portfolio` label, a fixed object per index, the snapshot's revision and the active epoch) and saying
 *   how many parts there are, so a part cannot be dropped, reordered or replayed from another revision unnoticed.
 * - The base: what this device last synced (revision, deletion generation, a SHA-256 of the canonical text), under its
 *   own key in the account's storage. Nothing about the base is sent.
 * - The plan is three-way on the whole Portfolio: one side changed, take it; both changed, the person chooses "keep this
 *   device" or "keep the cloud" (the replaced copy is kept as a recovery copy here). An upload whose answer was lost is
 *   recognised on the next sync by its digest.
 */
export const PORTFOLIO_PART_CHARS=48_000,PORTFOLIO_MAX_PARTS=14;
/** The sealed parts' size the Worker keeps (its PORTFOLIO_BYTES_MAX): one snapshot then fits one relay request. */
export const PORTFOLIO_SEALED_MAX=1_000_000;
export const PORTFOLIO_BASE_KEY='zigoals:portfolio-sync:v1',PORTFOLIO_CHOICE_KEY='zigoals:portfolio-sync-choice:v1';
const partObject=(index:number)=>`00000000-0000-4000-8000-${(0x100+index).toString(16).padStart(12,'0')}`;
const partSchema=z.object({version:z.literal(1),index:z.number().int().min(0),count:z.number().int().min(1).max(PORTFOLIO_MAX_PARTS),text:z.string().max(PORTFOLIO_PART_CHARS)}).strict();
export const portfolioCloudSchema=z.object({protocol:z.literal(1),revision:z.number().int().min(0),generation:z.number().int().min(0),epoch:z.number().int().min(1).nullable(),parts:z.array(z.unknown()).max(16)}).strict();
export type PortfolioCloud=z.infer<typeof portfolioCloudSchema>;
const sha=z.string().regex(/^[0-9a-f]{64}$/);
/** What this device last knew of the cloud copy: its revision and deletion generation, the digest of its text (no copy: the empty Portfolio's; null: unreadable, sealed with an earlier key), and the digest of an upload whose answer has not arrived yet. */
export const portfolioBaseSchema=z.object({version:z.literal(1),vault:z.uuid(),revision:z.number().int().min(0),generation:z.number().int().min(0),digest:sha.nullable(),pending:sha.optional()}).strict();
export type PortfolioBase=z.infer<typeof portfolioBaseSchema>;
export class PortfolioTooLarge extends Error{constructor(){super('Your Portfolio is larger than its encrypted copy can hold (about 1 MB once encrypted). Nothing was uploaded; export it from Portfolio instead.');}}

/** The text every device seals and compares: the Portfolio as its schema writes it. */
export const canonicalPortfolio=(data:PortfolioData)=>JSON.stringify(portfolioDataSchema.parse(data));
export async function portfolioDigest(text:string){return [...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(text)))].map(v=>v.toString(16).padStart(2,'0')).join('');}
const context=(manifest:VaultManifest,index:number,revision:number)=>({vault:manifest.vault,domain:'portfolio' as const,object:partObject(index),revision,epoch:manifest.epoch});

export async function sealPortfolio(key:CryptoKey,manifest:VaultManifest,revision:number,text:string):Promise<EncryptedEnvelope[]>{
 const count=Math.max(1,Math.ceil(text.length/PORTFOLIO_PART_CHARS));if(count>PORTFOLIO_MAX_PARTS)throw new PortfolioTooLarge();
 const parts=await Promise.all(Array.from({length:count},(_,index)=>sealRecord(key,context(manifest,index,revision),{version:1,index,count,text:text.slice(index*PORTFOLIO_PART_CHARS,(index+1)*PORTFOLIO_PART_CHARS)})));
 // A part's text is escaped inside its record and other scripts take up to three bytes, so the limit that matters is
 // the sealed size the Worker keeps: refused here, before any upload, rather than by the Worker.
 if(parts.reduce((n,part)=>n+JSON.stringify(part).length,0)>PORTFOLIO_SEALED_MAX)throw new PortfolioTooLarge();
 return parts;
}
/** The cloud snapshot's text, checked part by part and as a whole; null when the cloud holds none. */
export async function openPortfolio(key:CryptoKey,manifest:VaultManifest,cloud:PortfolioCloud):Promise<string|null>{
 if(!cloud.parts.length)return null;
 if(cloud.epoch!==manifest.epoch)throw Error('The Portfolio copy was sealed with an earlier vault key.');
 const parts=await Promise.all(cloud.parts.map(async(envelope,index)=>partSchema.parse(await openRecord(key,context(manifest,index,cloud.revision),envelope))));
 if(parts.some((part,index)=>part.index!==index||part.count!==parts.length))throw Error('The Portfolio copy is incomplete. Nothing was changed.');
 const text=parts.map(part=>part.text).join(''),data=portfolioDataSchema.parse(JSON.parse(text));checkHistories(data);
 if(canonicalPortfolio(data)!==text)throw Error('The Portfolio copy is not in its expected form. Nothing was changed.');
 return text;
}

export type PortfolioPlan='none'|'push'|'pull'|'adopt'|'conflict'|'deleted'|'stale'|'refused';
/**
 * What to do, from what this device last synced (`base`), what it holds now and what the cloud holds. Digests are of
 * the canonical text, and a cloud with no copy reads as the empty Portfolio (`empty`). `remote.stale`: the cloud's parts
 * were sealed before a key rotation, so they can no longer be read here (its digest is then null).
 */
export function planPortfolioSync({base:known,local,remote}:{base:PortfolioBase|null;local:{digest:string;empty:boolean};remote:{revision:number;generation:number;digest:string|null;empty:boolean;stale:boolean}}):PortfolioPlan{
 // An older copy than this device already saw (a lower generation, or a lower revision in the same one): refused.
 if(known&&(remote.generation<known.generation||remote.generation===known.generation&&remote.revision<known.revision))return 'refused';
 // The cloud copy was deleted since this device last synced: never upload it again without the person.
 if(known&&remote.generation!==known.generation)return 'deleted';
 if(remote.stale)return local.empty?'stale':'push';
 // An upload whose answer was lost: the cloud holds exactly what this device sent, one revision on.
 const base=known?.pending&&remote.revision===known.revision+1&&remote.digest===known.pending?{...known,revision:remote.revision,digest:known.pending}:known;
 if(base&&remote.revision===base.revision)return remote.digest!==base.digest?'refused':local.digest===base.digest?'none':'push';
 if(remote.digest===local.digest)return 'adopt';
 // The cloud changed since this device last synced.
 if(base)return local.digest===base.digest?'pull':'conflict';
 // This device's first sync.
 if(remote.empty)return 'push';
 return local.empty?'pull':'conflict';
}

export type PortfolioTransport={read:()=>Promise<unknown>;write:(operation:unknown)=>Promise<unknown>};
export type PortfolioOutcome={state:'unchanged'|'pushed'|'pulled'|'adopted'|'conflict'|'deleted'|'stale'};
export function readPortfolioBase(storage:Pick<Storage,'getItem'>,vault:string):PortfolioBase|null{
 try{const raw=storage.getItem(PORTFOLIO_BASE_KEY);if(raw===null)return null;const base=portfolioBaseSchema.parse(JSON.parse(raw));return base.vault===vault?base:null;}catch{return null;}
}
/** Whether the person chose to sync the Portfolio for this account on this device (kept in the account's storage, not in the remembered-device record). */
export function portfolioSyncChosen(storage:Pick<Storage,'getItem'>):boolean{try{return JSON.parse(storage.getItem(PORTFOLIO_CHOICE_KEY)??'null')?.enabled===true;}catch{return false;}}
export function choosePortfolioSync(storage:Pick<Storage,'setItem'|'removeItem'>,enabled:boolean){if(enabled)storage.setItem(PORTFOLIO_CHOICE_KEY,JSON.stringify({version:1,enabled:true}));else{storage.removeItem(PORTFOLIO_CHOICE_KEY);storage.removeItem(PORTFOLIO_BASE_KEY);}}

/**
 * One Portfolio sync. `choice` answers a conflict: keep this device's Portfolio (upload it) or the cloud's (it replaces
 * this device's, whose bytes are kept as a recovery copy). A local edit made during the sync is never overwritten.
 */
export async function syncPortfolio({transport,key,manifest,storage,fence,choice}:{transport:PortfolioTransport;key:CryptoKey;manifest:VaultManifest;storage:Storage;fence:()=>void;choice?:'keep-device'|'keep-cloud'}):Promise<PortfolioOutcome>{
 const cloud=portfolioCloudSchema.parse(await transport.read());fence();
 const local=readPortfolios(storage);if(local.unreadable)throw Error('Your Portfolio on this device could not be read, so it was not synced. It was not changed.');
 const localText=canonicalPortfolio(local.data),localDigest=await portfolioDigest(localText),raw=storage.getItem(PORTFOLIO_KEY);
 const stale=cloud.parts.length>0&&cloud.epoch!==manifest.epoch,remoteText=stale?null:await openPortfolio(key,manifest,cloud);fence();
 // No copy in the cloud compares as the empty Portfolio; a stale copy cannot be compared at all.
 const remoteDigest=stale?null:await portfolioDigest(remoteText??canonicalPortfolio(emptyPortfolioData())),base=readPortfolioBase(storage,manifest.vault);
 const plan:PortfolioPlan=choice==='keep-device'?'push':choice==='keep-cloud'?(remoteText===null?'push':'pull'):planPortfolioSync({base,local:{digest:localDigest,empty:!local.data.portfolios.length},remote:{revision:cloud.revision,generation:cloud.generation,digest:remoteDigest,empty:remoteText===null&&!stale,stale}});
 const record=(revision:number,generation:number,digest:string|null,pending?:string)=>storage.setItem(PORTFOLIO_BASE_KEY,JSON.stringify(portfolioBaseSchema.parse({version:1,vault:manifest.vault,revision,generation,digest,...(pending?{pending}:{})})));
 if(plan==='refused')throw Error('An older or altered encrypted copy of your Portfolio was refused. Nothing was changed.');
 if(plan==='none')return {state:'unchanged'};
 if(plan==='conflict'||plan==='stale')return {state:plan};
 if(plan==='deleted'){storage.removeItem(PORTFOLIO_BASE_KEY);return {state:'deleted'};}
 if(plan==='adopt'){record(cloud.revision,cloud.generation,remoteDigest);return {state:'adopted'};}
 if(plan==='pull'){
  const next=portfolioDataSchema.parse(JSON.parse(remoteText!));
  fence();if(storage.getItem(PORTFOLIO_KEY)!==raw)throw Error('Your Portfolio changed during sync. Nothing was overwritten; sync again.');
  // Kept as a recovery copy when the person chose the cloud's copy over this device's own edits.
  if(choice==='keep-cloud'&&raw!==null)storage.setItem(`${PORTFOLIO_KEY}:recovery:${crypto.randomUUID()}`,raw);
  storage.setItem(PORTFOLIO_KEY,JSON.stringify(next));record(cloud.revision,cloud.generation,remoteDigest!);return {state:'pulled'};
 }
 const parts=await sealPortfolio(key,manifest,cloud.revision+1,localText);fence();
 // Written before the upload: if its answer is lost, the next sync recognises the cloud copy as this one.
 record(cloud.revision,cloud.generation,stale?null:remoteDigest,localDigest);
 const answer=z.object({revision:z.number().int(),generation:z.number().int()}).passthrough().parse(await transport.write({protocol:1,action:'put',vault:manifest.vault,operation:crypto.randomUUID(),base:cloud.revision,generation:cloud.generation,epoch:manifest.epoch,parts}));
 record(answer.revision,answer.generation,localDigest);return {state:'pushed'};
}
/** Deletes the cloud copy (the snapshot and its parts); every device that synced it stops at its next sync and says so. */
export async function deletePortfolioCopy({transport,manifest,storage,fence}:{transport:PortfolioTransport;manifest:VaultManifest;storage:Storage;fence:()=>void}){
 const cloud=portfolioCloudSchema.parse(await transport.read());fence();
 await transport.write({protocol:1,action:'delete',vault:manifest.vault,operation:crypto.randomUUID(),base:cloud.revision,generation:cloud.generation});
 storage.removeItem(PORTFOLIO_BASE_KEY);
}
/** The relay's two Portfolio calls (lib/server/private-account.ts), with the vault transport's errors. */
export function portfolioTransport(account:string,fence:()=>void):PortfolioTransport{
 async function request(operation?:unknown){
  fence();const response=await fetch('/api/private-account'+(operation?'':'?action=portfolio'),{method:operation?'POST':'GET',headers:{'X-Zigoals-Account':account,...(operation?{'Content-Type':'application/json'}:{})},...(operation?{body:JSON.stringify({action:'portfolio',operation})}:{}),cache:'no-store',signal:AbortSignal.timeout(20000)});
  const text=await response.text();if(text.length>(operation?32768:1_100_000))throw Error('Sync response exceeds capacity.');fence();
  const data=JSON.parse(text);
  if(!response.ok){if(response.status===409&&data.error==='REVISION_CONFLICT')throw new RevisionConflict();throw Error(data.error==='ROTATION_IN_PROGRESS'?'A key rotation is in progress. Your Portfolio syncs after it.':data.error==='PORTFOLIO_CAPACITY_EXPORT_REQUIRED'?'Your Portfolio is too large to sync. Export it from Portfolio instead.':'Portfolio sync was not confirmed. Your Portfolio on this device was preserved.');}
  return data;
 }
 return {read:()=>request(),write:operation=>request(operation)};
}
