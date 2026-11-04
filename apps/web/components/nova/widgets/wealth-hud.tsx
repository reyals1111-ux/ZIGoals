'use client';
import type {CSSProperties} from 'react';
import type {WidgetSize} from '../../../lib/nova/store';
import {arcPath} from '../../../lib/nova/holo/geometry';
import {formatDate, formatPercent} from '../../../lib/visual-format';
import {wealthMoney} from '../../platform/wealth-money';
import {FlowRibbons, HoloFigure, HoloHidden, HoloReading, HoloTable, HoloUnread, Orn, WaveChart} from '../holo/parts';
import {usePillarShown, useWealthHud} from '../holo/use-hud-data';
import {NovaEmpty} from './empty';
import '../holo/holo-parts.css';

/**
 * Session AL Part 11 (lane L8): "Wealth HUD" in gold — the tracked wealth of the headline currency as Wealth shows it,
 * its recorded history as a flowing amber line placed by time in a HUD frame (its highest and lowest values and first and
 * last dates on the frame; second pass), the mix by asset class on a segmented dial (each segment named with its share
 * beside it), and a mini purpose flow: what is set aside for goals and what is still available. One currency at a time,
 * never converted (lib/nova/holo/wealth.ts). ZIGoals never moves money; this only reads.
 */
function MixDial({mix, size}: {mix: {assetClass: string; share: number}[]; size: number}) {
  const starts = mix.map((_, i) => mix.slice(0, i).reduce((n, m) => n + m.share, 0)), gap = mix.length > 1 ? 2 : 0;
  return <span className="holo-ring" style={{'--ring': `${size}px`} as CSSProperties} aria-hidden="true">
    <svg className="holo-mix" viewBox="-60 -60 120 120" focusable="false">
      <circle className="holo-track" r="44"/>
      {mix.map((m, i) => <path key={m.assetClass} className="holo-mix-seg" data-i={i % 4} d={arcPath(0, 0, 44, starts[i]! * 360 + gap, (starts[i]! + m.share) * 360 - gap)}/>)}
    </svg>
    <Orn><circle className="holo-orn-dash" r="55"/></Orn>
  </span>;
}
/** Cents of a line value (the line keeps major units) for the frame's labels, in Wealth's own money words. */
const lineMoney = (v: number, cur: string) => wealthMoney(BigInt(Math.round(v * 100)), cur);
const day = (at: string) => { try { return formatDate(at, {year: false}); } catch { return '—'; } };
export default function WealthHudWidget({size}: {size: WidgetSize}) {
  const shown = usePillarShown('wealth'), {hud, loaded, error} = useWealthHud();
  if (!shown) return <HoloHidden pillar="Wealth"/>;
  if (!loaded) return <HoloReading/>;
  if (error || !hud) return <HoloUnread what="Your wealth records"/>;
  if (!hud.holdings) return <NovaEmpty pillar="wealth" href="/app/wealth?add=asset" action="Add an asset">Nothing tracked yet. Your wealth, its mix and what is set aside for goals light up here.</NovaEmpty>;
  const p = hud.primary, cur = p?.currency ?? '';
  const total = p ? wealthMoney(p.value, cur) : '—';
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
    {size !== 'S' && line.length > 1 && <WaveChart points={line} height={size === 'L' ? 92 : 64} className="holo-wealth-line"
      labels={{top: lineMoney(Math.max(...line.map(x => x.value)), cur), bottom: lineMoney(Math.min(...line.map(x => x.value)), cur), from: day(line[0]!.at), to: day(line.at(-1)!.at)}}/>}
    {size !== 'S' && p && <div className="holo-split holo-wealth-mid">
      {mix.length > 0 && <MixDial mix={mix} size={size === 'L' ? 104 : 84}/>}
      <ul className="holo-legend">{mix.map((m, i) => <li key={m.assetClass} style={{'--i': i % 4} as CSSProperties}><span className="holo-key" data-i={i % 4} aria-hidden="true"/>{m.assetClass}<b className="holo-num">{formatPercent(m.share * 100)}</b></li>)}</ul>
    </div>}
    {size !== 'S' && hud.purpose && <div className="holo-purpose">
      {size === 'L' && flow.length > 0 ? <div className="holo-flow-box">
        <span className="holo-flow-end">Known value</span>
        <FlowRibbons shares={flow}/>
        <ul className="holo-flow-legend">{hud.purpose.goals.map((g, i) => <li key={`${i}-${g.label}`}><span className="holo-key" data-i={i % 3} aria-hidden="true"/>{g.label}</li>)}{hud.purpose.available > 0n && <li><span className="holo-key" data-free="" aria-hidden="true"/>Still available</li>}</ul>
      </div>
      : <span className="holo-flow" aria-hidden="true">{hud.purpose.goals.map((g, i) => <i key={`${i}-${g.label}`} data-i={i % 3} style={{flexGrow: Number(g.value)}}/>)}<i data-free="" style={{flexGrow: Number(hud.purpose.available)}}/></span>}
      <p><b className="holo-num">{hud.purpose.shareText}</b> set aside for goals · {wealthMoney(hud.purpose.available, cur)} still available</p>
    </div>}
    <HoloTable caption={`Wealth in ${cur || 'your currency'}`} rows={[['Tracked wealth', total],
      ...(line.length > 1 ? [['Over time', `from ${lineMoney(line[0]!.value, cur)} on ${day(line[0]!.at)} to ${lineMoney(line.at(-1)!.value, cur)} on ${day(line.at(-1)!.at)}; lowest ${lineMoney(Math.min(...line.map(x => x.value)), cur)}, highest ${lineMoney(Math.max(...line.map(x => x.value)), cur)}`] as const] : []), ...hud.mix.map(m => [m.assetClass, formatPercent(m.share * 100)] as const),
      ...(hud.purpose ? [['Set aside for goals', `${hud.purpose.shareText} (${wealthMoney(hud.purpose.allocated, cur)})`] as const, ['Still available', wealthMoney(hud.purpose.available, cur)] as const, ...hud.purpose.goals.map(g => [`For ${g.label}`, wealthMoney(g.value, cur)] as const)] : []),
      ...(hud.otherCurrencies.length ? [['Other currencies', `${hud.otherCurrencies.join(', ')}, never converted`] as const] : [])]}/>
  </div>;
}
