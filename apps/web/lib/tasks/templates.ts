import * as z from 'zod';
import type {DeviceRecordSpec} from '../device-record';
import {addLocalDays} from '../local-date';
import {addProject, addSection, addTask} from './engine';
import {MAX_TASK_MINUTES, PROJECT_NAME_MAX, TASK_TITLE_MAX, taskLevel, type TaskLevel, type Tasks} from './schema';

/**
 * Session AV lane 2 (tasks, LEDGER #10, #17; Todoist's templates, Things' repeating projects; TIER 3 (stored format), a
 * new additive key `zigoals:task-templates:v1`): project templates — a few built in ("Moving house", "A trip", "A new
 * job", "Weekly reset") and the person's own, saved from a project. A template is a list of task titles with optional
 * sections, subtasks (`parent`, the index of an earlier item), priority, minutes and a day counted from the start day
 * (`offset`). Using one makes a new project with those tasks (one change, one Undo); using it again later is how a
 * project repeats. Loose, versioned, bounded; device only (exported, restored, erased with the account; never synced). Pure.
 */
export const TASK_TEMPLATES_KEY = 'zigoals:task-templates:v1';
export const MAX_TEMPLATES = 30, MAX_TEMPLATE_ITEMS = 100;
const itemSchema = z.looseObject({
  title: z.string().trim().min(1).max(TASK_TITLE_MAX),
  section: z.string().trim().min(1).max(PROJECT_NAME_MAX).optional().catch(undefined),
  parent: z.number().int().min(0).max(MAX_TEMPLATE_ITEMS - 1).optional().catch(undefined),
  offset: z.number().int().min(0).max(365).optional().catch(undefined),
  level: z.number().int().min(1).max(4).optional().catch(undefined),
  minutes: z.number().int().min(1).max(MAX_TASK_MINUTES).optional().catch(undefined),
});
export type TemplateItem = z.infer<typeof itemSchema>;
const templateSchema = z.looseObject({
  id: z.string().regex(/^[A-Za-z0-9_-]{1,80}$/),
  name: z.string().trim().min(1).max(PROJECT_NAME_MAX),
  createdAt: z.iso.datetime({offset: true}),
  items: z.preprocess(v => Array.isArray(v) ? v.filter(x => itemSchema.safeParse(x).success).slice(0, MAX_TEMPLATE_ITEMS) : [], z.array(itemSchema).min(1)),
});
export type TaskTemplate = z.infer<typeof templateSchema>;
export const taskTemplatesSchema = z.looseObject({
  version: z.literal(1),
  items: z.preprocess(v => Array.isArray(v) ? v.filter(x => templateSchema.safeParse(x).success).slice(0, MAX_TEMPLATES) : [], z.array(templateSchema)),
});
export type TaskTemplates = z.infer<typeof taskTemplatesSchema>;
export const emptyTaskTemplates = (): TaskTemplates => ({version: 1, items: []});
export const TASK_TEMPLATES: DeviceRecordSpec<TaskTemplates> = {key: TASK_TEMPLATES_KEY, schema: taskTemplatesSchema, empty: emptyTaskTemplates};

const t = (title: string, more: Omit<TemplateItem, 'title'> = {}): TemplateItem => ({title, ...more});
/** The built-in templates (never stored; the person can use them as they are or save a changed copy from the project). */
export const BUILT_IN_TEMPLATES: readonly {id: string; name: string; about: string; items: TemplateItem[]}[] = [
  {id: 'builtin-moving', name: 'Moving house', about: 'Six weeks of moving, from boxes to the new address.', items: [
    t('Book the movers or a van', {section: 'Six weeks before', level: 2}), t('Give notice on the old place', {section: 'Six weeks before', level: 1}),
    t('Sort and give away what you will not take', {section: 'A month before', offset: 7, minutes: 120}), t('Order boxes and tape', {section: 'A month before', offset: 7}),
    t('Pass on the new address', {section: 'Two weeks before', offset: 28}), t('Bank and insurance', {parent: 4}), t('Doctor and dentist', {parent: 4}), t('Post forwarding', {parent: 4}),
    t('Pack a first-night box', {section: 'Moving day', offset: 41, minutes: 45}), t('Read the meters', {section: 'Moving day', offset: 42}), t('Hand over the keys', {section: 'Moving day', offset: 42, level: 1}),
  ]},
  {id: 'builtin-trip', name: 'A trip', about: 'Before you go and on the day you leave.', items: [
    t('Book travel and a place to stay', {section: 'Plan', level: 2}), t('Check passport and insurance', {section: 'Plan'}),
    t('Pack', {section: 'The day before', offset: 6, minutes: 60}), t('Charger and adapters', {parent: 2}), t('Medicines', {parent: 2}), t('Tickets on the phone', {parent: 2}),
    t('Water the plants and take out the bins', {section: 'Leaving', offset: 7}), t('Lock up and go', {section: 'Leaving', offset: 7}),
  ]},
  {id: 'builtin-job', name: 'A new job', about: 'The first weeks at a new place.', items: [
    t('Sign the contract and send your details', {section: 'Before you start', level: 1}), t('Plan the way to work', {section: 'Before you start'}),
    t('Meet your team one by one', {section: 'First week', offset: 7, minutes: 30}), t('Set up your accounts and tools', {section: 'First week', offset: 7, minutes: 90}),
    t('Agree goals for the first 90 days', {section: 'First month', offset: 21, level: 2}),
  ]},
  {id: 'builtin-reset', name: 'Weekly reset', about: 'An hour to clear the week and plan the next.', items: [
    t('Empty the Inbox', {minutes: 15}), t('Look over next week’s Agenda', {minutes: 10}), t('Choose three objectives for the week', {minutes: 10, level: 2}), t('Tidy the desk and the downloads', {minutes: 15}), t('Plan one thing to look forward to', {minutes: 10}),
  ]},
];

