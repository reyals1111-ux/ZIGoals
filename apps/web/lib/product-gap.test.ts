// @vitest-environment jsdom
import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import {act,createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {createRoot} from 'react-dom/client';
import {buildShowcase} from './showcase-data';
import {PLATFORM_KEY,type Platform} from './positions';
import {parseCoinQuotes,type MarketQuote} from './market-quotes';
import {emptyHabitData} from './habits';
import {createEmptyHealth} from './health';
import {privateGoalSummary} from './goal-summary';
import {AssetDetail} from '../components/platform/asset-detail';
import {TodayIntelligence} from '../components/platform/today-intelligence';
import {PositionsView} from '../components/platform/positions-view';
import {GoalSummaryCard} from '../components/goal-card';
import {WealthView} from '../components/platform/wealth-view';
import {AssetPicker} from '../components/platform/asset-picker';
import {ContributionFlow} from '../components/platform/contribution-flow';
const env=vi.hoisted(()=>({data:null as unknown as Platform,quotes:[] as MarketQuote[],showcase:false,now:Date.parse('2026-09-21T12:00:00Z')}));
vi.mock('next/navigation',()=>({useSearchParams:()=>new URLSearchParams(),usePathname:()=>'/app',useRouter:()=>({replace:()=>{},push:()=>{}})}));
vi.mock('../components/platform/use-platform',()=>({usePlatform:()=>({data:env.data,loaded:true,error:null,update:async()=>{}})}));
vi.mock('../components/platform/use-market-quotes',()=>({useMarketQuotes:()=>({quotes:env.quotes,now:env.now,loading:false,error:null,refresh:async()=>{}})}));
vi.mock('../components/platform/use-market-insights',()=>({useMarketInsights:()=>({entries:[],results:{'coingecko:coin:bitcoin:USD':{insight:{logoUrl:'/api/market-logo?url=bitcoin-fixture'},error:null,stale:false}},now:env.now,loading:false,error:null,refresh:async()=>{}})}));
vi.mock('../components/platform/use-valuation-history',()=>({useValuationHistory:()=>{}}));
vi.mock('../components/platform/use-evidence-now',()=>({useEvidenceNow:()=>env.now}));
vi.mock('../components/showcase-controls',()=>({useShowcase:()=>env.showcase}));
vi.mock('../components/habits/use-habits',()=>({useHabits:()=>({data:emptyHabitData(),loaded:true})}));
vi.mock('../components/health/use-health',()=>({useHealth:()=>({data:createEmptyHealth(),loaded:true})}));
vi.mock('../components/use-local-today',()=>({useLocalToday:()=>'2026-09-21'}));
const html=(node:ReturnType<typeof createElement>)=>{const element=document.createElement('div');element.innerHTML=renderToStaticMarkup(node);return element;};
beforeEach(()=>{env.data=JSON.parse(buildShowcase('2026-09-21').records[PLATFORM_KEY]!);env.quotes=[];env.showcase=false;vi.useFakeTimers({toFake:['Date']});vi.setSystemTime(env.now);vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT',true);HTMLDialogElement.prototype.showModal=function(){this.open=true;};HTMLDialogElement.prototype.close=function(){this.open=false;};});
afterEach(()=>{vi.restoreAllMocks();vi.unstubAllGlobals();vi.useRealTimers();});
it('never presents an entire manual holding valuation as an unavailable unit reference price',()=>{
 const element=html(createElement(AssetDetail,{id:'showcase-aapl'}));expect(element.querySelector('.asset-detail-price')?.textContent).toBe('Unavailable');expect(element.querySelector('[aria-label="Your holding"]')?.textContent).toContain('$7,500');
});
it('Today preserves negative net funding and the true Reward Goal type',()=>{
 const goal=env.data.goals.find(g=>g.id==='9206')!;env.data.goals=env.data.goals.map(g=>({...g,pinned:g.id===goal.id}));env.data.contributions=[{id:'withdrawal-fixture',goalId:goal.id,goalScope:'private',quantity:'100000000',asset:'ZIG',decimals:6,direction:'OUT',occurredAt:'2026-09-21T10:00:00Z',provenance:'MANUAL_ATTRIBUTION',fundingMode:'HISTORY_ONLY'}];
 const element=html(createElement(TodayIntelligence));const panel=element.querySelector('[aria-label="Today financial intelligence"]')!;expect(panel.textContent).toContain('-100 ZIG net contributed');expect(panel.textContent).toContain('Reward Goal');expect(panel.textContent).not.toContain('Quantity Goal');
});
it('Showcase reward crypto has a distinct fictional row and never contaminates observed network totals',()=>{
 env.showcase=true;const element=html(createElement(PositionsView));const examples=element.querySelector('[aria-label="Showcase crypto reward examples"]');expect(examples?.textContent).toContain('ZIG reward reserve');expect(examples?.textContent).toContain('SHOWCASE DATA');expect(examples?.textContent).toContain('300000 ZIG');expect(element.querySelector('[aria-label="zigchain-1 observed totals"]')?.textContent).not.toContain('300000');
 env.showcase=false;expect(html(createElement(PositionsView)).querySelector('[aria-label="Showcase crypto reward examples"]')).toBeNull();
});
it('Goal cards show remaining, target date, cadence and the next real scheduled date together',()=>{
 const goal=env.data.goals.find(g=>g.id==='9201')!;goal.plan={amount:'50000',asset:'USD',decimals:2,cadence:'monthly',nextDate:'2026-09-23',endDate:'2027-09-23',active:true};const summary=privateGoalSummary(env.data,goal,[],env.now);const element=html(createElement(GoalSummaryCard,{summary}));expect(element.textContent).toContain('$11,000 remaining');expect(element.textContent).toContain('Target 2027-09-21');expect(element.textContent).toContain('Next contribution');expect(element.textContent).toContain('2026-09-23');expect(element.textContent).toContain('$500 / monthly');
});
it('Holdings show a verified unit price separately from quantity and holding value',()=>{
 env.data.valuationSnapshots=[];env.quotes=parseCoinQuotes(`{"bitcoin":{"usd":100,"last_updated_at":${env.now/1000}}}`,[{marketRef:{provider:'coingecko',kind:'coin',id:'bitcoin'},currency:'USD'}],env.now);const element=html(createElement(WealthView));const card=[...element.querySelectorAll('.owned-asset-card')].find(card=>card.querySelector('h3')?.textContent==='Bitcoin')!;expect(card.textContent).toContain('Reference price');expect(card.querySelector('.holding-unit-price')?.textContent).toContain('$100');expect(card.querySelector('.owned-value')?.textContent).toContain('$45');
 const manual=[...element.querySelectorAll('.owned-asset-card')].find(card=>card.querySelector('h3')?.textContent==='Apple')!;expect(manual.querySelector('.holding-unit-price')?.textContent).toContain('Unavailable');
});
it('Existing asset picker distinguishes manual reference holdings from automatic valuation',()=>{
 const apple=env.data.positions.find(p=>p.id==='showcase-aapl')!,btc=env.data.positions.find(p=>p.id==='showcase-btc')!;const element=html(createElement(AssetPicker,{positions:[apple,btc],initialCategory:'Existing assets',onExisting:()=>{}}));const rows=element.querySelectorAll('.picker-existing button');expect(rows[0]?.textContent).toContain('Manual value');expect(rows[0]?.textContent).not.toContain('Automatic price');expect(rows[1]?.textContent).toContain('Automatic price');
});
it('selected contribution and confirmation previews retain the available asset logo',async()=>{
 env.data.goals=env.data.goals.filter(g=>g.id==='9201');env.data.allocations=[];env.quotes=parseCoinQuotes(`{"bitcoin":{"usd":100,"last_updated_at":${env.now/1000}}}`,[{marketRef:{provider:'coingecko',kind:'coin',id:'bitcoin'},currency:'USD'}],env.now);
 const container=document.createElement('div'),root=createRoot(container);document.body.append(container);
 try{await act(async()=>root.render(createElement(ContributionFlow,{data:env.data,goal:env.data.goals[0]!,quotes:env.quotes,update:async()=>{},onClose:()=>{},onSaved:()=>{}})));const row=[...container.querySelectorAll('.picker-existing button')].find(b=>b.textContent?.includes('Bitcoin'))!;await act(async()=>row.dispatchEvent(new MouseEvent('click',{bubbles:true})));expect(container.querySelector('.picker-selected img')?.getAttribute('src')).toBe('/api/market-logo?url=bitcoin-fixture');const quantity=container.querySelector<HTMLInputElement>('input[name="quantity"]')!;quantity.value='1';await act(async()=>container.querySelector('form')!.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true})));expect(container.querySelector('[role="alert"]')?.textContent).toBeUndefined();expect(container.querySelector('.funding-preview .picker-selected img')?.getAttribute('src')).toBe('/api/market-logo?url=bitcoin-fixture');}finally{await act(async()=>root.unmount());container.remove();}
});
it('unit references keep sub-cent precision instead of presenting a nonzero price as zero',()=>{
 env.data.valuationSnapshots=[];env.quotes=parseCoinQuotes(`{"bitcoin":{"usd":0.00000123,"last_updated_at":${env.now/1000}}}`,[{marketRef:{provider:'coingecko',kind:'coin',id:'bitcoin'},currency:'USD'}],env.now);
 expect(html(createElement(AssetDetail,{id:'showcase-btc'})).querySelector('.asset-detail-price')?.textContent).toBe('$0.00000123');
 const card=[...html(createElement(WealthView)).querySelectorAll('.owned-asset-card')].find(card=>card.querySelector('h3')?.textContent==='Bitcoin')!;expect(card.querySelector('.holding-unit-price strong')?.textContent).toBe('$0.00000123');
});
