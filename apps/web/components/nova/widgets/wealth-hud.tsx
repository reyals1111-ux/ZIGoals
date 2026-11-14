'use client';
import type {CSSProperties} from 'react';
import type {WidgetSize} from '../../../lib/nova/store';
import {arcPath, tickPath} from '../../../lib/nova/holo/geometry';
import {frameWords} from '../../../lib/nova/holo/wealth';
import {formatDate, formatPercent} from '../../../lib/visual-format';
import {wealthMoney} from '../../platform/wealth-money';
import {FlowRibbons, HoloEmpty, HoloFigure, HoloHidden, HoloReading, HoloTable, HoloUnread, Orn, WaveChart} from '../holo/parts';
import {usePillarShown, useWealthHud} from '../holo/use-hud-data';
import '../holo/holo-parts.css';

/**
 * Session AL Part 11 (lane L8): "Wealth HUD" in gold — the tracked wealth of the headline currency as Wealth shows it,
 * its recorded history as a flowing amber line placed by time in a HUD frame (its highest and lowest values and first and
 * last dates on the frame; second pass), the mix by asset class on a segmented dial (each segment named with its share
 * beside it), and a mini purpose flow: what is set aside for goals and what is still available. One currency at a time,
 * never converted (lib/nova/holo/wealth.ts). ZIGoals never moves money; this only reads.
 * Review fixes (lane L8d): the frame says it holds recorded valuations, its "max" and "min", and the last record's value at
 * the line's end; where today's total differs from that last record (known only in part, say), a hollow dashed point at
 * today says "now, known so far" — one source, never two "latest" figures side by side (M6). The panel fits its height by
 * whole rows: a medium panel shows the total, the line and the purpose flow (the mix dial where its height allows), a large
 * one the dial and the flow's ribbons side by side (B1). An empty panel is the frame unlit (M8). Second review m9 (lane L8f):
 * a figure is printed once on the frame, and the hollow point says "now" with today's figure.
 * Session AM-2 (art direction D, Wealth: gold terminal lines): the total is the hero figure; the recorded valuations are a
 * lit terminal line over a grid with its highest and lowest records marked; what is set aside is a gold meter with a
 * white-hot end and the rest of it hatched (still available); the mix dial sits in a tick bezel.
 */
