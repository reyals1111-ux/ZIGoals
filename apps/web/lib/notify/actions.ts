import {HABITS_KEY, emptyHabitData, habitDataSchema, habitDay, habitRuleOn, logHabitValue, smartDoneValue, type HabitData} from '../habits';
import {isDurableMarker, updateDurableStore} from '../vault/local';
import {updatePrivateStore} from '../private-storage';
import {getAppStorage, isShowcase} from '../showcase-storage';
import {readDeviceRecord, updateDeviceRecord} from '../device-record';
import {PRICE_ALERTS} from '../price-alerts/schema';
import {alertLine} from '../price-alerts/engine';
import {claimAction, pruneActions, readActions, type QueuedAction} from './db';

/**
 * Session AK Part 2 (ADR-036 A1): the page applies what was tapped on a notification while ZIGoals was closed — "Done"
 * on the habits it named — and the price alerts the service worker saw cross. Each queued action applies exactly once:
 * a tab claims it in one IndexedDB transaction (lib/notify/db.ts claimAction) before applying it. The
 * change goes through the habits store like any check-in, so sync, Activity and Undo see a normal write; the caller shows
 * the Undo toast. "Snooze 1 h" needs nothing here (the service worker already moved the items and the wake).
 */
export type Applied = {actionId: string; message: string; undo?: () => Promise<void>};
let running: Promise<Applied[]> | null = null;
const updateHabits = (storage: Storage, change: (d: HabitData) => HabitData) =>
  isDurableMarker(storage.getItem(HABITS_KEY)) ? updateDurableStore(storage, HABITS_KEY, habitDataSchema, change) : updatePrivateStore(storage, HABITS_KEY, habitDataSchema, emptyHabitData, change);

/** One action against the records: a pure step, exported for the tests. Already-complete or unknown habits are left alone. */
export function doneChange(action: QueuedAction, today: string): {change: (d: HabitData) => HabitData; ids: string[]} {
  const date = action.date && /^\d{4}-\d{2}-\d{2}$/.test(action.date) ? action.date : today;
  const ids = [...new Set((action.items ?? []).filter(i => i.kind === 'habit').map(i => i.id))];
  return {ids, change: data => ids.reduce((d, id) => {
    const habit = d.habits.find(h => h.id === id); if (!habit) return d;
    const rule = habitRuleOn(habit, date); if (!rule) return d;
    const status = habitDay(habit, date, today).status;
    return status === 'due' || status === 'partial' ? logHabitValue(d, id, date, smartDoneValue(rule), {}, new Date(action.at)) : d;
  }, data)};
}
async function applyOne(action: QueuedAction, today: string): Promise<Applied | null> {
  const storage = getAppStorage();
  // Claimed first, atomically: another tab, or a crash after this, can never apply it a second time.
  if (!await claimAction(action.actionId, Date.now())) return null;
  if (action.type === 'done') {
    const {change, ids} = doneChange(action, today);
    if (!ids.length) return null;
    let before: HabitData | null = null;
    const after = await updateHabits(storage, d => { before = d; return change(d); });
    const titles = after.habits.filter(h => ids.includes(h.id)).map(h => h.title);
    const previous = before as HabitData | null;
    return {actionId: action.actionId, message: `${titles.length === 1 ? titles[0] : `${titles.length} habits`} marked done from a notification`, ...(previous ? {undo: async () => { await updateHabits(storage, d => ({...d, habits: d.habits.map(h => ids.includes(h.id) ? previous.habits.find(p => p.id === h.id) ?? h : h)})); }} : {})};
  }
  if (action.type === 'price-fired' && action.alertId) {
    const record = readDeviceRecord(storage, PRICE_ALERTS).data, alert = record.alerts.find(a => a.id === action.alertId);
    if (!alert || !alert.active || alert.firedAt) return null;
    const at = new Date(action.at).toISOString(), text = alertLine(alert);
    updateDeviceRecord(storage, PRICE_ALERTS, r => ({...r, alerts: r.alerts.map(a => a.id === alert.id ? {...a, firedAt: at} : a), fired: [{alertId: alert.id, at, text}, ...r.fired].slice(0, 200)}));
    return {actionId: action.actionId, message: `Price alert reached: ${text}`};
  }
  return null;
}
/** Applies every waiting action once; in turn (one run at a time per tab). Never throws. */
export function applyQueuedActions(today: string): Promise<Applied[]> {
  if (isShowcase()) return Promise.resolve([]);
  const run = async () => {
    const out: Applied[] = [];
    try {
      const waiting = (await readActions()).filter(a => a.applied === undefined).sort((a, b) => a.at - b.at);
      for (const action of waiting) { try { const done = await applyOne(action, today); if (done) out.push(done); } catch { /* left marked: never applied twice */ } }
      await pruneActions(Date.now());
    } catch { /* no queue on this device */ }
    return out;
  };
  running = (running ?? Promise.resolve([])).then(run, run);
  return running;
}
