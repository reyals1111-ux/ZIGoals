'use client';
import type {CSSProperties} from 'react';
import {NOVA_SCOPES, type NovaScope} from '../../../lib/ai/context-pack/nova';
import {scopesOf} from '../../../lib/nova/scopes';
import {NOVA_SETUP} from '../../../lib/nova/setup';
import {NOVA_WORLD, worldOn} from '../../../lib/nova/world/record';
import {useAiSettings} from '../../ai/use-ai-settings';
import {useDeviceRecord} from '../../ai/use-device-record';
import {CardFoot, Gauge, type CardProps} from '../cards/kit';
import {HoloReading, HoloTable} from '../holo/parts';
import '../cards/nova-cards.css';

/**
 * Session AM (ADR-038 D5): "What NOVA can see" — every part of the person's life as a lit or unlit cell: lit when NOVA may
 * read it (NOVA → Permissions, and for Health the device's own Health switches too; ADR-037 Q14, Q16), unlit when not,
 * each named in words. Outside data (weather) is its own row. It only shows the switches; the person changes them in
 * Permissions (a model never can: there is no tool or action for it).
 * AM-2: a permissions matrix as status rows — a ring of how many parts are open beside the count, then each part as a
 * row with a node in its own realm's neon (lit when open, a hollow dashed node when not) and its state as a small key.
 */
const NAME: Readonly<Record<NovaScope, string>> = {today: 'Today, agenda and tasks', goals: 'Goals', habits: 'Habits', health: 'Health', wealth: 'Wealth', notes: 'Notes', journal: 'Journal', earn: 'Earn'};
/** Each part's node wears its own realm's neon (art direction, the tokens of §C). */
const REALM: Readonly<Record<NovaScope, string>> = {today: 'orbit', goals: 'goals', habits: 'habits', health: 'health', wealth: 'wealth', notes: 'mind', journal: 'mind', earn: 'wealth'};
const SHORT: Readonly<Record<NovaScope, string>> = {today: 'Today', goals: 'Goals', habits: 'Habits', health: 'Health', wealth: 'Wealth', notes: 'Notes', journal: 'Journal', earn: 'Earn'};
export default function NovaSeesWidget({size = 'M'}: Partial<CardProps>) {
  const setup = useDeviceRecord(NOVA_SETUP), settings = useAiSettings(), world = useDeviceRecord(NOVA_WORLD);
  if (!setup.loaded || !settings.loaded || !world.loaded) return <HoloReading/>;
  const scopes = scopesOf(setup.unreadable ? {version: 1} : setup.data), share = settings.data.pageShare;
  // What decides each row: NOVA's own permission, and the device's page-data switch behind it (Health: both of its switches).
  const device: Readonly<Record<NovaScope, boolean>> = {today: share.today, goals: share.goals, habits: share.habits, health: share.health && settings.data.includeHealth, wealth: share.wealth, notes: share.today, journal: share.today, earn: share.wealth};
  const rows = NOVA_SCOPES.map(s => ({key: s, name: NAME[s], on: scopes[s] && device[s], why: !scopes[s] ? 'off in Permissions' : !device[s] ? 'page data off in Settings' : 'read on this device'}));
  const weather = worldOn(world.unreadable ? {version: 1} : world.data), lit = rows.filter(r => r.on).length;
  // Design review AM-D20: each size holds what fits its box. S: the count. L: every part as a row with its state in a
  // word. AM-2 (M): the whole matrix as compact cells — a lit node for a part that is on, a hollow dashed one with "Off"
  // for a part that is not (what NOVA cannot read is the news) — and under it how many are off and on. A cell names its
  // part in one or two words; the table for assistive technology keeps every part's whole name and reason at every size.
  const cells = [...rows.map(r => ({key: r.key as string, name: SHORT[r.key], on: r.on, world: false, realm: REALM[r.key]})), {key: 'weather', name: 'Weather', on: weather, world: true, realm: 'world'}];
  const off = cells.filter(c => !c.on), on = cells.length - off.length, shown = size === 'S' ? [] : cells;
  return <div className="nc-body nc-sees" data-size={size}>
    <div className="nc-sees-top">
      <Gauge share={rows.length ? lit / rows.length : null} size={size === 'L' ? 76 : size === 'S' ? 36 : 56} bezel={size !== 'S'} ticks={rows.length * 5} spin={size === 'L'} decor className="nc-sees-ring"/>
      <p className="nc-sees-count"><b>{lit}</b> <span>of {rows.length} parts of your life are open to NOVA</span></p>
    </div>
    {shown.length > 0 && <ul className="nc-sees-grid" aria-hidden="true">{shown.map((c, i) => <li key={c.key} className="nc-rise" data-on={c.on || undefined} data-world={c.world ? '' : undefined} data-realm={c.realm} style={{'--nc-i': Math.min(i, 6)} as CSSProperties}><span className="nc-sees-cell"/><span className="nc-sees-name">{c.name}</span><span className="nc-sees-rule"/><span className="nc-sees-why">{c.on ? 'On' : 'Off'}</span></li>)}</ul>}
    {size === 'M' && <p className="nc-sees-more" aria-hidden="true">{off.length === 0 ? 'Every part is on, the weather too.' : `${off.length} off · ${on} on`}</p>}
    <HoloTable caption="What NOVA can see" rows={[...rows.map(r => [r.name, `${r.on ? 'On' : 'Off'} (${r.why})`] as const), ['Weather (outside data)', weather ? 'On: MET Norway is asked for your rounded place' : 'Off: nothing is fetched']]}/>
    <CardFoot source="Permissions on this device" asOf="now"/>
  </div>;
}
