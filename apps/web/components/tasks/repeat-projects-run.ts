'use client';
import {readDeviceRecord, updateDeviceRecord} from '../../lib/device-record';
import {ZIGI_STORE_EVENT} from '../../lib/ai/store/keys';
import {getAppStorage} from '../../lib/showcase-storage';
import {TASK_TEMPLATES} from '../../lib/tasks/templates';
import {dueRepeats, markRepeats, repeatWords, runRepeats} from '../../lib/tasks/repeat-projects';
import type {Tasks} from '../../lib/tasks/schema';

/**
 * Session AV lane 2 (rest, LEDGER #17): when Tasks opens (and when its day moves on), the repeating projects whose time
 * has come are made, with one Undo that takes the new projects back (the period stays made, as a repeating note does).
 * Loaded on its own, after the page, so the Tasks route carries none of it.
 */
type Change = (fn: (r: Tasks) => Tasks, text: string, undone?: string) => boolean;
export function runDueRepeats({tasks, change, today}: {tasks: Tasks; change: Change; today: string}): number {
  let templates;
  try { const read = readDeviceRecord(getAppStorage(), TASK_TEMPLATES); if (read.unreadable) return 0; templates = read.data; } catch { return 0; }
  if (!dueRepeats(templates, today).length) return 0;
  const ids = () => crypto.randomUUID(), at = new Date(), preview = runRepeats(tasks, templates, {today, at, ids});
  const names = preview.made.map(m => `“${m.name}”`), first = preview.made[0];
  const text = !first ? '' : names.length === 1 ? `Made ${names[0]}: it comes round ${repeatWords(first.repeat)}.` : `Made ${names.length} repeating projects: ${names.join(', ')}.`;
  const ok = !first || change(r => runRepeats(r, templates, {today, at, ids}).tasks, text, names.length === 1 ? `${names[0]} is taken back. It comes round again next time.` : 'The new projects are taken back.');
  if (!ok) return 0;
  try { updateDeviceRecord(getAppStorage(), TASK_TEMPLATES, t => markRepeats(t, today)); window.dispatchEvent(new CustomEvent(ZIGI_STORE_EVENT, {detail: TASK_TEMPLATES.key})); } catch { /* made; marked next time */ }
  return preview.made.length;
}
