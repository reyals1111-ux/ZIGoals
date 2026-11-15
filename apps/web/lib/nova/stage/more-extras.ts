import {DEBT_PLANNER} from '../../debt-planner/store';
import {readDeviceRecord, type DeviceRecordSpec} from '../../device-record';
import {PRICE_ALERTS} from '../../price-alerts/schema';
import {SAVINGS_CHALLENGES} from '../../savings-challenges/challenges';
import {getAppStorage} from '../../showcase-storage';
import {SUPPLEMENTS} from '../../supplements/schema';
import type {MoreData} from '../summon/more-lines';
import {widgetSpec} from '../widgets/catalog';

/**
 * Session AM-2 (step 3, round 2, "NOVA connected"): the device records a line of one of the round-2 widgets needs and
 * NOVA's chat engine does not hold (the payoff planner's kept figures, the savings challenges, the price alerts, the
 * supplements log), read as their widgets read them: this device's own record, nothing fetched.
 *
 * The rule is lib/nova/stage/connect-extras.ts's: a record is read only when one of the widgets being made needs it AND
 * that widget's switch is open right now. So the supplements log (health-type) is never read for NOVA's words unless
 * NOVA's Health permission and the device's Health switch are both on (ADR-037 Q14, Q16).
 *
 * The cycle log is never read here, whatever is asked and whatever is open: its line carries no figure
 * (lib/nova/summon/more-lines.ts), so NOVA's words have no use for the record. A record that does not read gives null.
 */
function record<T>(spec: DeviceRecordSpec<T>): T | null {
  try { const read = readDeviceRecord(getAppStorage(), spec); return read.unreadable ? null : read.data; } catch { return null; }
}
export function moreExtras(widgets: readonly {id: string}[], gateOpen: (id: string) => boolean): MoreData {
  const wants = (id: string) => widgets.some(w => w.id === id) && (!widgetSpec(id)?.gate || gateOpen(id));
  return {
    ...(wants('debt-plan') ? {debtPlanner: record(DEBT_PLANNER)} : {}),
    ...(wants('savings-challenges') ? {savingsChallenges: record(SAVINGS_CHALLENGES)} : {}),
    ...(wants('price-alerts') ? {priceAlerts: record(PRICE_ALERTS)} : {}),
    ...(wants('supplements') ? {supplements: record(SUPPLEMENTS)} : {}),
  };
}
