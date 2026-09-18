/** VM-independent private accounting. No wallet, signer, network or execution imports. */
import { z } from 'zod';
import {marketQuoteSchema,quoteIsStale,quoteValue,sameAsset,type MarketQuote,type ValuationEvidence} from './market-quotes';
export const PLATFORM_KEY = 'zigoals:platform:v1';
export const units = z.string().regex(/^(0|[1-9]\d*)$/).max(78);
const id = z.string().min(1).max(250);
const date = z.iso.date();
const at = z.iso.datetime();
const decimals = z.number().int().min(0).max(18);
export const SOURCE_TYPES = ['WALLET_LIQUID','NATIVE_STAKING','NATIVE_UNBONDING','NATIVE_REWARDS','GOAL_MANAGER','MANUAL','LIQUID_STAKING','VAULT','EXTERNAL_ACCOUNT','IBC','EVM','RWA','OTHER_VERIFIED_PROVIDER'] as const;
export const PROVIDER_STATES = ['VERIFIED_READ_ONLY','MANUAL','RESEARCH_ONLY','EXECUTION_READY','EXECUTABLE'] as const;
export const positionSchema = z.object({
 id, providerId:id, sourceType:z.enum(SOURCE_TYPES), network:id, account:id,
 asset:z.string().min(1).max(30), denom:id, quantity:units, decimals,
 valuation:z.object({value:units,currency:z.string().min(1).max(10),decimals,source:z.enum(['MANUAL','VERIFIED']),observedAt:at}).strict().optional(),
 principal:units.optional(), unclaimedRewards:units.optional(),
 liquidity:z.enum(['LIQUID','BONDED','UNBONDING','LOCKED','UNKNOWN']),
 verification:z.enum(PROVIDER_STATES), sync:z.enum(['CURRENT','STALE','ERROR','MANUAL']).default('MANUAL'),
 observedAt:at, provenance:z.string().min(1).max(500), notes:z.string().max(2000).default(''),
 risk:z.string().max(500).default(''), executionAuthority:z.literal('NONE').default('NONE'),
 validator:z.object({address:id,name:z.string().max(200),status:z.string().max(100),commission:z.string().regex(/^(0(\.\d{1,18})?|1(\.0{1,18})?)$/),votingTokens:units}).strict().optional(),
 exitDate:at.optional(), unbondingHeight:units.optional(),
}).strict();
export type Position = z.infer<typeof positionSchema>;
export const contributionSchema = z.object({
 amount:units,asset:z.string().min(1).max(30),decimals,
 cadence:z.enum(['weekly','monthly','yearly','irregular']),nextDate:date,endDate:date.optional(),active:z.boolean(),
 habitId:z.string().max(100).optional(),
 price:z.object({value:units.refine(v=>BigInt(v)>0n),decimals,currency:z.string().min(1).max(10)}).strict().optional(),
}).strict().refine(p=>!p.endDate||p.endDate>=p.nextDate,'Plan ends before next contribution.');
export type ContributionPlan = z.infer<typeof contributionSchema>;
export const privateGoalSchema = z.object({
 id:z.string().regex(/^\d+$/).max(80),name:z.string().trim().min(1).max(100),
 network:z.enum(['zigchain-1','zig-test-2']).default('zigchain-1'),
 category:z.enum(['Emergency Fund','First Home','Financial Freedom','Travel','Education','Custom']).optional(),
 pinned:z.boolean().optional(),locked:z.boolean().optional(),
 type:z.enum(['QUANTITY','VALUE','REWARD','PROJECT']),status:z.enum(['active','completed','closed']),
 asset:z.string().min(1).max(30),denom:id,decimals,target:units.refine(v=>BigInt(v)>0n),
 notes:z.string().max(2000),createdAt:at,targetDate:date.optional(),plan:contributionSchema.optional(),
 milestones:z.array(z.object({id,title:z.string().min(1).max(100),done:z.boolean(),target:units.optional()}).strict()).max(100),
}).strict();
export type PrivateGoal = z.infer<typeof privateGoalSchema>;
const allocationSchema = z.object({goalId:id,positionId:id,quantity:units}).strict();
const platformBase = z.object({legacyGoalUi:z.record(z.string(),z.object({pinned:z.boolean().optional(),locked:z.boolean().optional(),archived:z.boolean().optional()}).strict()).optional(),schemaVersion:z.literal(1),kind:z.literal('zigoals-platform'),
 positions:z.array(positionSchema).max(1000),goals:z.array(privateGoalSchema).max(200),allocations:z.array(allocationSchema).max(2000),
 watchScope:z.object({network:id,account:id}).strict().optional(),
 aprAssumptions:z.array(z.object({network:id,account:id,percent:z.string().regex(/^(0|[1-9]\d{0,2})(\.\d{1,6})?$/).refine(v=>Number(v)<=100)}).strict()).max(1000).optional(),
 snapshots:z.array(z.object({positionId:id,quantity:units,observedAt:at}).strict()).max(2000),
}).strict();
export const platformSchema = platformBase.superRefine((s,c)=>{
 const issue=(message:string)=>c.addIssue({code:'custom',message});
 for(const list of [s.positions,s.goals]) if(new Set(list.map(i=>i.id)).size!==list.length) issue('Duplicate identifier.');
 if(new Set(s.allocations.map(a=>`${a.goalId}:${a.positionId}`)).size!==s.allocations.length) issue('Duplicate allocation.');
 for(const a of s.allocations) if(!s.positions.some(p=>p.id===a.positionId)||!s.goals.some(g=>g.id===a.goalId)) issue('Dangling allocation.');
 for(const p of s.positions) {
  if(p.sourceType==='MANUAL'&&p.verification!=='MANUAL') issue('Manual positions cannot be verified.');
  if(p.principal && p.sourceType==='NATIVE_STAKING' && p.principal!==p.quantity) issue('Stake principal mismatch.');
 }
}).transform(reconcileGoalStatuses);
export type Platform = z.infer<typeof platformBase>;
/** Derived on every read/import; next explicit edit persists the correction.
 * Closed state and every observation/allocation remain intact. */
