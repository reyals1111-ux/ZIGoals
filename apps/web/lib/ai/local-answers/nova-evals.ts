/**
 * Release review 2 (R2-2): NOVA's on-device eval set: the natural questions people ask NOVA first, per phrasing family, in
 * English and (where the existing layer answers Dutch) Dutch, each with what the answer must hold. Run on every CI run by
 * nova-evals.test.ts on the Showcase's records through NOVA's own environment (lib/nova/local-env.ts): with every NOVA
 * permission on and Health shared ('open'), with NOVA's defaults (Health off for NOVA: 'scope-off'), and with this device's
 * Health gate closed ('gate-off'). Deterministic, so the bar is every case.
 */
export type NovaEvalFamily = 'goals' | 'due-today' | 'sleep' | 'week' | 'habits-left' | 'water' | 'tasks' | 'day' | 'not-here';
export type NovaEvalCase = {id: string; family: NovaEvalFamily; lang: 'en' | 'nl'; question: string; env?: 'open' | 'scope-off' | 'gate-off';
  expect: {reply: 'answer' | 'refusal' | 'none'; includes?: string[]; excludes?: string[]; tools?: string[]}};
const c = (id: string, family: NovaEvalFamily, lang: 'en' | 'nl', question: string, expect: NovaEvalCase['expect'], env: NovaEvalCase['env'] = 'open'): NovaEvalCase => ({id, family, lang, question, env, expect});
const GOALS = ['Emergency fund', 'Japan adventure', 'to go'], NO_ADVICE = ['you should', 'I recommend', 'je moet'];
export const NOVA_EVALS: readonly NovaEvalCase[] = [
  // ---- Goals: every active goal, with what is left; a named goal stays the engine's own answer ----
  c('goals-how-far', 'goals', 'en', 'How far am I on my goals?', {reply: 'answer', includes: ['active goals', ...GOALS], excludes: NO_ADVICE, tools: ['list_goals']}),
  c('goals-how-are', 'goals', 'en', 'How are my goals doing?', {reply: 'answer', includes: GOALS, tools: ['list_goals']}),
  c('goals-progress', 'goals', 'en', 'What is the progress on my goals?', {reply: 'answer', includes: GOALS}),
  c('goals-doing', 'goals', 'en', 'how am I doing on all my goals', {reply: 'answer', includes: GOALS}),
  c('goals-where', 'goals', 'en', 'Where do I stand with my goals?', {reply: 'answer', includes: GOALS}),
  c('goals-named', 'goals', 'en', 'How far am I on my Emergency fund goal?', {reply: 'answer', includes: ['Emergency fund: 45% of the target'], tools: ['goal_progress']}),
  c('goals-nl-gaat', 'goals', 'nl', 'Hoe gaat het met mijn doelen?', {reply: 'answer', includes: ['actieve doelen', 'te gaan', 'Emergency fund']}),
  c('goals-nl-ver', 'goals', 'nl', 'Hoe ver ben ik met mijn doelen?', {reply: 'answer', includes: ['actieve doelen']}),
  c('goals-nl-staan', 'goals', 'nl', 'Hoe staan mijn doelen ervoor?', {reply: 'answer', includes: ['actieve doelen']}),
  // ---- Due today: habits open, tasks due or overdue, the agenda's other plans ----
  c('due-what', 'due-today', 'en', 'What is due today?', {reply: 'answer', includes: ['Habits still open', 'Book the dentist', 'Sketch the garden bed'], tools: ['habits_due', 'tasks', 'agenda']}),
  c('due-whats', 'due-today', 'en', 'What\'s due today?', {reply: 'answer', includes: ['Tasks due today']}),
  c('due-have-to', 'due-today', 'en', 'What do I have to do today?', {reply: 'answer', includes: ['Habits still open']}),
  c('due-left', 'due-today', 'en', 'What\'s left for today?', {reply: 'answer', includes: ['Habits still open']}),
  c('due-plate', 'due-today', 'en', 'What\'s on my plate today?', {reply: 'answer', includes: ['Habits still open']}),
  c('due-anything', 'due-today', 'en', 'Anything due today?', {reply: 'answer', includes: ['Book the dentist']}),
  c('due-nl-moet', 'due-today', 'nl', 'Wat moet ik vandaag doen?', {reply: 'answer', includes: ['Gewoontes nog open', 'Taken voor vandaag']}),
  c('due-nl-staat', 'due-today', 'nl', 'Wat staat er vandaag op de planning?', {reply: 'answer', includes: ['Vandaag']}),
  // ---- Sleep: with Health shared and NOVA's Health on; otherwise why not, and NOVA → Permissions ----
  c('sleep-did', 'sleep', 'en', 'How did I sleep?', {reply: 'answer', includes: ['nights logged'], tools: ['sleep_summary']}),
  c('sleep-week', 'sleep', 'en', 'How did I sleep this week?', {reply: 'answer', tools: ['sleep_nights']}),
  c('sleep-was', 'sleep', 'en', 'How was my sleep?', {reply: 'answer', includes: ['Over the last 7 days', 'not medical advice']}),
  c('sleep-been', 'sleep', 'en', 'How have I been sleeping?', {reply: 'answer', includes: ['Over the last 7 days']}),
  c('sleep-nl', 'sleep', 'nl', 'Hoe heb ik deze week geslapen?', {reply: 'answer', includes: ['De afgelopen 7 dagen', 'geen medisch advies']}),
  c('sleep-nl-night', 'sleep', 'nl', 'Hoe heb ik vannacht geslapen?', {reply: 'answer', includes: ['Afgelopen nacht']}),
  c('sleep-scope-off', 'sleep', 'en', 'How did I sleep?', {reply: 'refusal', includes: ['Health is off for NOVA', 'NOVA → Permissions'], excludes: ['Settings → ZIGi', 'with ZIGi']}, 'scope-off'),
  c('sleep-scope-off-was', 'sleep', 'en', 'How was my sleep?', {reply: 'refusal', includes: ['NOVA → Permissions']}, 'scope-off'),
  c('sleep-gate-off', 'sleep', 'en', 'How did I sleep last night?', {reply: 'refusal', includes: ['Health sharing is off on this device', 'Include Health', 'NOVA → Permissions'], excludes: ['Settings → ZIGi']}, 'gate-off'),
  c('sleep-nl-scope-off', 'sleep', 'nl', 'Hoe heb ik geslapen?', {reply: 'refusal', includes: ['Health staat uit voor NOVA', 'NOVA → Permissions']}, 'scope-off'),
  // ---- The week: the agenda ----
  c('week-agenda', 'week', 'en', 'What\'s on my agenda this week?', {reply: 'answer', includes: ['On your agenda this week']}),
  c('week-look', 'week', 'en', 'What does my week look like?', {reply: 'answer', includes: ['On your agenda this week']}),
  c('week-have', 'week', 'en', 'What do I have this week?', {reply: 'answer', includes: ['On your agenda this week']}),
  c('week-tomorrow', 'week', 'en', 'What do I have tomorrow?', {reply: 'answer', includes: ['On your agenda tomorrow']}),
  c('week-coming', 'week', 'en', 'What\'s coming up this week?', {reply: 'answer', includes: ['agenda']}),
  // ---- Habits left today ----
  c('habits-how-many', 'habits-left', 'en', 'How many habits are left today?', {reply: 'answer', includes: ['3 habits left today', 'Exercise: 15 of 30 minutes'], tools: ['habits_due']}),
  c('habits-what-left', 'habits-left', 'en', 'What habits do I have left today?', {reply: 'answer', includes: ['left today'], excludes: ['Every day']}),
  c('habits-which-open', 'habits-left', 'en', 'Which habits are still open today?', {reply: 'answer', includes: ['Exercise']}),
  c('habits-left-bare', 'habits-left', 'en', 'Habits left?', {reply: 'answer', includes: ['left today']}),
  c('habits-nl', 'habits-left', 'nl', 'Welke gewoontes staan vandaag nog open?', {reply: 'answer', includes: ['nog open vandaag', 'Exercise: 15 van 30']}),
  c('habits-nl-hoeveel', 'habits-left', 'nl', 'Hoeveel gewoontes zijn er nog te doen?', {reply: 'answer', includes: ['nog open vandaag']}),
  // ---- Water to go ----
  c('water-to-go', 'water', 'en', 'How much water to go?', {reply: 'answer', includes: ['to go today', 'logged'], tools: ['water']}),
  c('water-more', 'water', 'en', 'How much more water do I need today?', {reply: 'answer', includes: ['to go today']}),
  c('water-left', 'water', 'en', 'How much water is left for today?', {reply: 'answer', includes: ['to go today']}),
  c('water-scope-off', 'water', 'en', 'How much water to go?', {reply: 'refusal', includes: ['NOVA → Permissions']}, 'scope-off'),
  // ---- Tasks due ----
  c('tasks-due', 'tasks', 'en', 'Tasks due today?', {reply: 'answer', includes: ['due today', 'Book the dentist'], tools: ['tasks']}),
  c('tasks-which', 'tasks', 'en', 'Which tasks are due?', {reply: 'answer', includes: ['Book the dentist']}),
  c('tasks-any', 'tasks', 'en', 'Any tasks overdue?', {reply: 'answer', includes: ['overdue']}),
  // ---- The day: the brief ----
  c('day-look', 'day', 'en', 'What does my day look like?', {reply: 'answer', includes: ['no AI used']}),
  c('day-next', 'day', 'en', 'What\'s next?', {reply: 'answer', includes: ['no AI used']}),
  c('day-nl', 'day', 'nl', 'Hoe ziet mijn dag eruit?', {reply: 'answer'}),
  // ---- Not answered here: advice, plans and a change go to the person's AI ----
  c('not-advice-goals', 'not-here', 'en', 'Which of my goals should I fund first?', {reply: 'none'}),
  c('not-why-sleep', 'not-here', 'en', 'Why did I sleep badly?', {reply: 'none'}),
  c('not-and-log', 'not-here', 'en', 'How much water to go, and log one more glass', {reply: 'none'}),
  c('not-plan', 'not-here', 'en', 'Plan my week', {reply: 'none'}),
  c('not-nl-advies', 'not-here', 'nl', 'Welk doel zou ik eerst moeten vullen?', {reply: 'none'}),
];
