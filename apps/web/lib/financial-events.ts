/** Manual statement evidence is a durable ledger, separate from live holdings and UI Activity. */
import {z} from 'zod';
import type {Platform} from './positions';
const id=z.string().min(1).max(250),at=z.iso.datetime(),units=z.string().regex(/^(0|[1-9]\d*)$/).max(78),decimals=z.number().int().min(0).max(18);
export const evidenceMoneySchema=z.object({value:units,decimals,currency:z.string().regex(/^[A-Z]{3}$/)}).strict();
export type EvidenceMoney=z.infer<typeof evidenceMoneySchema>;
const rateSchema=z.object({value:units.refine(v=>BigInt(v)>0n),decimals:z.number().int().min(0).max(30)}).strict();
export const financialPortfolioSchema=z.object({id,name:z.string().trim().min(1).max(120),currency:z.string().regex(/^[A-Z]{3}$/),createdAt:at}).strict();
export type FinancialPortfolio=z.infer<typeof financialPortfolioSchema>;
export const manualFxSchema=z.object({id,occurredAt:at,recordedAt:at,source:z.literal('MANUAL'),sourceLabel:z.string().trim().min(1).max(300),original:evidenceMoneySchema,converted:evidenceMoneySchema,rate:rateSchema}).strict();
export type ManualFx=z.infer<typeof manualFxSchema>;
const common={id,portfolioId:id,occurredAt:at,recordedAt:at,source:z.literal('MANUAL'),sourceLabel:z.string().trim().min(1).max(300),note:z.string().max(1000),relatedContributionId:id.optional(),relatedPlanRevisionId:id.optional()};
const originalAsset=z.object({symbol:z.string().min(1).max(30),network:id,denom:id,units,decimals}).strict();
export const financialEventSchema=z.discriminatedUnion('kind',[
 z.object({...common,kind:z.literal('valuation'),amount:evidenceMoneySchema,role:z.enum(['boundary','before_flow','after_flow']),flowId:id.optional()}).strict(),
 z.object({...common,kind:z.literal('external_flow'),direction:z.enum(['IN','OUT']),amount:evidenceMoneySchema,fxId:id.optional(),originalAsset:originalAsset.optional()}).strict(),
 z.object({...common,kind:z.enum(['income','fee','transfer','quantity_correction','unclassified']),amount:evidenceMoneySchema,originalAsset:originalAsset.optional()}).strict(),
 z.object({...common,kind:z.literal('void'),reversesId:id}).strict(),
]);
export type FinancialEvent=z.infer<typeof financialEventSchema>;
export const performanceReviewSchema=z.object({id,portfolioId:id,startId:id,endId:id,recordedAt:at,flowsComplete:z.literal(true),valuationsComplete:z.literal(true),incomeAndFeesIncluded:z.literal(true),basis:z.string().max(64000).optional(),eventIds:z.array(id).max(10000)}).strict();
export type PerformanceReview=z.infer<typeof performanceReviewSchema>;
export const financialEvidenceFields={financialPortfolios:z.array(financialPortfolioSchema).max(100).optional(),financialEvents:z.array(financialEventSchema).max(10000).optional(),manualFx:z.array(manualFxSchema).max(10000).optional(),performanceReviews:z.array(performanceReviewSchema).max(1000).optional()};
type Evidence={financialPortfolios?:FinancialPortfolio[];financialEvents?:FinancialEvent[];manualFx?:ManualFx[];performanceReviews?:PerformanceReview[]};
const pow=(n:number)=>10n**BigInt(n);
const normalize=(m:EvidenceMoney)=>BigInt(m.value)*pow(18-m.decimals);
const sameMoney=(a:EvidenceMoney,b:EvidenceMoney)=>a.currency===b.currency&&normalize(a)===normalize(b);
function converted(original:EvidenceMoney,rate:ManualFx['rate'],currency:string,digits:number):EvidenceMoney {
 const numerator=BigInt(original.value)*BigInt(rate.value)*pow(digits),denominator=pow(original.decimals+rate.decimals);
 return evidenceMoneySchema.parse({value:((numerator+denominator/2n)/denominator).toString(),decimals:digits,currency});
}
export function makeManualFx(input:{id:string;occurredAt:string;recordedAt:string;sourceLabel:string;original:EvidenceMoney;quoteCurrency:string;quoteDecimals:number;rate:ManualFx['rate']}):ManualFx {
 const original=evidenceMoneySchema.parse(input.original),rate=rateSchema.parse(input.rate);decimals.parse(input.quoteDecimals);
 const result=manualFxSchema.parse({id:input.id,occurredAt:input.occurredAt,recordedAt:input.recordedAt,source:'MANUAL',sourceLabel:input.sourceLabel,original,rate,converted:converted(original,rate,input.quoteCurrency,input.quoteDecimals)});
 if(original.currency===result.converted.currency)throw Error('Choose different base and quote currencies.');if(Date.parse(result.occurredAt)>Date.parse(result.recordedAt))throw Error('FX date cannot be after its recording time.');return result;
}
export function financialEvidenceIssues(s:Evidence):string[] {
 const errors:string[]=[],events=s.financialEvents??[],portfolios=s.financialPortfolios??[],fx=s.manualFx??[];
 for(const list of [portfolios,events,fx,s.performanceReviews??[]])if(new Set(list.map(e=>e.id)).size!==list.length)errors.push('Duplicate financial evidence identifier.');
 for(const f of fx){if(f.original.currency===f.converted.currency||!sameMoney(converted(f.original,f.rate,f.converted.currency,f.converted.decimals),f.converted))errors.push('Manual FX amount does not match its retained rate and original amount.');if(Date.parse(f.occurredAt)>Date.parse(f.recordedAt))errors.push('Invalid FX date.');}
 const eventMap=new Map(events.map(e=>[e.id,e])),portfolioMap=new Map(portfolios.map(p=>[p.id,p])),fxMap=new Map(fx.map(f=>[f.id,f]));
 const voided=new Set<string>();
 for(const e of events){
  const portfolio=portfolioMap.get(e.portfolioId);if(!portfolio)errors.push('Evidence portfolio is unavailable.');
  if(Date.parse(e.occurredAt)>Date.parse(e.recordedAt))errors.push('Evidence date cannot be after its recording time.');
  if('amount' in e&&e.amount.currency!==portfolio?.currency)errors.push('Evidence currency differs from the portfolio currency. Record an explicit dated FX conversion.');
  if(e.kind==='valuation'){
   const flow=eventMap.get(e.flowId??'');
   if(e.role==='boundary'?!!e.flowId:!flow||flow.kind!=='external_flow'||flow.portfolioId!==e.portfolioId||Date.parse(flow.occurredAt)!==Date.parse(e.occurredAt))errors.push('Valuation must link to the same portfolio flow at its exact time.');
  }
  if(e.kind==='external_flow'&&e.fxId){const f=fxMap.get(e.fxId);if(!f||Date.parse(f.occurredAt)!==Date.parse(e.occurredAt)||!sameMoney(f.converted,e.amount))errors.push('FX date, currency and amount must match the selected event.');}
  if(e.kind==='void'){
   const original=eventMap.get(e.reversesId);
   if(!original||original.kind==='void'||original.portfolioId!==e.portfolioId||original.occurredAt!==e.occurredAt||Date.parse(e.recordedAt)<Date.parse(original.recordedAt)||voided.has(e.reversesId)||!e.note.trim())errors.push('Only one correction may void an original event, with a reason and original date.');voided.add(e.reversesId);
  }
 }
 for(const r of s.performanceReviews??[]){
  const start=eventMap.get(r.startId),end=eventMap.get(r.endId);
  if(r.eventIds.some(id=>Date.parse(eventMap.get(id)?.recordedAt??'')>Date.parse(r.recordedAt)))errors.push('Review time cannot precede the recorded evidence.');
  if(!portfolioMap.has(r.portfolioId)||start?.kind!=='valuation'||end?.kind!=='valuation'||start.portfolioId!==r.portfolioId||end.portfolioId!==r.portfolioId||new Set(r.eventIds).size!==r.eventIds.length||r.eventIds.some(id=>eventMap.get(id)?.portfolioId!==r.portfolioId))errors.push('Invalid performance review references.');
 }
 return errors;
}
function validate<T extends Evidence>(s:T):T {const parsed=z.object(financialEvidenceFields).parse(s);const errors=financialEvidenceIssues(parsed);if(errors.length)throw Error(errors[0]);return s;}
export function appendFinancialEvidence(s:Platform,input:{portfolio?:FinancialPortfolio;event?:FinancialEvent;fx?:ManualFx}):Platform {
 if(Object.values(input).filter(Boolean).length!==1)throw Error('Record one evidence item at a time.');
 const key=input.portfolio?'financialPortfolios':input.event?'financialEvents':'manualFx';
 const value=input.portfolio?financialPortfolioSchema.parse(input.portfolio):input.event?financialEventSchema.parse(input.event):manualFxSchema.parse(input.fx);
 const list=s[key]??[],old=list.find(e=>e.id===value.id);if(old){if(JSON.stringify(old)===JSON.stringify(value))return s;throw Error('Evidence identity already belongs to a different immutable record.');}
 return validate({...s,[key]:[...list,value]});
}
export function activeFinancialEvents(s:Evidence,portfolioId:string):FinancialEvent[] {const rows=(s.financialEvents??[]).filter(e=>e.portfolioId===portfolioId),voids=new Set(rows.filter(e=>e.kind==='void').map(e=>e.reversesId));return rows.filter(e=>e.kind!=='void'&&!voids.has(e.id));}
export function voidFinancialEvent(s:Platform,eventId:string,id:string,recordedAt:string,reason:string):Platform {
 const original=s.financialEvents?.find(e=>e.id===eventId);if(!original||original.kind==='void')throw Error('Choose an original event.');
 return appendFinancialEvidence(s,{event:{id,portfolioId:original.portfolioId,occurredAt:original.occurredAt,recordedAt,source:'MANUAL',sourceLabel:original.sourceLabel,note:reason,kind:'void',reversesId:eventId}});
}
export function assertFinancialEvidenceAppendOnly(before:Evidence,after:Evidence):void {for(const key of Object.keys(financialEvidenceFields) as (keyof Evidence)[])if(JSON.stringify(after[key]?.slice(0,before[key]?.length??0)??[])!==JSON.stringify(before[key]??[]))throw Error('Financial evidence is append-only. Void an incorrect event and record its replacement.');}
function canonical(value:unknown):unknown {if(Array.isArray(value))return value.map(canonical);if(value&&typeof value==='object')return Object.fromEntries(Object.entries(value).filter(([,v])=>v!==undefined).sort(([a],[b])=>a.localeCompare(b,'en')).map(([k,v])=>[k,canonical(v)]));return value;}
/** Exact canonical content, not an ID-only fingerprint. Existing reviews without a basis require review again. */
export function financialEvidenceBasis(s:Evidence,portfolioId:string,startId:string,endId:string):string {
 const start=s.financialEvents?.find(e=>e.id===startId),end=s.financialEvents?.find(e=>e.id===endId),from=Date.parse(start?.occurredAt??''),to=Date.parse(end?.occurredAt??'');
 const events=(s.financialEvents??[]).filter(e=>e.portfolioId===portfolioId&&Date.parse(e.occurredAt)>=from&&Date.parse(e.occurredAt)<=to).sort((a,b)=>a.id.localeCompare(b.id,'en'));
 const ids=new Set(events.flatMap(e=>e.kind==='external_flow'&&e.fxId?[e.fxId]:[]));
 return JSON.stringify(canonical({version:1,portfolio:s.financialPortfolios?.find(p=>p.id===portfolioId),startId,endId,events,fx:(s.manualFx??[]).filter(f=>ids.has(f.id)).sort((a,b)=>a.id.localeCompare(b.id,'en'))}));
}
export function recordPerformanceReview(s:Platform,input:Omit<PerformanceReview,'eventIds'|'basis'>):Platform {
 const basis=financialEvidenceBasis(s,input.portfolioId,input.startId,input.endId);if(new TextEncoder().encode(basis).length>64000)throw Error('This review exceeds the supported evidence size. Choose a shorter period; all records stay retained.');
 const review=performanceReviewSchema.parse({...input,basis,eventIds:(s.financialEvents??[]).filter(e=>e.portfolioId===input.portfolioId).map(e=>e.id)});
 const old=s.performanceReviews?.find(r=>r.id===review.id);if(old){if(JSON.stringify(old)===JSON.stringify(review))return s;throw Error('Review identity already used.');}
 return validate({...s,performanceReviews:[...(s.performanceReviews??[]),review]});
}
const gcd=(a:bigint,b:bigint):bigint=>{while(b!==0n){const remainder=a%b;a=b;b=remainder;}return a;};
/** Exact rational subperiod factors; one half-up rounding of final percentage at 8 places. */
function percentage(numerator:bigint,denominator:bigint){const signed=(numerator-denominator)*100n,negative=signed<0n;const scaled=((negative?-signed:signed)*100000000n+denominator/2n)/denominator;const fraction=String(scaled%100000000n).padStart(8,'0').replace(/0+$/,'');return `${negative&&scaled!==0n?'-':''}${scaled/100000000n}${fraction?'.'+fraction:''}`;}
export const MWR_UNAVAILABLE='Money-weighted return / XIRR is unavailable: a reviewed method using every dated investor deposit and withdrawal is not yet supported. No solution is guessed.';
export function evaluateTwr(s:Evidence,portfolioId:string,startId:string,endId:string){
 const unavailable=(code:string,reason:string)=>({available:false as const,code,reason,mwrReason:MWR_UNAVAILABLE});
 const errors=financialEvidenceIssues(s);if(errors.length)return unavailable('INVALID_EVIDENCE',errors[0]!);
 const events=activeFinancialEvents(s,portfolioId),start=events.find(e=>e.id===startId),end=events.find(e=>e.id===endId);
 if(start?.kind!=='valuation'||end?.kind!=='valuation'||start.role!=='boundary'||end.role!=='boundary')return unavailable('VALUATIONS_REQUIRED','Choose two retained whole-portfolio boundary valuations.');
 const from=Date.parse(start.occurredAt),to=Date.parse(end.occurredAt);if(to<=from)return unavailable('INVALID_PERIOD','End valuation must be strictly later than start.');
 const interval=events.filter(e=>Date.parse(e.occurredAt)>=from&&Date.parse(e.occurredAt)<=to);
 const work=interval.filter(e=>e.kind==='valuation').reduce((n,e)=>n+('amount'in e?e.amount.value.length+18-e.amount.decimals:0),0);
 if(work>8000)return unavailable('CALCULATION_BOUND','This period exceeds the supported exact-calculation work bound. Choose a shorter period; no approximation is substituted and all evidence remains retained.');
 const basis=financialEvidenceBasis(s,portfolioId,startId,endId);
 if(!(s.performanceReviews??[]).some(r=>r.portfolioId===portfolioId&&r.startId===startId&&r.endId===endId&&r.basis===basis))return unavailable('REVIEW_REQUIRED','Review this evidence: confirm complete portfolio valuations, every external cash flow, and included income/fees. Changed evidence or FX invalidates an earlier review.');
 const boundaryTimes=interval.filter(e=>e.kind==='valuation'&&e.role==='boundary').map(e=>Date.parse(e.occurredAt));
 if(new Set(boundaryTimes).size!==boundaryTimes.length)return unavailable('AMBIGUOUS_VALUATION','Multiple active whole-portfolio valuations share an instant. Void the incorrect record before reviewing returns.');
 if(interval.some(e=>e.kind==='valuation'&&e.flowId&&!events.some(f=>f.id===e.flowId&&f.kind==='external_flow')))return unavailable('ORPHANED_FLOW_VALUATION','A retained flow valuation refers to a voided flow. Correct those valuations before reviewing returns.');
 if(interval.some(e=>['unclassified','transfer','quantity_correction'].includes(e.kind)))return unavailable('UNCLASSIFIED_EVENT','Resolve transfers, quantity corrections and unclassified changes before calculating a return. Void an incorrect record and enter the supported replacement with its original date.');
 const flows=interval.filter(e=>e.kind==='external_flow').sort((a,b)=>Date.parse(a.occurredAt)-Date.parse(b.occurredAt));
 if(flows.some(f=>[from,to].includes(Date.parse(f.occurredAt))))return unavailable('ENDPOINT_FLOW','A cash flow coincides with a period endpoint. Choose unambiguous boundaries before and after that flow.');
 if(new Set(flows.map(f=>Date.parse(f.occurredAt))).size!==flows.length)return unavailable('AMBIGUOUS_FLOW_TIME','Multiple flows share an instant. A supported aggregate flow with one before/after valuation is required; no ordering is guessed.');
 if(flows.length>200)return unavailable('PERIOD_TOO_LARGE','This reviewed calculation supports at most 200 flow boundaries. Choose a shorter period; all records remain retained.');
 let opening=normalize(start.amount),numerator=1n,denominator=1n,externalNet=0n;
 const subperiods:{from:string;to:string;opening:EvidenceMoney;closing:EvidenceMoney;returnPercent:string}[]=[];let openingMoney=start.amount,openingAt=start.occurredAt;
 function link(closing:EvidenceMoney,at:string){const close=normalize(closing);let a=close,b=opening;const own=gcd(a,b);a/=own;b/=own;const left=gcd(a,denominator),right=gcd(b,numerator);numerator=(numerator/right)*(a/left);denominator=(denominator/left)*(b/right);subperiods.push({from:openingAt,to:at,opening:openingMoney,closing,returnPercent:percentage(close,opening)});}
 if(opening<=0n)return unavailable('ZERO_CAPITAL','A positive opening valuation is required; returns on zero capital are undefined.');
 for(const f of flows){
  const before=interval.filter(e=>e.kind==='valuation'&&e.flowId===f.id&&e.role==='before_flow'),after=interval.filter(e=>e.kind==='valuation'&&e.flowId===f.id&&e.role==='after_flow');
  if(before.length!==1||after.length!==1)return unavailable('FLOW_BOUNDARY_MISSING',`Record exactly one complete valuation immediately before and after the flow at ${f.occurredAt}.`);
  const b=before[0]!,a=after[0]!;if(b.kind!=='valuation'||a.kind!=='valuation')return unavailable('INVALID_EVIDENCE','Flow valuations are invalid.');
  const net=normalize(f.amount)*(f.direction==='IN'?1n:-1n);
  if(normalize(a.amount)!==normalize(b.amount)+net)return unavailable('FLOW_BOUNDARY_MISMATCH','A post-flow valuation must equal the immediately preceding valuation plus the signed external flow. Resolve the evidence gap; no return is inferred.');
  if(normalize(a.amount)<=0n)return unavailable('ZERO_CAPITAL','A flow leaves zero or negative capital. This method cannot link a restarted portfolio.');
  link(b.amount,f.occurredAt);externalNet+=net;opening=normalize(a.amount);openingMoney=a.amount;openingAt=f.occurredAt;
 }
 link(end.amount,end.occurredAt);
 const scale=pow(18-start.amount.decimals);const exactOriginal=(n:bigint)=>n%scale===0n?(n/scale).toString():null;
 return {available:true as const,returnPercent:percentage(numerator,denominator),currency:start.amount.currency,decimals:start.amount.decimals,wealthChange:exactOriginal(normalize(end.amount)-normalize(start.amount)),externalNet:exactOriginal(externalNet),subperiods,reason:'Manual statement evidence with user-reviewed completeness; cumulative, not annualized. Income and fees are included in supplied valuations. Not verified investment performance or a GIPS compliance claim.',mwrReason:MWR_UNAVAILABLE};
}