export function reconcileGoalStatuses(s:Platform):Platform {
 return {...s,goals:s.goals.map(g=>{
  if(g.status==='closed')return g;
  const p=goalProgress(s,g.id);
  const status:PrivateGoal['status']=BigInt(p.current)>=BigInt(p.target)?'completed':'active';
  return g.status===status?g:{...g,status};
 })};
}
export function emptyPlatform(): Platform { return {schemaVersion:1,kind:'zigoals-platform',positions:[],goals:[],allocations:[],snapshots:[]}; }
/** Existing contract Goals, journal and simulations stay in their original scoped stores.
 * Migration is additive: absence -> empty v1; malformed/newer content never resets. */
export function migratePlatform(raw:unknown):Platform { return raw===null?emptyPlatform():platformSchema.parse(raw); }
const max=(a:bigint,b:bigint)=>a>b?a:b;
function activeAllocations(s:Platform,positionId:string){return s.allocations.filter(a=>a.positionId===positionId&&s.goals.some(g=>g.id===a.goalId&&g.status!=='closed'));}
export function allocationBalance(s:Platform,positionId:string){
 const p=s.positions.find(p=>p.id===positionId);if(!p)throw Error('Position unavailable.');
 const observed=BigInt(p.quantity),allocated=activeAllocations(s,positionId).reduce((n,a)=>n+BigInt(a.quantity),0n);
 return {observed:observed.toString(),allocated:allocated.toString(),unallocated:max(0n,observed-allocated).toString(),deficit:max(0n,allocated-observed).toString()};
}
/** Only native ZIG's evidenced redenominations are interchangeable; unrelated assets are not. */
export function assetMatches(goal:PrivateGoal,p:Position):boolean {
 return goal.asset===p.asset && ((goal.denom===p.denom&&goal.decimals===p.decimals) ||
 (goal.asset==='ZIG'&&((goal.denom==='azig'&&goal.decimals===18)||(goal.denom==='uzig'&&goal.decimals===6))&&((p.denom==='azig'&&p.decimals===18)||(p.denom==='uzig'&&p.decimals===6))));
}
export function rescaleUnits(quantity:string,from:number,to:number):string {
 units.parse(quantity);decimals.parse(from);decimals.parse(to);
 return (BigInt(quantity)*10n**BigInt(to)/10n**BigInt(from)).toString();
}
export function allocate(raw:Platform,goalId:string,positionId:string,quantity:string):Platform {
 const s=platformSchema.parse(raw);units.parse(quantity);
 const goal=s.goals.find(g=>g.id===goalId),p=s.positions.find(p=>p.id===positionId);
 if(goal?.locked)throw Error('Unlock this Goal before editing.');
 if(!goal||goal.status==='closed'||!p)throw Error('Choose an open Goal and available Position.');
 if(p.network!=='manual'&&p.network!==goal.network)throw Error('Position and Goal network must match.');
 if(goal.type==='PROJECT')throw Error('Projects use milestones, not financial allocations.');
 if(goal.type!=='VALUE'&&!assetMatches(goal,p))throw Error('Goal and Position assets must match.');
 if(goal.type==='REWARD'&&p.sourceType!=='NATIVE_REWARDS')throw Error('Reward Goals count observed rewards only.');
 const others=activeAllocations(s,positionId).filter(a=>a.goalId!==goalId).reduce((n,a)=>n+BigInt(a.quantity),0n);
 const previous=BigInt(s.allocations.find(a=>a.goalId===goalId&&a.positionId===positionId)?.quantity??'0');
 // A deficit can be reduced incrementally; never increase an already invalid total.
 if(others+BigInt(quantity)>BigInt(p.quantity)&&BigInt(quantity)>=previous)throw Error('Allocation exceeds observed units. Reduce allocations to resolve the deficit.');
 return platformSchema.parse({...s,allocations:[...s.allocations.filter(a=>a.goalId!==goalId||a.positionId!==positionId),...(quantity==='0'?[]:[{goalId,positionId,quantity}])]});
}
export function closeGoal(s:Platform,id:string):Platform {if(s.goals.find(g=>g.id===id)?.locked)throw Error('Unlock this Goal before editing.');return platformSchema.parse({...s,goals:s.goals.map(g=>g.id===id?{...g,status:'closed'}:g),allocations:s.allocations.filter(a=>a.goalId!==id)});}
/** Verified observations expire after 15 minutes; old evidence remains historical, never erased. */
export const SNAPSHOT_FRESH_MS=15*60*1000;
export function snapshotIsStale(observedAt:string,now=Date.now()):boolean {
 const observed=Date.parse(observedAt);return !Number.isFinite(observed)||!Number.isFinite(now)||observed>now+60000||now-observed>SNAPSHOT_FRESH_MS;
}
export function positionSync(p:Position,now=Date.now()):Position['sync'] {
 if(p.sync==='ERROR'||p.sync==='STALE')return p.sync;
 if(p.verification==='MANUAL')return 'MANUAL';
 return snapshotIsStale(p.observedAt,now)?'STALE':p.sync;
}
export function saveManualPosition(raw:Platform,incoming:Position):Platform {
 const s=platformSchema.parse(raw),p=positionSchema.parse(incoming);const old=s.positions.find(existing=>existing.id===p.id);
 if(p.sourceType!=='MANUAL'||p.verification!=='MANUAL'||(old&&(old.sourceType!=='MANUAL'||old.asset!==p.asset||old.denom!==p.denom||old.decimals!==p.decimals||old.network!==p.network||old.account!==p.account)))throw Error('Position asset identity cannot change. Add a new Position instead.');
 return platformSchema.parse({...s,positions:[...s.positions.filter(existing=>existing.id!==p.id),p],snapshots:[...s.snapshots,{positionId:p.id,quantity:p.quantity,observedAt:p.observedAt}].slice(-2000)});
}
export function goalProgress(s:Platform,id:string,now=Date.now(),quotes:readonly MarketQuote[]=[]){
 const goal=s.goals.find(g=>g.id===id);if(!goal)throw Error('Goal unavailable.');
 let current=0n,manual=0n,verified=0n,intended=0n;let requiresReview=false,missingValuation=false,staleValuation=false;
 const breakdown=[] as {positionId:string;quantity:string;counted:string;verification:string;deficit:boolean;valuation?:ValuationEvidence}[];
 if(goal.type==='PROJECT')current=BigInt(goal.milestones.filter(m=>m.done).length);
 else if(goal.status!=='closed')for(const a of s.allocations.filter(a=>a.goalId===id)){
  const p=s.positions.find(p=>p.id===a.positionId)!;const b=allocationBalance(s,p.id);
  const q=BigInt(a.quantity),total=BigInt(b.allocated),observed=BigInt(p.quantity);
  const effective=total>observed?q*observed/total:q;
  let value=BigInt(rescaleUnits(effective.toString(),p.decimals,goal.decimals));if(goal.type!=='VALUE')intended+=BigInt(rescaleUnits(q.toString(),p.decimals,goal.decimals));
  const deficit=b.deficit!=='0';requiresReview ||= deficit || ['ERROR','STALE'].includes(positionSync(p,now));
  if(p.network!=='manual'&&p.network!==goal.network){requiresReview=true;value=0n;}
  if(!['MANUAL','VERIFIED_READ_ONLY','EXECUTION_READY','EXECUTABLE'].includes(p.verification)){requiresReview=true;value=0n;}
  let valuation:ValuationEvidence|undefined;
  if(goal.type==='VALUE'){
   const v=p.valuation;
   const matching=quotes.filter(q=>marketQuoteSchema.safeParse(q).success&&sameAsset(p,q.base)&&q.currency===goal.asset&&Date.parse(q.observedAt)<=now+60000).sort((a,b)=>Date.parse(b.observedAt)-Date.parse(a.observedAt))[0];
   if(v&&v.currency===goal.asset&&v.decimals===goal.decimals){
    value=observed?BigInt(v.value)*effective/observed:0n;
    intended+=observed?BigInt(v.value)*q/observed:0n;
    valuation={state:v.source==='MANUAL'?'manual':snapshotIsStale(v.observedAt,now)?'stale':'fresh',source:v.source==='MANUAL'?'Manual valuation':'Position valuation',observedAt:v.observedAt};
   }else if(matching){
    value=BigInt(quoteValue(effective.toString(),p.decimals,matching,goal.decimals));
    intended+=BigInt(quoteValue(q.toString(),p.decimals,matching,goal.decimals));
    valuation={state:quoteIsStale(matching,now)?'stale':'fresh',quote:matching,source:matching.source,observedAt:matching.observedAt};
   }else{value=0n;valuation={state:'missing'};}
   if(valuation.state==='missing'){missingValuation=true;requiresReview=true;}
   if(valuation.state==='stale'){staleValuation=true;requiresReview=true;}
  } else if(!assetMatches(goal,p)||(goal.type==='REWARD'&&p.sourceType!=='NATIVE_REWARDS')){requiresReview=true;value=0n;}
  if((p.network!=='manual'&&p.network!==goal.network)||p.verification==='RESEARCH_ONLY')value=0n;
  current+=value;
  if(p.verification==='MANUAL'||valuation?.state==='manual')manual+=value;else verified+=value;
  breakdown.push({positionId:p.id,quantity:a.quantity,counted:value.toString(),verification:p.verification,deficit,valuation});
 }
 const target=goal.type==='PROJECT'?BigInt(goal.milestones.length||1):BigInt(goal.target);
 const pct=current*10000n/target;
 return {current:current.toString(),target:target.toString(),remaining:max(0n,target-current).toString(),manual:manual.toString(),verified:verified.toString(),intended:intended.toString(),progressPct:`${pct/100n}.${String(pct%100n).padStart(2,'0')}`,requiresReview,missingValuation,staleValuation,breakdown};
}
/** Public quotes derive presentation status; private storage never persists market evidence. */
export function derivedGoalStatus(s:Platform,id:string,now=Date.now(),quotes:readonly MarketQuote[]=[]):PrivateGoal['status'] {
 const goal=s.goals.find(g=>g.id===id);if(!goal)throw Error('Goal unavailable.');if(goal.status==='closed')return 'closed';
 const progress=goalProgress(s,id,now,quotes);return BigInt(progress.current)>=BigInt(progress.target)?'completed':'active';
}
/** Only evidenced native stake in this Goal's network may fund its staking scenario. */
export function allocatedNativePrincipal(s:Platform,goalId:string):string {
 const goal=s.goals.find(g=>g.id===goalId);if(!goal||goal.status==='closed'||goal.type==='PROJECT'||goal.type==='REWARD')return '0';
 let total=0n;
 for(const a of s.allocations.filter(a=>a.goalId===goalId)){
  const p=s.positions.find(p=>p.id===a.positionId);if(!p||p.sourceType!=='NATIVE_STAKING'||p.asset!=='ZIG'||p.network!==goal.network||!['VERIFIED_READ_ONLY','EXECUTION_READY','EXECUTABLE'].includes(p.verification))continue;
  if(!((p.network==='zigchain-1'&&p.denom==='uzig'&&p.decimals===6)||(p.network==='zig-test-2'&&p.denom==='azig'&&p.decimals===18)))continue;
  if(goal.type!=='VALUE'&&!assetMatches(goal,p))continue;
  const allocated=BigInt(allocationBalance(s,p.id).allocated),observed=BigInt(p.quantity),requested=BigInt(a.quantity);
  const effective=allocated>observed?requested*observed/allocated:requested;
  total+=BigInt(rescaleUnits(effective.toString(),p.decimals,18));
 }
 return total.toString();
}
/** Undated scenarios always use one calendar year, clamping February 29. */
export function scenarioHorizon(asOf:string,targetDate?:string):string {
 date.parse(asOf);if(targetDate)return date.parse(targetDate);
 const anchor=new Date(`${asOf}T12:00:00Z`),year=anchor.getUTCFullYear()+1,month=anchor.getUTCMonth();
 if(year>9999)throw Error('Choose an explicit supported scenario horizon.');
 const lastDay=new Date(Date.UTC(year,month+1,0)).getUTCDate();
 return new Date(Date.UTC(year,month,Math.min(anchor.getUTCDate(),lastDay),12)).toISOString().slice(0,10);
}
export function stakingProjection(principal:string,aprPercent:string,days:number):string{
 units.parse(principal);if(!/^(0|[1-9]\d{0,2})(\.\d{1,6})?$/.test(aprPercent)||!Number.isInteger(days)||days<0||days>36500)throw Error('Invalid APR assumption or horizon.');
 const [whole,frac='']=aprPercent.split('.');const rate=BigInt(whole!)*1000000n+BigInt(frac.padEnd(6,'0'));
 if(rate>100000000n)throw Error('APR assumption exceeds 100%.');
 return (BigInt(principal)*rate*BigInt(days)/(100000000n*365n)).toString();
}
function contributionUnits(goal:PrivateGoal,plan:ContributionPlan):bigint{
 if(goal.asset===plan.asset)return BigInt(plan.amount)*10n**BigInt(goal.decimals)/10n**BigInt(plan.decimals);
 if(!plan.price||plan.price.currency!==plan.asset)throw Error('An explicit price assumption is required for this contribution currency.');
 return BigInt(plan.amount)*10n**BigInt(plan.price.decimals)*10n**BigInt(goal.decimals)/(BigInt(plan.price.value)*10n**BigInt(plan.decimals));
}
export function planScenario(goal:PrivateGoal,current:string,raw:ContributionPlan,through:string,asOf=raw.nextDate){
 const plan=contributionSchema.parse(raw);date.parse(through);date.parse(asOf);units.parse(current);
 const dates:string[]=[];let contributions=0n;let completionDate:string|null=BigInt(current)>=BigInt(goal.target)?asOf:null;
 if(plan.active){
 const amount=contributionUnits(goal,plan);const anchor=new Date(`${plan.nextDate}T12:00:00Z`);
 for(let n=0;n<=12000;n++){
  let d=new Date(anchor);
  if(plan.cadence==='weekly')d.setUTCDate(d.getUTCDate()+n*7);
  if(plan.cadence==='monthly'||plan.cadence==='yearly'){
   const months=n*(plan.cadence==='yearly'?12:1);d=new Date(Date.UTC(anchor.getUTCFullYear(),anchor.getUTCMonth()+months,1,12));
   d.setUTCDate(Math.min(anchor.getUTCDate(),new Date(Date.UTC(d.getUTCFullYear(),d.getUTCMonth()+1,0)).getUTCDate()));
  }
  if(d.getUTCFullYear()>9999)break;
  const scheduled=d.toISOString().slice(0,10);if(scheduled>through||(plan.endDate&&scheduled>plan.endDate))break;
  if(n===12000)throw Error('Scenario horizon exceeds 12,000 scheduled dates. Choose a shorter horizon.');
  if(scheduled>=asOf){dates.push(scheduled);contributions+=amount;if(completionDate===null&&BigInt(current)+contributions>=BigInt(goal.target))completionDate=scheduled;}
  if(plan.cadence==='irregular')break;
 }
 }
 const projected=BigInt(current)+contributions,target=BigInt(goal.target);
 return {completionDate,contributions:contributions.toString(),projected:projected.toString(),dates,shortfall:max(0n,target-projected).toString(),surplus:max(0n,projected-target).toString(),fundingHealth:BigInt(current)>=target?'COMPLETED':projected>=target?'ON_TRACK':'BEHIND'};
}
export interface PositionProvider { readonly id:string; readonly state:typeof PROVIDER_STATES[number]; read(account:string):Promise<Position[]> }
export interface CosmosExecutionAdapter { readonly vm:'COSMOS'; readonly authority:'SEPARATE_APPROVAL_REQUIRED' }
export interface EvmExecutionAdapter { readonly vm:'EVM'; readonly authority:'FUTURE_GATED' }
export const FUTURE_PROVIDERS=['Valdora stZIG','Valdora vaults','OroSwap LP','PermaPod','WME','Zignaly external account','Nawa','IBC','EVM','RWA'].map(name=>({name,state:'RESEARCH_ONLY' as const}));

