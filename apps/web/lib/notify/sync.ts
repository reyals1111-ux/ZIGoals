import {habitCalendarDay, habitDay} from '../habits';
import {readReminders} from '../reminders/store';
import {readDeviceRecord} from '../device-record';
import {W_REMINDERS} from '../reminders/w-schema';
import {WIND_DOWN} from '../reminders/wind-down';
import {REMINDERS_PLAN, quietHours} from '../reminders-plan/schema';
import {CONTRIBUTION_PREFIX} from '../reminders/contribution-due';
import {fundingHealth} from '../goal-intelligence';
import {readFinance} from '../finance-homes-store';
import {readHealth} from '../sync-homes-store';
import {waterSummary} from '../health-daily';
import {getAppStorage, isShowcase} from '../showcase-storage';
import {readLock} from '../device-lock';
import {formatNumber} from '../visual-format';
import {habitWeekdays} from '../push/schedule';
import {storedHabits} from '../push/device';
import {namesOn} from '../push/labels-sync';
import {readHabitHealthLinks} from '../habit-health-links/store';
import {deviceZone} from '../push/support';
import {NOTIFY_PREFS, typeOn} from './prefs';
import {isRoutineHead} from '../routines/reminder-href';
import {addDays, wallClock} from './zone';
import {buildPlan, withSnoozes, type Plan, type PlanInput, type Snooze} from './plan';
import {BILLS} from '../bills/schema';
import {plannedForForecast} from '../cash-forecast/planned';
import {upcomingBills} from '../bills/store';
import {SUPPLEMENTS} from '../supplements/schema';
import {supplementReminders} from '../supplements/log';
import {GOV_REMINDERS, governanceEvents} from '../zigchain-eco/governance';
import {stakingItems} from './staking-items';
import {TASKS} from '../tasks/schema';
import {lateCount} from '../tasks/engine';
import {TASK_PLAN} from '../tasks/plan-record';
import {reminderInstants} from '../tasks/reminders';
import {NOTES} from '../notes/schema';
import {noteReminders} from '../notes/reminders';
import {COUNTDOWNS} from '../countdowns/schema';
import {COUNTDOWN_EXTRAS, countdownWakes} from '../countdowns/extras';
import {JOURNAL} from '../journal/schema';
import {reminderPlanInput} from '../journal/reminder';
import {letterWakes} from '../journal/letters';
import {memoryWakes} from '../on-this-day/throwback';
import {JOURNAL_DISPLAY} from '../on-this-day/store';
import {MONEY_LOG} from '../money-log/schema';
import {BUDGETS} from '../budgets/schema';
import {ACCOUNTS} from '../accounts/schema';
import {cashForecast} from '../cash-forecast/model';
import {moneyWakes} from '../money-notices';
// Session AV lane 2, round 2 (money; Wallet's lent and borrowed): a reminded loan's due day, as a money notice.
import {MONEY_MORE} from '../money-more/schema';
import {loanWakes} from '../money-more/people';
import {HEALTH_EXTRAS} from '../health-extras';
import {mealWakes} from '../food-plus/meal-notify';
import {EVENING_PLAN} from '../evening-plan/schema';
import {energyItems} from './energy-items';
import {healthGroupIn} from '../vault/w-homes';
import {spreadSlots, spreadTimes} from '../water-spread';
import {HABIT_EXTRAS} from '../habits-extras/schema';
import {habitPartsInput} from './habit-parts';
import {reminderMoreOf} from '../habit-reminder-words';
import {weighedInOn, weighInOf, weighInPlanInput} from '../weigh-in';

/**
 * Session AK Part 2 (ADR-036 A1): gathers this device's records into the plan's input. Reads only; never throws (a record
 * that does not read is left out, so its reminders simply do not wake the device). The Showcase plans nothing: its
 * example data must never reach a notification.
 */
