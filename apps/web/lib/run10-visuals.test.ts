import {describe,expect,it} from 'vitest';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {ProgressRing} from '../components/platform/financial-ui';
import {GoalProgressRing} from '../components/goal-card';
import {EvidenceChart} from '../components/platform/evidence-chart';
import {formatGoalAmount} from './goal-summary';
import {ASSET_COLORS} from './wealth';

describe('whole progress presentation without false completion',()=>{
 for(const [percent,label] of [[0,'0'],[0.49,'0'],[0.5,'1'],[0.51,'1'],[45,'45'],[65,'65'],[99.6,'99'],[100,'100'],[130,'100']] as const)it(`${percent} displays ${label}%`,()=>{
  const html=renderToStaticMarkup(createElement(ProgressRing,{percent}));expect(html).toContain(`>${label}<small>%</small>`);
 });
 for(const percent of [NaN,Infinity,-1,null,undefined,''])it(`invalid ${percent} is unavailable, never zero`,()=>{expect(renderToStaticMarkup(createElement(ProgressRing,{percent}))).toContain('Unavailable');});
 it('keeps the exact progress in accessible detail',()=>{expect(renderToStaticMarkup(createElement(ProgressRing,{percent:99.6}))).toContain('99.6%');});
 it('uses matching canonical category colors in the ring',()=>{
  const html=renderToStaticMarkup(createElement(GoalProgressRing,{name:'Home',progressPct:'45',assetMix:[{assetClass:'Stablecoins',value:'200',percent:20,color:ASSET_COLORS.Stablecoins},{assetClass:'Cash',value:'250',percent:25,color:ASSET_COLORS.Cash}]}));
  expect(html).toContain(ASSET_COLORS.Stablecoins);expect(html).toContain(ASSET_COLORS.Cash);
 });
});

describe('grouped numeric presentation',()=>{
 it('groups without passing exact large values through Number',()=>{expect(formatGoalAmount('123456789123456789.12','USD')).toBe('$123,456,789,123,456,789.12');});
 it('supports decimal-comma locales without changing the value',()=>{expect(formatGoalAmount('1234567.89','EUR','de-DE')).toBe('1.234.567,89 €');});
 it('retains a below-target exact string that Number would round to 100',()=>{expect(renderToStaticMarkup(createElement(ProgressRing,{percent:'99.999999999999999999999'}))).toContain('>99<small>%</small>');});
 it('preserves signed corrections and token precision',()=>{expect(formatGoalAmount('-12345.126','USD')).toBe('-$12,345.12');expect(formatGoalAmount('0.000001','ZIG')).toBe('0.000001 ZIG');});
});
const point=(day:number,value:string)=>({at:`2026-09-${String(day).padStart(2,'0')}T12:00:00Z`,value});
describe('evidence-aware history',()=>{
 const render=(points:{at:string;value:string}[])=>renderToStaticMarkup(createElement(EvidenceChart,{series:[{label:'Recorded wealth',color:'#38d9f5',points}],decimals:2,currency:'USD',label:'Wealth history'}));
 it('has an intentional empty state',()=>{expect(render([])).toContain('Your history starts here');});
 it('shows one observation as a summary rather than a fake trend',()=>{const html=render([point(1,'12500')]);expect(html).toContain('First observation');expect(html).not.toContain('<polyline');expect(html).toContain('125');});
 it('connects two actual endpoints with an explicitly illustrative line',()=>{const html=render([point(1,'12500'),point(2,'12600')]);expect(html).toContain('<polyline');expect(html).toContain('illustrative');});
 it('does not bridge a long missing interval',()=>{const html=render([point(1,'12500'),point(2,'12600'),point(20,'12000')]);expect((html.match(/<polyline/g)||[])).toHaveLength(1);expect(html).toContain('gaps');});
 it('does not crash or invent zero for malformed observations',()=>{expect(()=>render([point(1,'not-an-integer')])).not.toThrow();expect(render([point(1,'not-an-integer')])).toContain('unavailable');});
});
it('preserves date-only measurement dates without manufacturing a time of day',()=>{
 const html=renderToStaticMarkup(createElement(EvidenceChart,{series:[{label:'Manual weight',color:'#38d9f5',points:[{at:'2026-09-01',value:'7200',dateOnly:true}]}],decimals:2,currency:'kg',label:'Weight history'}));
 expect(html).toContain('<time dateTime="2026-09-01">2026-09-01</time>');expect(html).not.toContain('AM');expect(html).not.toContain('PM');
});
it('does not connect through a known invalid measurement',()=>{
 const html=renderToStaticMarkup(createElement(EvidenceChart,{series:[{label:'Wealth',color:'#38d9f5',points:[point(1,'12000'),point(2,'unknown'),point(3,'13000')]}],decimals:2,currency:'USD',label:'Wealth history'}));
 expect(html).not.toContain('<polyline');expect(html).toContain('partial');
});
it('presents malformed numeric display input as unavailable',()=>{expect(formatGoalAmount('unknown','USD')).toBe('Unavailable');});
