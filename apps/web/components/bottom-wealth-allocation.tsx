'use client';
import type {LayoutAttrs} from './layout-edit';
import {wealthAllocation} from '../lib/bottom-insights';
import {ASSET_COLORS,type wealthOverview} from '../lib/wealth';
import {GlassSegments} from './progress/glass-progress';
import {formatPlainDecimal} from '../lib/visual-format';
import {Shell} from './bottom-section-frame';

/** Wealth: allocation by class within the headline currency, and valuation coverage. */
export function WealthAllocationSection({overview,...layout}:LayoutAttrs&{overview:ReturnType<typeof wealthOverview>}){
 const a=wealthAllocation(overview);
 return <Shell layout={layout} id="bottom-wealth-allocation" eyebrow="THE SHAPE OF WHAT YOU KNOW" title={<>Allocation and coverage.</>} lede={a.currency?`How the known ${a.currency} value is spread across asset classes.`:'Add a valued asset to see how your wealth is spread.'}>
  {a.classes.length>0&&<><GlassSegments identity="bottom-wealth-allocation" className="bottom-stack" aria-hidden="true" segments={a.classes.map(c=>({key:c.assetClass,share:c.share/100,color:ASSET_COLORS[c.assetClass as keyof typeof ASSET_COLORS]}))}/>
   <ul className="bottom-legend">{a.classes.map(c=><li key={c.assetClass}><i style={{background:ASSET_COLORS[c.assetClass as keyof typeof ASSET_COLORS]}} aria-hidden="true"/><span>{c.assetClass}</span><strong>{formatPlainDecimal(c.share.toFixed(2))}%</strong></li>)}</ul></>}
  <div className="bottom-coverage"><strong>{a.coverage.valued} of {a.coverage.total}</strong><span>assets have a known value{a.coverage.total>a.coverage.valued?'. Valuation coverage is incomplete; assets without a value are left out.':'.'}</span></div>
  {a.otherCurrencies.length>0&&<p className="bottom-note">{a.otherCurrencies.join(', ')} holdings are not included here. Currencies stay separate; no FX is assumed.</p>}
 </Shell>;
}