export function replaceObservation(s:Platform,network:string,account:string,incoming:Position[],observedAt=new Date().toISOString()):Platform{
 if(incoming.some(p=>p.network!==network||p.account!==account||p.providerId!=='native-zig'))throw Error('Observation scope mismatch.');
 observedAt=incoming[0]?.observedAt??observedAt;
 const previous=s.positions.filter(p=>p.network===network&&p.account===account&&p.providerId==='native-zig');
 const retained=s.positions.filter(p=>!previous.includes(p));
 const missing=previous.filter(p=>!incoming.some(n=>n.id===p.id)).map(p=>({...p,quantity:'0',principal:p.principal===undefined?undefined:'0',unclaimedRewards:p.unclaimedRewards===undefined?undefined:'0',observedAt,sync:'CURRENT' as const}));
 const positions=[...retained,...incoming,...missing];
 return platformSchema.parse({...s,positions,snapshots:[...s.snapshots,...[...incoming,...missing].map(p=>({positionId:p.id,quantity:p.quantity,observedAt:p.observedAt}))].slice(-2000)});
}

/** A failed refresh changes status only; it cannot manufacture new observation facts. */
export function markObservationError(s:Platform,network:string,account:string):Platform {
 return platformSchema.parse({...s,positions:s.positions.map(p=>p.network===network&&p.account===account&&p.providerId==='native-zig'?{...p,sync:'ERROR'}:p)});
}

