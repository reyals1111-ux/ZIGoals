import {createHabit, habitDataSchema, habitInputSchema, type HabitData, type HabitInput} from '../habits';

/**
 * H5: four routine templates (morning, evening, workout, focus). Each is a chain of habits created through the journal's
 * own `createHabit` with "stack after" links, so a template is exactly what a person could build by hand in the editor.
 * Nothing is created until the person taps the template; an existing active habit with the same title is reused as a
 * step instead of being created twice.
 */
export type RoutineTemplateStep = {title: string; category: string; minutes?: number; timeOfDay: HabitInput['timeOfDay']; description: string};
export type RoutineTemplate = {id: 'morning' | 'evening' | 'workout' | 'focus'; title: string; blurb: string; steps: RoutineTemplateStep[]};
export const ROUTINE_TEMPLATES: readonly RoutineTemplate[] = [
  {id: 'morning', title: 'Morning routine', blurb: 'A calm start: water, a stretch, a few quiet minutes and one line of intention.', steps: [
    {title: 'Glass of water', category: 'Wellbeing', timeOfDay: 'morning', description: 'One glass before anything else.'},
    {title: 'Stretch', category: 'Wellbeing', minutes: 5, timeOfDay: 'morning', description: 'Five easy minutes to wake the body.'},
    {title: 'Meditate', category: 'Wellbeing', minutes: 10, timeOfDay: 'morning', description: 'Ten minutes of quiet.'},
    {title: 'Plan the day', category: 'Learning', timeOfDay: 'morning', description: 'Three things that matter today.'}]},
  {id: 'evening', title: 'Evening routine', blurb: 'Wind down: tidy, reflect, read, lights out on time.', steps: [
    {title: 'Tidy up', category: 'Home', minutes: 10, timeOfDay: 'evening', description: 'Ten minutes to reset the space.'},
    {title: 'Journal', category: 'Wellbeing', minutes: 5, timeOfDay: 'evening', description: 'A few lines about the day.'},
    {title: 'Read', category: 'Learning', minutes: 20, timeOfDay: 'evening', description: 'Twenty minutes with a book.'},
    {title: 'Lights out by 23:00', category: 'Wellbeing', timeOfDay: 'evening', description: 'Screens away, lights off.'}]},
  {id: 'workout', title: 'Workout routine', blurb: 'Warm up, the main set, cool down.', steps: [
    {title: 'Warm up', category: 'Wellbeing', minutes: 5, timeOfDay: 'anytime', description: 'Five minutes to get moving.'},
    {title: 'Exercise', category: 'Wellbeing', minutes: 30, timeOfDay: 'anytime', description: 'The main set.'},
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
/** Creates the template's chain; a step whose title an active habit already has is reused (and re-linked only when it has no stack yet). Returns the head habit's id. */
export function createRoutineFromTemplate(data: HabitData, template: RoutineTemplate, now: Date, ids: () => string): {data: HabitData; headId: string; created: string[]; reused: string[]} {
  let next = data, previous: string | undefined;
  const created: string[] = [], reused: string[] = [];
  let headId = '';
  for (const step of template.steps) {
    const existing = next.habits.find(h => h.title.toLowerCase() === step.title.toLowerCase() && h.rules[h.rules.length - 1]!.state !== 'archived');
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