/** A project saved as a template: its open and finished top-level tasks and subtasks, with sections, priority, minutes and days counted from its first day. */
export function templateFromProject(record: Tasks, projectId: string, {id, at, name}: {id: string; at: Date; name?: string}): TaskTemplate {
  const project = record.projects?.find(p => p.id === projectId);
  if (!project) throw new Error('That project is no longer on this device.');
  const tasks = record.tasks.filter(x => x.projectId === projectId).sort((a, b) => (a.order ?? 0) - (b.order ?? 0) || a.createdAt.localeCompare(b.createdAt));
  if (!tasks.length) throw new Error('This project has no tasks to save yet.');
  const top = tasks.filter(x => !x.parentId || !tasks.some(p => p.id === x.parentId)), ordered = top.flatMap(p => [p, ...tasks.filter(c => c.parentId === p.id)]).slice(0, MAX_TEMPLATE_ITEMS);
  const first = ordered.map(x => x.due).filter((d): d is string => !!d).sort()[0];
  const days = (a: string, b: string) => Math.round((Date.parse(`${b}T12:00:00Z`) - Date.parse(`${a}T12:00:00Z`)) / 86_400_000);
  const items = ordered.map((x): TemplateItem => {
    const section = x.sectionId ? record.sections?.find(s => s.id === x.sectionId)?.name : undefined, parent = x.parentId ? ordered.findIndex(p => p.id === x.parentId) : -1, level = taskLevel(x);
    return {title: x.title, ...(section ? {section} : {}), ...(parent >= 0 ? {parent} : {}), ...(first && x.due ? {offset: Math.min(365, Math.max(0, days(first, x.due)))} : {}), ...(level !== 3 ? {level} : {}), ...(x.minutes ? {minutes: x.minutes} : {})};
  });
  return templateSchema.parse({id, name: (name ?? project.name).trim().slice(0, PROJECT_NAME_MAX), createdAt: at.toISOString(), items});
}
export function saveTemplate(record: TaskTemplates, template: TaskTemplate): TaskTemplates {
  if (record.items.length >= MAX_TEMPLATES) throw new Error(`This device keeps ${MAX_TEMPLATES} templates. Remove one first.`);
  return taskTemplatesSchema.parse({...record, items: [...record.items, template]});
}
export const removeTemplate = (record: TaskTemplates, id: string): TaskTemplates => taskTemplatesSchema.parse({...record, items: record.items.filter(x => x.id !== id)});
/**
 * A new project from a template: its sections, then its tasks (subtasks under their parent), each item with an `offset`
 * due that many days from `start` (none without a start day). One record in, one record out; ids come from `ids`.
 */
export function applyTemplate(record: Tasks, template: {name: string; items: readonly TemplateItem[]}, {name, start, today, at, ids}: {name?: string; start?: string; today: string; at: Date; ids: () => string}): {record: Tasks; projectId: string} {
  const projectId = `project_${ids()}`;
  // A name already in use gets a number ("Moving house (2)"): a template used again is a project of its own.
  const base = ((name ?? template.name).trim() || template.name).slice(0, PROJECT_NAME_MAX - 5), taken = new Set((record.projects ?? []).map(p => p.name.toLowerCase()));
  let unique = base;
  for (let i = 2; taken.has(unique.toLowerCase()) && i < 100; i++) unique = `${base} (${i})`;
  let rec = addProject(record, {name: unique}, projectId);
  const sectionIds = new Map<string, string>(), taskIds: string[] = [];
  for (const item of template.items) if (item.section && !sectionIds.has(item.section)) { const sid = `section_${ids()}`; rec = addSection(rec, projectId, item.section, sid); sectionIds.set(item.section, sid); }
  template.items.forEach((item, i) => {
    const id = `task_${ids()}`, parent = item.parent !== undefined && item.parent < i ? taskIds[item.parent] : undefined;
    rec = addTask(rec, {title: item.title, projectId, ...(item.section && !parent ? {sectionId: sectionIds.get(item.section)} : {}), ...(parent ? {parentId: parent} : {}),
      ...(start && item.offset !== undefined ? {due: addLocalDays(start, item.offset)} : {}), ...(item.level ? {level: item.level as TaskLevel} : {}), ...(item.minutes ? {minutes: item.minutes} : {})}, {id, at, today, allowPast: true});
    taskIds.push(id);
  });
  return {record: rec, projectId};
}
