'use client';
import {useId, useMemo, useState} from 'react';
import {ASSET_COLORS} from '../../../lib/wealth';
import {AVAILABLE, layoutFlows, purposeAssets, purposeFlows, type PurposeView} from '../../../lib/allocation/purpose';
import {useChartWidth} from '../../charts/use-chart-width';
import './allocation.css';
import '../../charts/chart-look.css';
import {ArtNote} from '../../illustrations/art-note';
import {centsText, moneyWhole} from '../money-tools/format';
import {formatPercent} from '../../../lib/visual-format';

/**
 * Session AK (7.5): what each asset is for — a hand-drawn Sankey-style flow from assets (left) to the Goals they are
 * allocated to and "Still available" (right), one currency at a time (never converted). The same numbers are a table
 * behind the "Show as a table" toggle. No chart library, no motion. Lazy-loaded by the Wealth page.
 */
type Row = {position: {id: string; asset: string; providerId: string; quantity: string}; wealthClass: string; currency?: string; value?: bigint};
export type PurposeFlowProps = {rows: readonly Row[]; goals: readonly {id: string; name: string; status: string}[]; allocations: readonly {goalId: string; positionId: string; quantity: string}[]};
const money = (cents: bigint, currency: string) => moneyWhole(centsText(cents), currency); // Session AL (PRIMITIVES 3f)
// Session AL sweep 4 (L8f note 2): one decimal, rounded down, written as NOVA writes it ("12.7%", never "12.7 %").
const share = (part: bigint, total: bigint) => total > 0n ? formatPercent(Number(part * 1000n / total) / 10, {decimals: 1, fixed: true}) : '—';
const short = (text: string, n = 22) => text.length > n ? `${text.slice(0, n - 1)}…` : text;
/** Session AK (G3, R30): drawn at its measured width (charts/use-chart-width.ts), so the names and amounts are a true 14 px
 * on every screen instead of a 760-wide drawing scaled down to 11 px. The label columns take about a quarter each. */
const sizes = (w: number) => { const label = Math.max(92, Math.min(170, Math.round(w * .24))); return {label, flow: Math.max(96, w - 2 * label), chars: Math.max(9, Math.floor((label - 12) / 8))}; };