export async function gatherPlanInput(now = Date.now()): Promise<PlanInput | null> {
  if (isShowcase()) return null;
  const storage = getAppStorage(), zone = deviceZone(), today = wallClock(now, zone).date;
  const prefs = readDeviceRecord(storage, NOTIFY_PREFS).data, plan = readDeviceRecord(storage, REMINDERS_PLAN).data, w = readDeviceRecord(storage, W_REMINDERS).data;
  const reminders = readReminders(storage).data, locked = !!readLock(storage);
  // ADR-010's rule (lib/push/labels-sync.ts; security review F4): a habit that ticks itself off from Health never shows its
  // name; when the links cannot be read, no name shows at all.
  const links = readHabitHealthLinks(storage), healthLinked = links.unreadable ? null : new Set(Object.keys(links.data.links));
  const input: PlanInput = {now, zone, prefs, quiet: quietHours(plan), labels: namesOn(storage) && !locked && healthLinked !== null, habits: [], contributions: [], bills: [], orbit: {done: 0, total: 0}, prices: []};
  try {
    const habits = await storedHabits(storage);
    if (habits) {
      const day = habitCalendarDay(habits, new Date(now));
      let habitExtras: unknown = null; try { habitExtras = readDeviceRecord(storage, HABIT_EXTRAS).data; } catch { /* unreadable: no own words or extra times */ }
      // Session AV lane 2 (LEDGER #181): a routine's head habit's reminder opens the routine's player.
      for (const habit of habits.habits) {
        const status = habitDay(habit, day, day).status;
        if (status === 'due' || status === 'partial' || status === 'complete') { input.orbit.total++; if (status === 'complete') input.orbit.done++; }
        const reminder = reminders.habits[habit.id];
        if (!reminder) continue;
        // Session AV lane 2 (health r3; LEDGER #275): the reminder's own words (never for a Health-linked habit) and its extra times.
        const more = reminderMoreOf(habitExtras, habit.id), linked = !!healthLinked?.has(habit.id);
        input.habits.push({id: habit.id, ...(isRoutineHead(habits, habit.id) ? {routine: true} : {}), ...(linked ? {} : {title: habit.title}), ...(!linked && more.words ? {words: more.words} : {}), ...(more.times.length ? {more: more.times} : {}), time: reminder.time, weekdays: habitWeekdays(habits, habit.id, day), doneToday: !(status === 'due' || status === 'partial') || reminders.dismissed[habit.id] === day});
      }
      // Session AV lane 2 (r5-body; LEDGER #369; TIER 3 (PWA)): one reminder per part of the day, when chosen.
      input.habitParts = habitPartsInput(habits, day, prefs, healthLinked);
    }
  } catch { /* habits unreadable: no habit wakes */ }
  if (reminders.water) {
    try {
      const health = await readHealth(storage), water = waterSummary(health, today), left = water.targetMl ? Math.max(0, water.targetMl - water.millilitres) : null;
      input.water = {time: reminders.water.time, toGo: left === null ? null : left >= 1000 ? `${formatNumber(left / 1000, {maximumFractionDigits: 1})} L` : `${Math.round(left)} mL`, done: left === 0 || reminders.dismissed.water === today};
    } catch { input.water = {time: reminders.water.time, toGo: null, done: false}; }
  }
  // Session AV lane 2 (health r3; LEDGER #280): water reminders through the day, each quiet once today is on pace for it.
  if (prefs.waterSpread?.on) {
    try {
      const health = await readHealth(storage), water = waterSummary(health, today), dismissed = reminders.dismissed.water === today;
      input.waterSpread = spreadSlots(prefs.waterSpread, water).map(slot => ({time: slot.time, done: dismissed || slot.onPace, ...(slot.due !== null && slot.due > water.millilitres ? {detail: `${slot.due - water.millilitres >= 1000 ? `${formatNumber((slot.due - water.millilitres) / 1000, {maximumFractionDigits: 1})} L` : `${Math.round(slot.due - water.millilitres)} mL`} to be on pace`} : {})}));
    } catch { input.waterSpread = spreadTimes(prefs.waterSpread).map(time => ({time, done: false})); }
  }
  // Session AV lane 2 (LEDGER #180): whether today's mood is answered, only when the mood check-in is on.
  if (typeOn(prefs, 'mood')) { try { const health = await readHealth(storage); input.mood = {doneToday: !!health.moods?.days[today]}; } catch { input.mood = {doneToday: false}; } }
  if (w.windDown) input.windDown = {time: w.windDown.time, doneToday: w.dismissed[WIND_DOWN] === today};
  const review = plan.items?.review;
  if (review?.on) input.review = {time: review.time ?? '18:00', weekday: review.weekday ?? 0};
  if (Object.keys(w.contributions).length) {
    try {
      const platform = await readFinance(storage);
      for (const [goalId, {time}] of Object.entries(w.contributions)) {
        const goal = platform.goals.find(g => g.id === goalId);
        if (!goal || goal.status !== 'active' || !goal.plan?.active) continue;
        for (const date of [today, addDays(today, 1)]) {
          let due = 0n;
          try { due = BigInt(fundingHealth(platform, goalId, date === today ? now : now + 86_400_000).dueToday); } catch { continue; }
          const done = date === today && w.dismissed[`${CONTRIBUTION_PREFIX}${goalId}`] === today;
          if (due > 0n) input.contributions.push({goalId, title: goal.name, time, date, amount: '', done});
        }
      }
    } catch { /* finance unreadable: no contribution wakes */ }
  }
  // Session AK Part 7.3: bills the person confirmed or added, due within the next 30 days (the plan wakes the morning before).
  try { input.bills = upcomingBills(readDeviceRecord(storage, BILLS).data, today, 30); } catch { /* bills unreadable: no bill wakes */ }
  // Session AK (F5): supplement and medication reminders the person switched on — times only, never a name.
  try { input.supplements = supplementReminders(readDeviceRecord(storage, SUPPLEMENTS).data, today); } catch { /* unreadable: no wakes */ }
  // Session AV (follow-up 1, F-TASK-NOTIFY): the reminders set on open tasks — the instant, the id, and a title for the
  // plan to show only where names are allowed.
  try { const tasks = reminderInstants(readDeviceRecord(storage, TASKS).data, zone).filter(r => r.at > now); if (tasks.length) input.tasks = tasks.slice(0, 60).map(r => ({id: r.task.id, title: r.task.title, at: r.at})); } catch { /* tasks unreadable: no task wakes */ }
  // Session AV lane 2 (r3-plan, LEDGER #256): the "Plan your day" time set in Tasks, and how many open tasks are overdue on
  // each of the plan's days (a task due today is overdue tomorrow if still open) — a count, never a name.
  try {
    const tasks = readDeviceRecord(storage, TASKS).data, plan = readDeviceRecord(storage, TASK_PLAN).data;
    if (plan.planReminder) input.planDay = {time: plan.planReminder.time};
    // Session AV lane 2 (r4-plan, review B4D-2; TIER 3 (PWA)): a repeat that floats in its week is late only after its week.
    input.overdue = [today, addDays(today, 1), addDays(today, 2)].map(date => ({date, count: lateCount(tasks, date)}));
  } catch { /* tasks unreadable: no overdue line */ }
  // Session AV lane 2 (LEDGER #31; Notion): reminders written inside notes ("@remind tomorrow 9:00 …") wake the device as
  // task reminders do, under the same switch; each opens its note (no Done). A title only where names are allowed.
  try { const fromNotes = noteReminders(readDeviceRecord(storage, NOTES).data, today, zone, now, {pastMs: 0}); if (fromNotes.length) input.tasks = [...(input.tasks ?? []), ...fromNotes.slice(0, 30).map(r => ({id: r.note.id, note: r.note.id, title: r.what, at: r.at}))]; } catch { /* notes unreadable: no note wakes */ }
  // Session AV (1c, q1 #44): the countdowns with a reminder — the mornings it starts and its day; a title for names-on only.
  try { const wakes = countdownWakes(readDeviceRecord(storage, COUNTDOWNS).data, readDeviceRecord(storage, COUNTDOWN_EXTRAS).data, today); if (wakes.length) input.countdowns = wakes.map(w => ({id: w.id, title: w.title, date: w.date, days: w.days})); } catch { /* unreadable: no countdown wakes */ }
  // Session AV lane 2 (journal; LEDGER #40): the reminder to write — its time, weekdays, the days already written, the streak.
  try { const j = reminderPlanInput(readDeviceRecord(storage, JOURNAL).data, today); if (j) input.journal = j; } catch { /* unreadable: no journal wake */ }
  // Session AV lane 2 (r3-notes; LEDGER #279): the days letters to open later open (an id and a day; never their words).
  try { const letters = letterWakes(readDeviceRecord(storage, JOURNAL).data, today); if (letters.length) input.letters = letters; } catch { /* unreadable: no letter wakes */ }
  // Session AV lane 2 (r4-mind; LEDGER #309): the mornings with a memory, when the person asked (how long ago only; never its words).
  try { const memories = memoryWakes(readDeviceRecord(storage, JOURNAL).data.entries, readDeviceRecord(storage, JOURNAL_DISPLAY).data, today); if (memories.length) input.memories = memories; } catch { /* unreadable: no memory wakes */ }
  // Session AV lane 2 (money): budgets that crossed 80 % or their amount yesterday, payday tomorrow, the low-balance line ahead.
  try {
    const log = readDeviceRecord(storage, MONEY_LOG).data, budgets = readDeviceRecord(storage, BUDGETS).data, rows = cashForecast({accounts: readDeviceRecord(storage, ACCOUNTS).data, bills: readDeviceRecord(storage, BILLS).data, entries: log.entries, budgets, planned: (() => { try { return plannedForForecast(readDeviceRecord(storage, MONEY_MORE).data, log.entries, today); } catch { return []; } })(), today}).rows; // Session AV lane 2, round 3: planned one-off costs count, as on the forecast card
    const wakes = [...moneyWakes({entries: log.entries, budgets, rows, line: log.lowBalance, today}), ...(() => { try { return loanWakes(readDeviceRecord(storage, MONEY_MORE).data, today); } catch { return []; } })()];
    if (wakes.length) input.money = wakes.map(w => ({id: w.id, date: w.date, title: w.title, ...(w.detail ? {detail: w.detail} : {})}));
  } catch { /* unreadable: no money wakes */ }
  // Session AV lane 2 (food, LEDGER #90): the meal reminders switched on in Health — each meal's time; its name for names-on only.
  try { const extras = readDeviceRecord(storage, HEALTH_EXTRAS).data; if (extras.mealReminders?.on) { const meals = mealWakes(extras, await readHealth(storage), new Date(now)); if (meals.length) input.meals = meals.map(m => ({meal: m.meal, label: m.label, time: m.time, doneToday: m.doneToday})); } } catch { /* unreadable: no meal wakes */ }
  // Session AV lane 2 (bodymind-r2; LEDGER #235, #236): the energy curve's reminders and the plan steps with a reminder,
  // only when that type is on; the curve is read from the sleep group of Health, the steps from the evening plan record.
  if (typeOn(prefs, 'energy')) { try { const sleep = healthGroupIn(await readHealth(storage), 'sleep') ?? null, evening = readDeviceRecord(storage, EVENING_PLAN).data, e = energyItems({sleep, evening, prefs, today, zone}); if (e.once.length || e.daily.length) input.energy = e; } catch { /* unreadable: no energy wakes */ } }
  // Session AV lane 2 (health r3; LEDGER #286): the weigh-in reminder set in Health → Weight, quiet once today has a weight.
  if (prefs.weighIn && typeOn(prefs, 'weighIn')) { let done = false; try { done = weighedInOn(await readHealth(storage), today); } catch { /* unreadable: remind anyway */ } const w = weighInPlanInput(weighInOf(prefs), done, today); if (w) input.weighIn = w; }
  // Owner follow-up 1 (F4): governance vote reminders the person set on a proposal — an instant and an id, never a title.
  try { input.votes = governanceEvents(readDeviceRecord(storage, GOV_REMINDERS).data, {now, timeZone: zone}).map(e => ({id: e.id, at: Date.parse(e.at)})); } catch { /* unreadable: no wakes */ }
  // Session AL sweep 4 (C-DVG-68, C-BN-06): unstaked ZIG back on its day and a validator not earning, from the positions
  // last read on this device (no chain read here); never a name or an amount.
  try { const staking = stakingItems((await readFinance(storage)).positions, {now, timeZone: zone, today}); if (staking.length) input.staking = staking; } catch { /* unreadable: no staking items */ }
  return input;
}
/** The plan for now, or null in the Showcase; with the live "Snooze 1 h" taps kept (journey bug J5-2, lib/notify/plan.ts withSnoozes). */
export async function currentPlan(now = Date.now(), snoozes: readonly Snooze[] = []): Promise<Plan | null> {
  const input = await gatherPlanInput(now);
  return input ? withSnoozes(buildPlan(input), input, snoozes, now) : null;
}