function MixDial({mix, size}: {mix: {assetClass: string; share: number}[]; size: number}) {
  const starts = mix.map((_, i) => mix.slice(0, i).reduce((n, m) => n + m.share, 0)), gap = mix.length > 1 ? 2 : 0;
  return <span className="holo-ring" style={{'--ring': `${size}px`} as CSSProperties} aria-hidden="true">
    <svg className="holo-mix" viewBox="-60 -60 120 120" focusable="false">
      <path className="holo-orn-ticks" d={tickPath(0, 0, 53, 55.4, 60)}/>
      <circle className="holo-orn-hair" r="35"/>
      <circle className="holo-track" r="44"/>
      {mix.map((m, i) => <path key={m.assetClass} className="holo-mix-seg" data-i={i % 4} d={arcPath(0, 0, 44, starts[i]! * 360 + gap, (starts[i]! + m.share) * 360 - gap)}/>)}
    </svg>
    <Orn><circle className="holo-orn-dash" r="58.4"/><path className="holo-orn-seg" d={arcPath(0, 0, 58.4, 30, 62)}/><path className="holo-orn-seg" d={arcPath(0, 0, 58.4, 210, 242)}/></Orn>
  </span>;
}
/** Cents of a line value (the line keeps major units) for the frame's labels, in Wealth's own money words. */
const lineMoney = (v: number, cur: string) => wealthMoney(BigInt(Math.round(v * 100)), cur);
const day = (at: string) => { try { return formatDate(at, {year: false}); } catch { return '—'; } };
const frameLabels = (line: readonly {at: string; value: number}[], cur: string) => frameWords(line, v => lineMoney(v, cur), day);
export default function WealthHudWidget({size}: {size: WidgetSize}) {
  const shown = usePillarShown('wealth'), {hud, loaded, error} = useWealthHud();
  if (!shown) return <HoloHidden pillar="Wealth"/>;
  if (!loaded) return <HoloReading/>;
  if (error || !hud) return <HoloUnread what="Your wealth records"/>;
  if (!hud.holdings) return <HoloEmpty kind="wave" href="/app/wealth?add=asset" action="Add an asset">Nothing tracked yet. Your wealth, its mix and what is set aside for goals light up here.</HoloEmpty>;
  const p = hud.primary, cur = p?.currency ?? '';
  const total = p ? wealthMoney(p.value, cur) : '—';
  // M6: today's total as a hollow point beside the recorded line when it differs from the last record (or is known only in part).
  const last = hud.line.at(-1), nowValue = p ? Number(p.value) / 100 : null;
  const nowPoint = p && last && nowValue !== null && Number.isFinite(nowValue) && (hud.incomplete || Math.abs(nowValue - last.value) >= 0.005)
    ? {at: hud.nowAt ?? last.at, value: nowValue, label: `now ${total}`} : null;
  const mix = hud.mix.slice(0, size === 'L' ? 5 : 3), line = hud.line.slice(-90);
  const flow = hud.purpose && hud.purpose.total > 0n ? [...hud.purpose.goals.map((g, i) => ({key: `g${i}`, i: i % 3, share: Number(g.value * 10000n / hud.purpose!.total) / 10000})),
    ...(hud.purpose.available > 0n ? [{key: 'free', free: true, share: Number(hud.purpose.available * 10000n / hud.purpose.total) / 10000}] : [])] : [];
  return <div className="holo-wealth" data-size={size}>
    <div className="holo-wealth-head">
      <span className="holo-label">Tracked wealth{hud.incomplete && p ? ' · known so far' : ''}</span>
      <HoloFigure text={total} className="holo-num-big"/>
      {!p && <small className="holo-note">{hud.missingValue ? 'Your holdings have no known value yet.' : 'No value yet.'}</small>}
      {hud.otherCurrencies.length > 0 && <small className="holo-note">+ held in {hud.otherCurrencies.join(', ')} · never converted</small>}
    </div>
    {size !== 'S' && line.length > 1 && <WaveChart points={line} height={size === 'L' ? 80 : 56} className="holo-wealth-line" title="Recorded valuations"
      labels={frameLabels(line, cur)} endLabel={frameLabels(line, cur).end ?? undefined} now={nowPoint}/>}
    <div className="holo-wealth-lower">
    {size !== 'S' && p && mix.length > 0 && <div className="holo-split holo-wealth-mid">
      <MixDial mix={mix} size={size === 'L' ? 100 : 76}/>
      <ul className="holo-legend">{mix.map((m, i) => <li key={m.assetClass} style={{'--i': i % 4} as CSSProperties}><span className="holo-key" data-i={i % 4} aria-hidden="true"/><span className="holo-legend-name">{m.assetClass}</span><b className="holo-num">{formatPercent(m.share * 100)}</b></li>)}</ul>
    </div>}
    {size !== 'S' && hud.purpose && <div className="holo-purpose">
      {size === 'L' && flow.length > 0 ? <div className="holo-flow-box">
        <span className="holo-flow-end">Known value</span>
        <FlowRibbons shares={flow}/>
        <ul className="holo-flow-legend">{hud.purpose.goals.map((g, i) => <li key={`${i}-${g.label}`}><span className="holo-key" data-i={i % 3} aria-hidden="true"/>{g.label}</li>)}{hud.purpose.available > 0n && <li><span className="holo-key" data-free="" aria-hidden="true"/>Still available</li>}</ul>
      </div>
      : <span className="holo-flow" aria-hidden="true">{hud.purpose.goals.map((g, i) => <i key={`${i}-${g.label}`} data-i={i % 3} style={{flexGrow: Number(g.value)}}/>)}<i data-free="" style={{flexGrow: Number(hud.purpose.available)}}/></span>}
      <p className="holo-purpose-words"><b className="holo-num">{hud.purpose.shareText}</b> set aside for goals<span className="holo-purpose-free"> · {wealthMoney(hud.purpose.available, cur)} still available</span></p>
    </div>}
    </div>
    <HoloTable caption={`Wealth in ${cur || 'your currency'}`} rows={[['Tracked wealth', total],
      ...(line.length > 1 ? [['Over time', `recorded valuations from ${lineMoney(line[0]!.value, cur)} on ${day(line[0]!.at)} to ${lineMoney(line.at(-1)!.value, cur)} on ${day(line.at(-1)!.at)}; lowest ${lineMoney(Math.min(...line.map(x => x.value)), cur)}, highest ${lineMoney(Math.max(...line.map(x => x.value)), cur)}${nowPoint ? `; now ${total}${hud.incomplete ? ', known so far' : ''}` : ''}`] as const] : []), ...hud.mix.map(m => [m.assetClass, formatPercent(m.share * 100)] as const),
      ...(hud.purpose ? [['Set aside for goals', `${hud.purpose.shareText} (${wealthMoney(hud.purpose.allocated, cur)})`] as const, ['Still available', wealthMoney(hud.purpose.available, cur)] as const, ...hud.purpose.goals.map(g => [`For ${g.label}`, wealthMoney(g.value, cur)] as const)] : []),
      ...(hud.otherCurrencies.length ? [['Other currencies', `${hud.otherCurrencies.join(', ')}, never converted`] as const] : [])]}/>
  </div>;
}
