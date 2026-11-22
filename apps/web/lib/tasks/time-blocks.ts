import {addLocalDays} from '../local-date';
import {fitDay, toMin, type Busy, type Placement} from './layouts';
import {BLOCK_NAME_MAX, MAX_TIME_BLOCKS, taskPlanSchema, type BlockColour, type TaskPlan, type TimeBlock} from './plan-record';
import {MAX_TRAVEL, tasksSchema, type Task, type Tasks} from './schema';
import type {HoursBlock} from './plan-record';
import {blockProgress, blockTasks, blocksOn, eventIdOf, eventTravel, leaveBy} from './time-blocks-read';
export {blockProgress, blockTasks, blocksOn, eventIdOf, eventTravel, leaveBy};

/**
 * Session AV lane 2 (r5-plan, LEDGER #348; Akiflow's time slots): named blocks of time — "Deep work, 9:00–11:00", once on a
 * day or on chosen weekdays, in one of the calm colours — kept in the planning record (`zigoals:task-plan:v1` `blocks`;
 * TIER 3 stored format). A task is dropped into a block by its `block` and its day; Plan my day places the block's tasks
 * inside it (and other tasks outside every block); the block says "2 of 4 done"; "Move what is left" sends its open tasks to
 * the next block of the same name, with Undo. Drawn on the Day Timeline, the Agenda's hour grid and Tasks → Today.
 *
 * Also the travel minutes before a timed task or an imported event (LEDGER #353): typed by the person, never worked out
 * from a route (that would need a maps service). Pure.
 */
export type BlockInput = {name: string; colour: BlockColour; from: string; to: string; days?: number[]; on?: string};
export const BLOCK_LOOK_AHEAD = 60;
const CLOCK = /^(?:[01]\d|2[0-3]):[0-5]\d$/;
function checkBlock(input: BlockInput): void {
  const name = input.name.trim();
  if (!name) throw new Error('Give the block a name, such as “Deep work”.');
  if (name.length > BLOCK_NAME_MAX) throw new Error(`A block’s name can be at most ${BLOCK_NAME_MAX} characters.`);
  if (!CLOCK.test(input.from) || !CLOCK.test(input.to)) throw new Error('Choose a start and an end, such as 09:00 and 11:00.');
  if (input.from >= input.to) throw new Error('The block ends after it starts, on the same day.');
  if (!input.on && !input.days?.length) throw new Error('Choose a day, or the weekdays it comes back on.');
}
const clean = (input: BlockInput) => ({name: input.name.trim(), colour: input.colour, from: input.from, to: input.to, ...(input.on ? {on: input.on} : {days: [...new Set(input.days)].sort((a, b) => a - b)})});
export function addBlock(plan: TaskPlan, input: BlockInput, id: string): TaskPlan {
  checkBlock(input);
  if ((plan.blocks ?? []).length >= MAX_TIME_BLOCKS) throw new Error(`You have ${MAX_TIME_BLOCKS} time blocks, the most this device keeps. Remove one first.`);
  return taskPlanSchema.parse({...plan, blocks: [...(plan.blocks ?? []), {id, ...clean(input)}]});
}
export function editBlock(plan: TaskPlan, id: string, input: BlockInput): TaskPlan {
  checkBlock(input);
  if (!(plan.blocks ?? []).some(b => b.id === id)) throw new Error('That block is no longer on this device.');
  return taskPlanSchema.parse({...plan, blocks: (plan.blocks ?? []).map(b => b.id === id ? {id, ...clean(input)} : b)});
}
/** Removes a block; its tasks keep their day (a `block` naming no block is simply not in one). */
export function removeBlock(plan: TaskPlan, id: string): TaskPlan {
  const blocks = (plan.blocks ?? []).filter(b => b.id !== id), next: Record<string, unknown> = {...plan};
  if (blocks.length) next.blocks = blocks; else delete next.blocks;
  return taskPlanSchema.parse(next);
}
/** The next block of the same name (any case) after this one on `day`: later that day, else on the next days (60 at most). */
export function nextBlockOfName(plan: Pick<TaskPlan, 'blocks'>, block: TimeBlock, day: string): {block: TimeBlock; day: string} | null {
  const name = block.name.toLowerCase();
  const later = blocksOn(plan, day).find(b => b.name.toLowerCase() === name && b.from > block.from);
  if (later) return {block: later, day};
  for (let i = 1; i <= BLOCK_LOOK_AHEAD; i++) {
    const d = addLocalDays(day, i), hit = blocksOn(plan, d).find(b => b.name.toLowerCase() === name);
    if (hit) return {block: hit, day: d};
  }
  return null;
}
/** Drops a task into a block on its day (the block's day; its time cleared, so Plan my day places it inside the block). */
export function dropIntoBlock(record: Tasks, taskId: string, block: TimeBlock, day: string, at = new Date()): Tasks {
  const task = record.tasks.find(t => t.id === taskId);
  if (!task) throw new Error('That task is no longer on this device.');
  if (task.doneAt) throw new Error('That task is already closed.');
  if (block.on && block.on !== day) throw new Error('That block is on another day.');
  const stamp = at.toISOString();
  return tasksSchema.parse({...record, tasks: record.tasks.map(t => { if (t.id !== taskId) return t; const out: Record<string, unknown> = {...t, due: day, block: block.id, updatedAt: stamp}; delete out.plan; if (t.time && (t.time < block.from || t.time >= block.to)) delete out.time; return out; })});
}
/** "Move what is left": the block's open tasks go to the next block of the same name (their times cleared). */
export function moveWhatIsLeft(record: Tasks, plan: Pick<TaskPlan, 'blocks'>, block: TimeBlock, day: string, at = new Date()): {record: Tasks; to: {block: TimeBlock; day: string}; moved: Task[]} {
  const left = blockTasks(record, block, day).filter(t => !t.doneAt);
  if (!left.length) throw new Error(`Everything in “${block.name}” is done.`);
  const to = nextBlockOfName(plan, block, day);
  if (!to) throw new Error(`No later “${block.name}” block in the next ${BLOCK_LOOK_AHEAD} days. Add one in Tasks → This week → Time blocks.`);
  const ids = new Set(left.map(t => t.id)), stamp = at.toISOString();
  return {to, moved: left, record: tasksSchema.parse({...record, tasks: record.tasks.map(t => { if (!ids.has(t.id)) return t; const out: Record<string, unknown> = {...t, due: to.day, block: to.block.id, updatedAt: stamp}; delete out.time; return out; })})};
}
/** A block's time as busy (for the tasks outside it). */
export const blockBusy = (blocks: readonly TimeBlock[]): Busy[] => blocks.map(b => ({start: toMin(b.from), end: toMin(b.to), title: b.name}));
/**
 * Plan my day with blocks: each block's tasks first, inside the block (around the day's fixed items); then every other task
 * outside all blocks, in the day's working hours. A block task that finds no room in its block is left (said).
 */