/** Fetch only when an allocated, open USD Value Goal can consume the supported public pair. */
export function needsMarketQuotes(s:Platform):boolean {
 return s.goals.some(g=>g.type==='VALUE'&&g.status!=='closed'&&g.asset==='USD'&&s.allocations.some(a=>a.goalId===g.id&&BigInt(a.quantity)>0n&&s.positions.some(p=>p.id===a.positionId&&p.network===g.network&&p.network==='zigchain-1'&&p.denom==='uzig'&&p.decimals===6)));
}

/** UI locks guard every private-store mutation, including stale forms in other tabs. */
export function assertGoalEditsUnlocked(before:Platform,after:Platform):void {
 for(const goal of before.goals.filter(g=>g.locked)){
  const next=after.goals.find(g=>g.id===goal.id);
  const content=(g:PrivateGoal)=>{const {locked,pinned,status,...rest}=g;void locked;void pinned;void status;return rest;};
  if(!next||JSON.stringify(content(goal))!==JSON.stringify(content(next))||
    (next.status==='closed'&&goal.status!=='closed')||
    JSON.stringify(before.allocations.filter(a=>a.goalId===goal.id))!==JSON.stringify(after.allocations.filter(a=>a.goalId===goal.id)))throw Error('Unlock this Goal before editing.');
 }
}
export function deletePrivateGoal(s:Platform,id:string):Platform {
 if(s.goals.find(g=>g.id===id)?.locked)throw Error('Unlock this Goal before deleting.');
 return platformSchema.parse({...s,goals:s.goals.filter(g=>g.id!==id),allocations:s.allocations.filter(a=>a.goalId!==id)});
}
