'use client';
import {NOVA_SCOPES, type NovaScope} from '../../../lib/ai/context-pack/nova';
import {scopesOf} from '../../../lib/nova/scopes';
import {NOVA_SETUP} from '../../../lib/nova/setup';
import {NOVA_WORLD, worldOn} from '../../../lib/nova/world/record';
import {useAiSettings} from '../../ai/use-ai-settings';
import {useDeviceRecord} from '../../ai/use-device-record';
import {CardFoot, type CardProps} from '../cards/kit';
import {HoloReading, HoloTable} from '../holo/parts';
import '../cards/nova-cards.css';

/**
 * Session AM (ADR-038 D5): "What NOVA can see" — every part of the person's life as a lit or unlit cell: lit when NOVA may
 * read it (NOVA → Permissions, and for Health the device's own Health switches too; ADR-037 Q14, Q16), unlit when not,
 * each named in words. Outside data (weather) is its own row. It only shows the switches; the person changes them in
 * Permissions (a model never can: there is no tool or action for it).
 */
const NAME: Readonly<Record<NovaScope, string>> = {today: 'Today, agenda and tasks', goals: 'Goals', habits: 'Habits', health: 'Health', wealth: 'Wealth', notes: 'Notes', journal: 'Journal', earn: 'Earn'};
export default function NovaSeesWidget({size = 'M'}: Partial<CardProps>) {
  const setup = useDeviceRecord(NOVA_SETUP), settings = useAiSettings(), world = useDeviceRecord(NOVA_WORLD);
  if (!setup.loaded || !settings.loaded || !world.loaded) return <HoloReading/>;
  const scopes = scopesOf(setup.unreadable ? {version: 1} : setup.data), share = settings.data.pageShare;
  // What decides each row: NOVA's own permission, and the device's page-data switch behind it (Health: both of its switches).
  const device: Readonly<Record<NovaScope, boolean>> = {today: share.today, goals: share.goals, habits: share.habits, health: share.health && settings.data.includeHealth, wealth: share.wealth, notes: share.today, journal: share.today, earn: share.wealth};
  const rows = NOVA_SCOPES.map(s => ({key: s, name: NAME[s], on: scopes[s] && device[s], why: !scopes[s] ? 'off in Permissions' : !device[s] ? 'page data off in Settings' : 'read on this device'}));
  const weather = worldOn(world.unreadable ? {version: 1} : world.data), shown = size === 'S' ? rows.slice(0, 4) : rows, lit = rows.filter(r => r.on).length;
  return <div className="nc-body nc-sees">
    <p className="nc-sees-count"><b>{lit}</b> of {rows.length} parts of your life are open to NOVA</p>
    <ul className="nc-sees-grid" aria-hidden="true">{shown.map(r => <li key={r.key} data-on={r.on || undefined}><span className="nc-sees-cell"/><span className="nc-sees-name">{r.name}</span><span className="nc-sees-why">{r.on ? 'On' : 'Off'}</span></li>)}
      {size !== 'S' && <li data-on={weather || undefined} data-world=""><span className="nc-sees-cell"/><span className="nc-sees-name">Weather (outside data)</span><span className="nc-sees-why">{weather ? 'On' : 'Off'}</span></li>}
    </ul>
    <HoloTable caption="What NOVA can see" rows={[...rows.map(r => [r.name, `${r.on ? 'On' : 'Off'} (${r.why})`] as const), ['Weather (outside data)', weather ? 'On: MET Norway is asked for your rounded place' : 'Off: nothing is fetched']]}/>
    <CardFoot source="NOVA → Permissions and Settings on this device" asOf="now"/>
  </div>;
}