export function fitWithBlocks(tasks: readonly Task[], busy: readonly Busy[], opts: {from: string; until: string; windows?: readonly HoursBlock[]; after?: readonly HoursBlock[]}, blocks: readonly TimeBlock[]): ReturnType<typeof fitDay> & {inBlock: Map<string, string>} {
  const ids = new Set(blocks.map(b => b.id)), placed: Placement[] = [], left: Task[] = [], rest: {task: Task; pieces: number}[] = [], inBlock = new Map<string, string>();
  const taken: Busy[] = [...busy];
  for (const b of blocks) {
    const mine = tasks.filter(t => t.block === b.id);
    if (!mine.length) continue;
    const from = opts.from > b.from ? opts.from : b.from;
    if (from >= b.to) { left.push(...mine.filter(t => !t.time && !t.parallel)); continue; }
    const fit = fitDay(mine, taken, {from, until: b.to});
    placed.push(...fit.placed); left.push(...fit.left); rest.push(...fit.rest);
    for (const p of fit.placed) { taken.push({start: toMin(p.start), end: toMin(p.end), title: p.task.title}); inBlock.set(`${p.task.id}:${p.part ?? 1}`, b.name); }
  }
  const others = fitDay(tasks.filter(t => !t.block || !ids.has(t.block)), [...taken, ...blockBusy(blocks)], opts);
  return {placed: [...placed, ...others.placed].sort((a, b) => a.start.localeCompare(b.start)), left: [...left, ...others.left], rest: [...rest, ...others.rest], inBlock};
}

/* ---- Travel minutes (LEDGER #353) -------------------------------------------------------------------------------- */
export const TRAVEL_CHOICES = [5, 10, 15, 20, 30, 45, 60, 90, 120] as const;
/** Sets (or clears, with null) the travel minutes before an imported event. */
export function setEventTravel(plan: TaskPlan, eventId: string, minutes: number | null): TaskPlan {
  if (!/^[0-9a-f]{16}$/.test(eventId)) throw new Error('That event is no longer in your imported calendars.');
  if (minutes !== null && (!Number.isInteger(minutes) || minutes < 1 || minutes > MAX_TRAVEL)) throw new Error(`Enter whole minutes from 1 to ${MAX_TRAVEL}.`);
  const map = {...(plan.eventTravel ?? {})};
  if (minutes === null) delete map[eventId]; else map[eventId] = minutes;
  const next: Record<string, unknown> = {...plan};
  if (Object.keys(map).length) next.eventTravel = map; else delete next.eventTravel;
  return taskPlanSchema.parse(next);
}
/** An imported event's busy time with its travel before it. */
export const eventBusy = (plan: Pick<TaskPlan, 'eventTravel'>, item: {id: string; time: string | null; minutes: number; title: string}, fallback: number): Busy | null =>
  item.time ? {start: Math.max(0, toMin(item.time) - eventTravel(plan, item.id)), end: toMin(item.time) + (item.minutes || fallback), title: item.title} : null;
