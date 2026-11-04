'use client';
import type {CSSProperties} from 'react';
import type {WidgetSize} from '../../../lib/nova/store';
import {arcPath} from '../../../lib/nova/holo/geometry';
import {formatPercent} from '../../../lib/visual-format';
import {wealthMoney} from '../../platform/wealth-money';
import {HoloFigure, HoloHidden, HoloReading, HoloTable, HoloUnread, Spark} from '../holo/parts';
import {usePillarShown, useWealthHud} from '../holo/use-hud-data';
import {NovaEmpty} from './empty';
import '../holo/holo-parts.css';

/**
 * Session AL Part 11 (lane L8): "Wealth HUD" in gold — the tracked wealth of the headline currency as Wealth shows it,
 * its recorded history as a glowing line, the mix by asset class on a segmented dial (each segment named with its share
 * beside it), and a mini purpose flow: what is set aside for goals and what is still available. One currency at a time,
 * never converted (lib/nova/holo/wealth.ts). ZIGoals never moves money; this only reads.
 */
function MixDial({mix, size}: {mix: {assetClass: string; share: number}[]; size: number}) {
  const starts = mix.map((_, i) => mix.slice(0, i).reduce((n, m) => n + m.share, 0)), gap = mix.length > 1 ? 2 : 0;
  return <svg className="holo-mix" viewBox="-60 -60 120 120" width={size} height={size} aria-hidden="true" focusable="false">
    <circle className="holo-track" r="44"/>
    {mix.map((m, i) => <path key={m.assetClass} className="holo-mix-seg" data-i={i % 4} d={arcPath(0, 0, 44, starts[i]! * 360 + gap, (starts[i]! + m.share) * 360 - gap)}/>)}
    <g data-motion-essential="" className="holo-spin"><circle className="holo-orn-dash" r="55"/></g>
  </svg>;
}
export default function WealthHudWidget({size}: {size: WidgetSize}) {
  const shown = usePillarShown('wealth'), {hud, loaded, error} = useWealthHud();
  if (!shown) return <HoloHidden pillar="Wealth"/>;
  if (!loaded) return <HoloReading/>;
  if (error || !hud) return <HoloUnread what="Your wealth records"/>;
  if (!hud.holdings) return <NovaEmpty pillar="wealth" href="/app/wealth?add=asset" action="Add an asset">Nothing tracked yet. Your wealth, its mix and what is set aside for goals light up here.</NovaEmpty>;
  const p = hud.primary, cur = p?.currency ?? '';
  const total = p ? wealthMoney(p.value, cur) : '—';
  const mix = hud.mix.slice(0, size === 'L' ? 5 : 3);
  return <div className="holo-wealth" data-size={size}>
    <div className="holo-wealth-head">
      <span className="holo-label">Tracked wealth{hud.incomplete && p ? ' · known so far' : ''}</span>
      <HoloFigure text={total} className="holo-num-big"/>
      {!p && <small className="holo-note">{hud.missingValue ? 'Your holdings have no known value yet.' : 'No value yet.'}</small>}
      {hud.otherCurrencies.length > 0 && <small className="holo-note">+ held in {hud.otherCurrencies.join(', ')} · never converted</small>}
    </div>
    {size !== 'S' && hud.line.length > 1 && <Spark values={hud.line.slice(-60).map(x => x.value)} height={size === 'L' ? 64 : 44} className="holo-wealth-line"/>}
    {size !== 'S' && p && <div className="holo-split holo-wealth-mid">
      {mix.length > 0 && <MixDial mix={mix} size={size === 'L' ? 104 : 84}/>}
      <ul className="holo-legend">{mix.map((m, i) => <li key={m.assetClass} style={{'--i': i % 4} as CSSProperties}><span className="holo-key" data-i={i % 4} aria-hidden="true"/>{m.assetClass}<b className="holo-num">{formatPercent(m.share * 100)}</b></li>)}</ul>
    </div>}
    {size !== 'S' && hud.purpose && <div className="holo-purpose">
      <span className="holo-flow" aria-hidden="true">{hud.purpose.goals.map((g, i) => <i key={g.label} data-i={i % 3} style={{flexGrow: Number(g.value)}}/>)}<i data-free="" style={{flexGrow: Number(hud.purpose.available)}}/></span>
      <p><b className="holo-num">{hud.purpose.shareText}</b> set aside for goals · {wealthMoney(hud.purpose.available, cur)} still available</p>
    </div>}
    <HoloTable caption={`Wealth in ${cur || 'your currency'}`} rows={[['Tracked wealth', total], ...hud.mix.map(m => [m.assetClass, formatPercent(m.share * 100)] as const),
      ...(hud.purpose ? [['Set aside for goals', `${hud.purpose.shareText} (${wealthMoney(hud.purpose.allocated, cur)})`] as const, ['Still available', wealthMoney(hud.purpose.available, cur)] as const, ...hud.purpose.goals.map(g => [`For ${g.label}`, wealthMoney(g.value, cur)] as const)] : []),
      ...(hud.otherCurrencies.length ? [['Other currencies', `${hud.otherCurrencies.join(', ')}, never converted`] as const] : [])]}/>
  </div>;
}