export function PurposeFlow({rows, goals, allocations}: PurposeFlowProps) {
  const id = useId();
  const {views, unvalued} = useMemo(() => purposeFlows({assets: purposeAssets(rows, r => r.position.providerId || r.position.asset), goals, allocations}), [rows, goals, allocations]);
  const [currency, setCurrency] = useState<string | null>(null), [table, setTable] = useState(false);
  const view = views.find(v => v.currency === currency) ?? views[0];
  if (!view) return <ArtNote pillar="wealth"><p className="fine">Add a valued asset and allocate it to a Goal to see what each asset is for.</p></ArtNote>;
  const allocated = view.targets.filter(t => t.kind === 'goal').reduce((n, t) => n + t.value, 0n);
  return <div className="purpose-body">
    <div className="purpose-top">
      {views.length > 1 && <div className="alloc-basis" role="radiogroup" aria-label="Currency">{views.map(v => <label key={v.currency} className="alloc-chip"><input type="radio" name={`${id}-cur`} checked={v.currency === view.currency} onChange={() => setCurrency(v.currency)}/><span>{v.currency}</span></label>)}</div>}
      <p className="purpose-summary"><strong>{share(allocated, view.total)}</strong> of your known {view.currency} value is set aside for Goals · {money(view.total - allocated, view.currency)} still available</p>
      <button type="button" className="secondary" aria-pressed={table} onClick={() => setTable(!table)}>{table ? 'Show as a chart' : 'Show as a table'}</button>
    </div>
    {table ? <FlowTable view={view} caption={`Where your ${view.currency} assets are allocated`}/> : <FlowChart view={view} titleId={`${id}-title`}/>}
    {unvalued.length > 0 && <p className="fine">{unvalued.length} {unvalued.length === 1 ? 'asset has' : 'assets have'} no known value and {unvalued.length === 1 ? 'is' : 'are'} not drawn: {unvalued.slice(0, 5).map(u => u.label).join(', ')}{unvalued.length > 5 ? '…' : ''}.</p>}
    {views.length > 1 && <p className="fine">Each currency has its own picture; amounts are never converted.</p>}
  </div>;
}
function FlowChart({view, titleId}: {view: PurposeView; titleId: string}) {
  const [plot, measured] = useChartWidth(640, 300), {label: LABEL, flow: FLOW, chars} = sizes(measured);
  const layout = layoutFlows(view, {width: FLOW, minNode: 36}), width = LABEL * 2 + FLOW, height = layout.height + 16;
  const classOf = new Map(view.assets.map(a => [a.id, a.wealthClass]));
  const label = (nodeId: string, side: 'left' | 'right') => (side === 'left' ? view.assets : view.targets).find(n => n.id === nodeId)!;
  return <figure className="purpose-figure"><div ref={plot}>
    <svg viewBox={`0 0 ${width} ${height}`} width={width} height={height} role="img" aria-labelledby={titleId} className="purpose-svg zg-chart" data-pillar="wealth" preserveAspectRatio="xMidYMid meet">
      <title id={titleId}>{`Your ${view.currency} assets on the left flow to the Goals they are allocated to and to Still available on the right. The table view lists every amount.`}</title>
      <g transform={`translate(${LABEL} 8)`}>
        {layout.bands.map((b, i) => { const x0 = 14, x1 = FLOW - 14, mid = (x0 + x1) / 2; return <path key={i} d={`M${x0},${b.y0} C${mid},${b.y0} ${mid},${b.y1} ${x1},${b.y1}`} className={`purpose-band${b.to === AVAILABLE ? ' purpose-band-free' : ''}`} style={{strokeWidth: b.thickness, stroke: ASSET_COLORS[classOf.get(b.from) as keyof typeof ASSET_COLORS] ?? undefined}}/>; })}
        {layout.nodes.map(n => { const node = label(n.id, n.side); return <g key={`${n.side}-${n.id}`}>
          <rect x={n.x} y={n.y} width={14} height={n.h} rx={3} className={`purpose-node purpose-node-${node.kind}`} style={node.kind === 'asset' ? {fill: ASSET_COLORS[node.wealthClass as keyof typeof ASSET_COLORS]} : undefined}/>
          <text x={n.side === 'left' ? -8 : FLOW + 8} y={n.y + n.h / 2 - 8} textAnchor={n.side === 'left' ? 'end' : 'start'} dominantBaseline="middle" className="purpose-label">{short(node.label, chars)}<tspan x={n.side === 'left' ? -8 : FLOW + 8} dy="17" className="purpose-value">{money(node.value, view.currency)}</tspan></text>
        </g>; })}
      </g>
    </svg>
  </div></figure>;
}
function FlowTable({view, caption}: {view: PurposeView; caption: string}) {
  const name = (nodeId: string) => view.assets.find(a => a.id === nodeId)?.label ?? view.targets.find(t => t.id === nodeId)?.label ?? nodeId;
  return <div className="alloc-table-wrap"><table className="alloc-table">
    <caption className="fine">{caption}</caption>
    <thead><tr><th scope="col">Asset</th><th scope="col">For</th><th scope="col">Amount</th><th scope="col">Share of the asset</th></tr></thead>
    <tbody>{view.flows.map((f, i) => { const asset = view.assets.find(a => a.id === f.from)!; return <tr key={i}><th scope="row">{name(f.from)}</th><td>{name(f.to)}</td><td>{money(f.value, view.currency)}</td><td>{share(f.value, asset.value)}</td></tr>; })}</tbody>
    <tfoot>{view.targets.map(t => <tr key={t.id}><th scope="row" colSpan={2}>{t.label} in total</th><td>{money(t.value, view.currency)}</td><td>{share(t.value, view.total)} of all</td></tr>)}</tfoot>
  </table></div>;
}
export default PurposeFlow;
