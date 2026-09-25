import {describe,it,expect} from 'vitest';
import {emptyPlatform,platformSchema,assertGoalEditsUnlocked} from './positions';
import {appendFinancialEvidence,recordPerformanceReview,evaluateTwr,makeManualFx,voidFinancialEvent,type FinancialEvent,type FinancialPortfolio} from './financial-events';
const portfolio:FinancialPortfolio={id:'statement',name:'Fictional brokerage statement',currency:'USD',createdAt:'2026-09-23T10:00:00Z'};
const stamp='2026-09-23T10:00:00Z',t0='2026-01-01T00:00:00Z',t1='2026-02-01T00:00:00Z',t2='2026-03-01T00:00:00Z';
const money=(value:string,currency='USD')=>({value,decimals:2,currency});
const common=(id:string,at=t0)=>({id,portfolioId:portfolio.id,occurredAt:at,recordedAt:stamp,source:'MANUAL' as const,sourceLabel:'Fictional complete statement',note:''});
const valuation=(id:string,value:string,at=t0,role:'boundary'|'before_flow'|'after_flow'='boundary',flowId?:string):FinancialEvent=>({...common(id,at),kind:'valuation',amount:money(value),role,...(flowId?{flowId}:{})});
function base(){return appendFinancialEvidence(emptyPlatform(),{portfolio});}
function save(events:FinancialEvent[]){return events.reduce((s,event)=>appendFinancialEvidence(s,{event}),base());}
function review(s:ReturnType<typeof base>){return recordPerformanceReview(s,{id:'review',portfolioId:portfolio.id,startId:'start',endId:'end',recordedAt:stamp,flowsComplete:true,valuationsComplete:true,incomeAndFeesIncluded:true});}
describe('manual financial evidence and exact-boundary TWR',()=>{
 it('does not retrofit fields into legacy schemas and preserves new evidence through backup without changing holdings',()=>{
  const old=emptyPlatform();expect(platformSchema.parse(old)).toEqual(old);const s=save([valuation('start','10000'),valuation('end','11000',t2)]);expect(platformSchema.parse(JSON.parse(JSON.stringify(s)))).toEqual(s);expect(s.positions).toEqual([]);expect(s.contributions).toEqual([]);
 });
 it('geometrically links exact flow boundaries: 100→110; deposit50; 160→176 =21%, not26%',()=>{
  const flow:FinancialEvent={...common('deposit',t1),kind:'external_flow',direction:'IN',amount:money('5000')};
  const s=review(save([valuation('start','10000'),flow,valuation('before','11000',t1,'before_flow','deposit'),valuation('after','16000',t1,'after_flow','deposit'),valuation('end','17600',t2)]));
  const r=evaluateTwr(s,'statement','start','end');expect(r.available).toBe(true);if(r.available){expect(r.returnPercent).toBe('21');expect(r.subperiods).toHaveLength(2);expect(r.externalNet).toBe('5000');expect(r.wealthChange).toBe('7600');}
 });
 it('requires user-reviewed completeness and invalidates it when any evidence changes',()=>{
  let s=save([valuation('start','10000'),valuation('end','11000',t2)]);expect(evaluateTwr(s,'statement','start','end')).toMatchObject({available:false,code:'REVIEW_REQUIRED'});s=review(s);expect(evaluateTwr(s,'statement','start','end')).toMatchObject({available:true,returnPercent:'10'});s=appendFinancialEvidence(s,{event:{...common('fee',t1),kind:'fee',amount:money('100')}});expect(evaluateTwr(s,'statement','start','end')).toMatchObject({available:false,code:'REVIEW_REQUIRED'});
 });
 it('refuses missing/incorrect flow boundaries, zero capital and unresolved classification',()=>{
  const flow:FinancialEvent={...common('flow',t1),kind:'external_flow',direction:'OUT',amount:money('1000')};
  const events=[valuation('start','10000'),flow,valuation('end','10000',t2)];expect(evaluateTwr(review(save(events)),'statement','start','end')).toMatchObject({code:'FLOW_BOUNDARY_MISSING'});
  expect(evaluateTwr(review(save([...events,valuation('b','11000',t1,'before_flow','flow'),valuation('a','9000',t1,'after_flow','flow')])),'statement','start','end')).toMatchObject({code:'FLOW_BOUNDARY_MISMATCH'});
  expect(evaluateTwr(review(save([valuation('start','0'),valuation('end','10000',t2)])),'statement','start','end')).toMatchObject({code:'ZERO_CAPITAL'});
  expect(evaluateTwr(review(save([valuation('start','10000'),valuation('end','10000',t2),{...common('unknown',t1),kind:'unclassified',amount:money('1')}])),'statement','start','end')).toMatchObject({code:'UNCLASSIFIED_EVENT'});
 });
 it('handles withdrawal, loss, no annualization and values beyond safe Number precision',()=>{
  const flow:FinancialEvent={...common('withdraw',t1),kind:'external_flow',direction:'OUT',amount:money('5000')};
  const r=evaluateTwr(review(save([valuation('start','10000'),flow,valuation('b','9000',t1,'before_flow','withdraw'),valuation('a','4000',t1,'after_flow','withdraw'),valuation('end','4400',t2)])),'statement','start','end');expect(r).toMatchObject({available:true,returnPercent:'-1'});
  const huge='90071992547409930000000000';const h=BigInt(huge);expect(evaluateTwr(review(save([valuation('start',huge),valuation('end',(h*11n/10n).toString(),t2)])),'statement','start','end')).toMatchObject({available:true,returnPercent:'10'});
 });
 it('retains immutable void records, rejects duplicate/cross-portfolio correction, and stale reviews after correction',()=>{
  let s=review(save([valuation('start','10000'),valuation('end','11000',t2)]));const original=s.financialEvents![1];s=voidFinancialEvent(s,'end','void',stamp,'Wrong statement value');expect(s.financialEvents![1]).toEqual(original);expect(evaluateTwr(s,'statement','start','end')).toMatchObject({available:false});expect(voidFinancialEvent(s,'end','void',stamp,'Wrong statement value')).toBe(s);expect(()=>voidFinancialEvent(s,'end','other',stamp,'Again')).toThrow();expect(()=>assertGoalEditsUnlocked(s,{...s,financialEvents:s.financialEvents!.slice(1)})).toThrow(/append-only/);
 });
 it('converts only an explicit dated manual FX record with original units, exact rate and half-up rounding',()=>{
  const fx=makeManualFx({id:'fx',occurredAt:t1,recordedAt:stamp,sourceLabel:'Fictional bank exchange receipt',original:money('10000','EUR'),quoteCurrency:'USD',quoteDecimals:2,rate:{value:'112345',decimals:5}});expect(fx.converted).toEqual(money('11235'));expect(fx.original).toEqual(money('10000','EUR'));
  let s=appendFinancialEvidence(base(),{fx});s=appendFinancialEvidence(s,{event:{...common('deposit',t1),kind:'external_flow',direction:'IN',amount:fx.converted,fxId:'fx'}});expect(s.manualFx![0]).toEqual(fx);
  expect(()=>appendFinancialEvidence(s,{event:{...common('wrong',t2),kind:'external_flow',direction:'IN',amount:fx.converted,fxId:'fx'}})).toThrow(/date/);
  expect(()=>appendFinancialEvidence(base(),{event:{...common('eur'),kind:'external_flow',direction:'IN',amount:money('10000','EUR')}})).toThrow(/currency/);
  expect(()=>platformSchema.parse({...s,manualFx:[{...fx,converted:money('11234')}]})).toThrow();
 });
 it('rejects ambiguous simultaneous flows and first-boundary flows rather than guessing timing',()=>{
  const f=(id:string,at:string):FinancialEvent=>({...common(id,at),kind:'external_flow',direction:'IN',amount:money('100')});
  expect(evaluateTwr(review(save([valuation('start','10000'),valuation('end','11000',t2),f('a',t1),f('b',t1)])),'statement','start','end')).toMatchObject({code:'AMBIGUOUS_FLOW_TIME'});
  expect(evaluateTwr(review(save([valuation('start','10000'),valuation('end','11000',t2),f('a',t0)])),'statement','start','end')).toMatchObject({code:'ENDPOINT_FLOW'});
 });
 it('matches the GIPS handbook cumulative-linking reference (5.2% at one decimal)',()=>{
  // CFA Institute GIPS Handbook for Firms, cumulative-return example: 2.3,-4.7,6.9,3.2,0.9,-3.1 percent.
  const factors=[1023,953,1069,1032,1009,969],start='2015-01-01T00:00:00Z';
  const events:FinancialEvent[]=[valuation('start','1000000',start)];
  factors.forEach((factor,index)=>{const at=index===5?'2020-07-01T00:00:00Z':`${2016+index}-01-01T00:00:00Z`,value=BigInt(factor)*1000n;if(index===5)events.push(valuation('end',value.toString(),at));else{const delta=1000000n-value,flow='flow'+index;events.push({...common(flow,at),kind:'external_flow',direction:delta>0n?'IN':'OUT',amount:money((delta<0n?-delta:delta).toString())},valuation('before'+index,value.toString(),at,'before_flow',flow),valuation('after'+index,'1000000',at,'after_flow',flow));}});
  expect(evaluateTwr(review(save(events)),'statement','start','end')).toMatchObject({available:true,returnPercent:'5.15765192'});
 });
 it('refuses contradictory boundary valuations and retained valuations of a voided flow',()=>{
  let s=review(save([valuation('start','10000'),valuation('other','10500'),valuation('end','11000',t2)]));expect(evaluateTwr(s,'statement','start','end')).toMatchObject({code:'AMBIGUOUS_VALUATION'});
  const flow:FinancialEvent={...common('flow',t1),kind:'external_flow',direction:'IN',amount:money('1000')};s=save([valuation('start','10000'),flow,valuation('before','10000',t1,'before_flow','flow'),valuation('after','11000',t1,'after_flow','flow'),valuation('end','12000',t2)]);s=voidFinancialEvent(s,'flow','void-flow',stamp,'Wrong flow');s=review(s);expect(evaluateTwr(s,'statement','start','end')).toMatchObject({code:'ORPHANED_FLOW_VALUATION'});
 });
 it('rejects a completeness review backdated before the recorded evidence',()=>{
  const s=save([valuation('start','10000'),valuation('end','11000',t2)]);
  expect(()=>recordPerformanceReview(s,{id:'r',portfolioId:'statement',startId:'start',endId:'end',recordedAt:t2,flowsComplete:true,valuationsComplete:true,incomeAndFeesIncluded:true})).toThrow(/review.*time/i);
 });

 it('invalidates review when same-ID imported event, portfolio or FX content changes',()=>{
  const s=review(save([valuation('start','10000'),valuation('end','11000',t2)]));
  const changed=platformSchema.parse({...s,financialEvents:s.financialEvents!.map(e=>e.id==='end'&&e.kind==='valuation'?{...e,amount:money('999000')}:e)});
  expect(evaluateTwr(changed,'statement','start','end')).toMatchObject({code:'REVIEW_REQUIRED'});
  expect(evaluateTwr({...s,financialPortfolios:[{...portfolio,name:'Different scope'}]},'statement','start','end')).toMatchObject({code:'REVIEW_REQUIRED'});
  const fx=makeManualFx({id:'rate',occurredAt:t1,recordedAt:stamp,sourceLabel:'Original bank receipt',original:money('1000','EUR'),quoteCurrency:'USD',quoteDecimals:2,rate:{value:'11',decimals:1}});
  let f=appendFinancialEvidence(base(),{fx});for(const event of [valuation('start','10000'),{...common('fx-flow',t1),kind:'external_flow' as const,direction:'IN' as const,amount:fx.converted,fxId:fx.id},valuation('before','10000',t1,'before_flow','fx-flow'),valuation('after','11100',t1,'after_flow','fx-flow'),valuation('end','12210',t2)])f=appendFinancialEvidence(f,{event});f=review(f);expect(evaluateTwr(f,'statement','start','end')).toMatchObject({available:true,returnPercent:'10'});
  const changedFx=platformSchema.parse({...f,manualFx:[{...fx,original:{...fx.original,value:'500'},rate:{value:'22',decimals:1}}]});expect(evaluateTwr(changedFx,'statement','start','end')).toMatchObject({code:'REVIEW_REQUIRED'});

 });
 it('bounds valid high-precision calculation work instead of blocking a render',()=>{
  const big=10n**70n,events:FinancialEvent[]=[valuation('start',String(big),'2020-01-01T00:00:00Z')];
  for(let i=0;i<200;i++){const at=new Date(Date.UTC(2020,0,2+i)).toISOString(),flow='f'+i,before=big+BigInt(4*i+1);events.push({...common(flow,at),kind:'external_flow',direction:'IN',amount:money('1')},valuation('b'+i,String(before),at,'before_flow',flow),valuation('a'+i,String(before+1n),at,'after_flow',flow));}
  events.push(valuation('end',String(big+997n),'2021-01-01T00:00:00Z'));const s={...base(),financialEvents:events};const before=performance.now();expect(evaluateTwr(s,'statement','start','end')).toMatchObject({code:'CALCULATION_BOUND'});expect(performance.now()-before).toBeLessThan(500);
 });

});
