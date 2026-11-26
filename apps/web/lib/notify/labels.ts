import type {NotifyType} from './prefs';

/**
 * Session AW Part 2 (speed, attempt 2): each notification type's name and line, as Settings → Notifications lists them
 * (components/notify/notifications-card.tsx). Out of lib/notify/prefs.ts, which every page loads (components/notify/notify-sync.tsx
 * reads the record), so the words load with the card. Unchanged.
 */
export const NOTIFY_LABELS: Record<NotifyType, {title: string; blurb: string}> = {
  habits: {title: 'Habits due', blurb: 'At each habit’s reminder time, unless it is already done.'},
  morning: {title: 'Morning orbit', blurb: 'What is next today, any contribution due and how many tasks are overdue (a count only); a tap opens the Checklist.'},
  evening: {title: 'Evening wrap-up', blurb: 'How the day went and what is still open.'},
  water: {title: 'Water', blurb: 'At your water reminder time, with how much is left to drink.'},
  contributions: {title: 'Goal contributions', blurb: 'On days a plan has an amount due, at the plan’s reminder time.'},
  windDown: {title: 'Wind-down', blurb: 'At your wind-down time before bed.'},
  review: {title: 'Weekly Life review', blurb: 'On your review day, at its time.'},
  prices: {title: 'Price alerts', blurb: 'Checked with the morning and evening notifications.'},
  bills: {title: 'Bills due', blurb: 'The morning before a bill you track is due.'},
  supplements: {title: 'Supplements and medication', blurb: 'At the times you set in Health. The notification never names what you take.'},
  tasks: {title: 'Task reminders', blurb: 'At each reminder you set on a task, with Snooze 1 h; the task’s name only if names are on.'},
  mood: {title: 'Mood check-in', blurb: 'At your mood time, and a second one if you like, unless you already said how today feels; a tap opens the mood question. It never says a mood.'},
  countdowns: {title: 'Countdown reminders', blurb: 'In the morning when a countdown’s reminder starts, and on its day; its name only if names are on.'},
  journal: {title: 'Reminder to write', blurb: 'At the time you set in Journal → Reminder to write, unless you already wrote that day. Never a word of your journal.'},
  money: {title: 'Money notices', blurb: 'In the morning after a budget passes 80 % or its amount, the day before payday, and before cash may go below your own line; amounts only if names are on.'},
  // Session AV lane 2 (food, LEDGER #90): off by default; the meal reminders themselves are switched on in Health.
  meals: {title: 'Meal reminders', blurb: 'At each meal’s usual time set in Health, while nothing is logged for it; never what you ate.'},
  // Session AV lane 2 (bodymind-r2, LEDGER #235, #236): off by default; which ones is chosen under the energy curve and the plan steps.
  // Session AV lane 2 (r3-plan, LEDGER #256; Structured's morning planning): its time is set in Tasks → This week.
  planDay: {title: 'Plan your day', blurb: 'At the time you set in Tasks → This week, with how many tasks are overdue; a tap opens Plan my day. Never a task’s name.'},
  // Session AV lane 2 (health r3, LEDGER #286): the reminder itself is set in Health → Weight.
  weighIn: {title: 'Weigh-in', blurb: 'At the weigh-in time you set in Health → Weight, unless a weight is already logged that day. Never a weight.'},
  // Session AV lane 2, round 5 (money; Tiller's Hello Money, LEDGER #384): off by default; also switched on in Wealth → Spending → Yesterday’s money.
  moneyMorning: {title: 'Yesterday’s money', blurb: 'Each morning, how many entries you logged yesterday; with names on, also what you spent and received and your cash balances. Never a payee.'},
  // Session AW (X1, LEDGER #440): a named timer's end, as the bell in the app rings it.
  timers: {title: 'Timers', blurb: 'When a timer you started ends (Tasks → Timers); its name only if names are on. The bell rings in the app either way.'},
  energy: {title: 'Energy curve and plan steps', blurb: 'From your energy curve (the focus window, before the dip, winding down) and at the steps of your morning and evening plan you chose, in Health → Sleep. Never a sleep figure.'},
};
