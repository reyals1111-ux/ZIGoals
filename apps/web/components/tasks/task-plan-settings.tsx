'use client';
import {useId} from 'react';
import {useDeviceRecord} from '../ai/use-device-record';
import {showStatus} from '../ui/undo-toast';
import {DAY_LIMIT_CHOICES, ENERGY_AMOUNT_CHOICES, ENERGY_AMOUNT_DEFAULT, TASK_PLAN, setPlanPrefs} from '../../lib/tasks/plan-record';
import {REMINDER_CHOICES} from '../../lib/tasks/reminders';
import {minutesWords} from '../../lib/tasks/minutes';
import {formatClock} from '../../lib/visual-format';

/** Session AV lane 2 (r3-plan, LEDGER #256; Structured's morning planning): the times offered for "Plan your day". */
const PLAN_TIMES = ['06:00', '06:30', '07:00', '07:30', '08:00', '08:30', '09:00', '09:30', '10:00', '21:00', '21:30', '22:00'] as const;

/**
 * Session AV lane 2 (tasks; TickTick's default reminder LEDGER #11, Sunsama's day threshold LEDGER #26, Todoist's daily
 * goal LEDGER #9): the three planning choices of this device, in Tasks → This week. Each is kept in
 * `zigoals:task-plan:v1` the moment it is chosen, and said.
 */
export default function TaskPlanSettings() {
  const plan = useDeviceRecord(TASK_PLAN), id = useId(), p = plan.data;
  const set = (patch: Parameters<typeof setPlanPrefs>[1], said: string) => {
    if (plan.unreadable) { showStatus('Your planning choices could not be read on this device, so nothing was written over them.', {tone: 'error'}); return; }
    try { plan.update(x => setPlanPrefs(x, patch)); showStatus(said); } catch { showStatus('That could not be kept on this device.', {tone: 'error'}); }
  };
  if (!plan.loaded) return <p className="fine" role="status">Opening your choices…</p>;
  return <section className="tasks-plan-settings" aria-labelledby={`${id}-title`}>
    <h3 id={`${id}-title`}>Your planning choices</h3>
    <div className="tasks-plan-settings-fields">
      <label className="field"><span>Default reminder</span><select value={p.defaultReminder === undefined ? '' : String(p.defaultReminder)} onChange={e => { const v = e.target.value; set({defaultReminder: v === '' ? null : Number(v)}, v === '' ? 'New tasks get no reminder of their own.' : `New tasks with a day are reminded ${REMINDER_CHOICES.find(c => String(c.before) === v)?.label.toLowerCase() ?? ''}.`); }}>
        <option value="">None</option>{REMINDER_CHOICES.map(c => <option key={c.before} value={c.before}>{c.label}</option>)}</select></label>
      <label className="field"><span>My day holds</span><select value={p.dayLimit === undefined ? '' : String(p.dayLimit)} onChange={e => { const v = e.target.value; set({dayLimit: v === '' ? null : Number(v)}, v === '' ? 'No day limit: Today adds up the minutes only.' : `Today warns past ${minutesWords(Number(v))} of tasks.`); }}>
        <option value="">No limit</option>{DAY_LIMIT_CHOICES.map(n => <option key={n} value={n}>{minutesWords(n)} of tasks</option>)}</select></label>
      <label className="field"><span>Daily goal</span><select value={p.dailyGoal === undefined ? '' : String(p.dailyGoal)} onChange={e => { const v = e.target.value; set({dailyGoal: v === '' ? null : Number(v)}, v === '' ? 'No daily goal.' : `Daily goal: ${v} ${v === '1' ? 'task' : 'tasks'} done a day.`); }}>
        <option value="">No goal</option>{[1, 2, 3, 4, 5, 6, 8, 10, 12, 15, 20].map(n => <option key={n} value={n}>{n} {n === 1 ? 'task' : 'tasks'} a day</option>)}</select></label>
      <label className="field"><span>Energy a day holds</span><select value={String(p.energyAmount ?? ENERGY_AMOUNT_DEFAULT)} onChange={e => { const v = Number(e.target.value); set({energyAmount: v === ENERGY_AMOUNT_DEFAULT ? null : v}, `Your day holds ${v} energy. Tasks → Today says how the day’s tasks add up, in calm words.`); }}>
        {[...new Set([...ENERGY_AMOUNT_CHOICES, p.energyAmount ?? ENERGY_AMOUNT_DEFAULT])].sort((a, b) => a - b).map(n => <option key={n} value={n}>{n === ENERGY_AMOUNT_DEFAULT ? `${n} (the usual)` : n}</option>)}</select></label>
      <label className="field"><span>Plan your day reminder</span><select value={p.planReminder?.time ?? ''} aria-describedby={`${id}-plan-note`} onChange={e => { const v = e.target.value; set({planTime: v === '' ? null : v}, v === '' ? 'No plan-your-day reminder.' : `A “Plan your day” notification at ${formatClock(v)} opens Plan my day, with how many tasks are overdue.`); }}>
        <option value="">None</option>{[...new Set([...PLAN_TIMES, ...(p.planReminder ? [p.planReminder.time] : [])])].sort().map(t => <option key={t} value={t}>{formatClock(t)}</option>)}</select></label>
    </div>
    <p className="fine" id={`${id}-plan-note`}>Plan your day reaches this device while ZIGoals is closed once notifications are on (Settings → Notifications): it opens Plan my day and says how many tasks are overdue, never their names.</p>
    <p className="fine">Energy: each task can be restful, neutral, light, medium or heavy (in its editor); per half hour a light task counts 1, medium 2, heavy 3 and restful gives 1 back. Today says whether there is room for more.</p>
    <p className="fine">The default reminder goes on each new task that has a day (one you set yourself wins). The limit warns in Tasks → Today when the day’s minutes pass it. The goal counts the tasks you finish, with a streak of days in a row. Kept on this device.</p>
  </section>;
}
