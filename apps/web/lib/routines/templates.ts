import {createHabit, habitDataSchema, habitInputSchema, type HabitData, type HabitInput} from '../habits';

/**
 * H5: four routine templates (morning, evening, workout, focus). Each is a chain of habits created through the journal's
 * own `createHabit` with "stack after" links, so a template is exactly what a person could build by hand in the editor.
 * Nothing is created until the person taps the template; an existing active habit with the same title is reused as a
 * step instead of being created twice.
 */
export type RoutineTemplateStep = {title: string; category: string; minutes?: number; timeOfDay: HabitInput['timeOfDay']; description: string;
  /** Session AH (HA4, L-083): other titles a person may already use for this step ("Drink water" for "Glass of water"). */
  aliases?: readonly string[]};
export type RoutineTemplate = {id: 'morning' | 'evening' | 'workout' | 'focus'; title: string; blurb: string; steps: RoutineTemplateStep[]};
export const ROUTINE_TEMPLATES: readonly RoutineTemplate[] = [
  {id: 'morning', title: 'Morning routine', blurb: 'A calm start: water, a stretch, a few quiet minutes and one line of intention.', steps: [
    {title: 'Glass of water', category: 'Wellbeing', timeOfDay: 'morning', description: 'One glass before anything else.', aliases: ['Drink water', 'Water', 'Drink a glass of water', 'Hydrate']},
    {title: 'Stretch', category: 'Wellbeing', minutes: 5, timeOfDay: 'morning', description: 'Five easy minutes to wake the body.', aliases: ['Stretching']},
    {title: 'Meditate', category: 'Wellbeing', minutes: 10, timeOfDay: 'morning', description: 'Ten minutes of quiet.', aliases: ['Meditation', 'Mindfulness']},
    {title: 'Plan the day', category: 'Learning', timeOfDay: 'morning', description: 'Three things that matter today.'}]},
  {id: 'evening', title: 'Evening routine', blurb: 'Wind down: tidy, reflect, read, lights out on time.', steps: [
    {title: 'Tidy up', category: 'Home', minutes: 10, timeOfDay: 'evening', description: 'Ten minutes to reset the space.'},
    {title: 'Journal', category: 'Wellbeing', minutes: 5, timeOfDay: 'evening', description: 'A few lines about the day.', aliases: ['Journaling', 'Write a journal']},
    {title: 'Read', category: 'Learning', minutes: 20, timeOfDay: 'evening', description: 'Twenty minutes with a book.', aliases: ['Reading', 'Read a book']},
    {title: 'Lights out by 23:00', category: 'Wellbeing', timeOfDay: 'evening', description: 'Screens away, lights off.'}]},
  {id: 'workout', title: 'Workout routine', blurb: 'Warm up, the main set, cool down.', steps: [
    {title: 'Warm up', category: 'Wellbeing', minutes: 5, timeOfDay: 'anytime', description: 'Five minutes to get moving.'},
    {title: 'Exercise', category: 'Wellbeing', minutes: 30, timeOfDay: 'anytime', description: 'The main set.', aliases: ['Workout', 'Work out', 'Training']},
    {title: 'Cool down', category: 'Wellbeing', minutes: 5, timeOfDay: 'anytime', description: 'Slow it down and breathe.'}]},
  {id: 'focus', title: 'Focus routine', blurb: 'Clear the desk, one deep-work block, a short walk.', steps: [
    {title: 'Clear the desk', category: 'Learning', timeOfDay: 'anytime', description: 'Only what the task needs.'},
    {title: 'Deep work', category: 'Learning', minutes: 50, timeOfDay: 'anytime', description: 'One block, no interruptions.'},
    {title: 'Short walk', category: 'Wellbeing', minutes: 10, timeOfDay: 'anytime', description: 'Ten minutes outside.'}]},
];
export function templateInput(step: RoutineTemplateStep, stackAfterId?: string): HabitInput {
  return habitInputSchema.parse({title: step.title, category: step.category, description: step.description, notes: '', type: 'build', schedule: {kind: 'daily'}, target: step.minutes ?? 1, targetPeriod: 'day',
    measurement: step.minutes ? {kind: 'duration', unit: 'minutes'} : {kind: 'boolean'}, timeOfDay: step.timeOfDay, endCondition: {kind: 'none'}, ...(stackAfterId ? {stackAfterId} : {})});
}
const sameTitle = (title: string) => title.trim().replace(/\s+/g, ' ').toLowerCase();
/** Session AH (HA4, T-141): what adding a template would do, without writing: the habits it creates and the ones it reuses. */
export function previewRoutineTemplate(data: HabitData, template: RoutineTemplate): {create: string[]; reuse: string[]} {
  const made = createRoutineFromTemplate(data, template, new Date(), () => crypto.randomUUID());
  const title = (id: string) => made.data.habits.find(h => h.id === id)?.title ?? '';
  return {create: made.created.map(title), reuse: made.reused.map(title)};
}
/** The template a chain was made from: its steps are that template's steps, in order (each by title or alias). */
export function templateOfChain(titles: readonly string[]): RoutineTemplate | undefined {
  return ROUTINE_TEMPLATES.find(t => t.steps.length === titles.length && t.steps.every((step, i) => [step.title, ...(step.aliases ?? [])].map(sameTitle).includes(sameTitle(titles[i]!))));
}
/** Creates the template's chain; a step whose title an active habit already has is reused (and re-linked only when it has no stack yet). Returns the head habit's id. */
export function createRoutineFromTemplate(data: HabitData, template: RoutineTemplate, now: Date, ids: () => string): {data: HabitData; headId: string; created: string[]; reused: string[]} {
  let next = data, previous: string | undefined;
  const created: string[] = [], reused: string[] = [];
  let headId = '';
  for (const step of template.steps) {
    const names = new Set([step.title, ...(step.aliases ?? [])].map(sameTitle));
    const existing = next.habits.find(h => names.has(sameTitle(h.title)) && h.rules[h.rules.length - 1]!.state !== 'archived');
    let id: string;
    if (existing) {
      id = existing.id; reused.push(id);
      // A reused habit joins the chain when it has no stack of its own yet (the editor's own "stack after" field).
      if (previous && !existing.stackAfterId) next = habitDataSchema.parse({...next, habits: next.habits.map(h => h.id === id ? {...h, stackAfterId: previous, updatedAt: now.toISOString()} : h)});
    }
    else { id = ids(); next = createHabit(next, templateInput(step, previous), now, id); created.push(id); }
    if (!headId) headId = id;
    previous = id;
  }
  return {data: next, headId, created, reused};
}
