import type {ProposerId} from './proposers';
import type {ReaderId} from './readers';

/**
 * NOVA's workflow templates (Session AK, owner follow-up 2 N6): eight editable recipes, each a short list of steps the
 * person watches run — on-device readings of their own records, then (with a model connected) the words, then the cards
 * to confirm. The steps are fixed per template (a step can be left out); the title and the instruction to the model are
 * the person's to edit, and an edited template can be saved as their own workflow (schema.ts).
 */
export const WORKFLOW_IDS = ['review-week', 'journal-to-goal', 'meals-grocery', 'money-month', 'sleep-factors', 'money-checkin', 'focus-tomorrow', 'notes-inbox'] as const;
export type WorkflowId = (typeof WORKFLOW_IDS)[number];
export type WorkflowStep =
  | {id: string; kind: 'read'; reader: ReaderId; label: string}
  | {id: 'words'; kind: 'words'; label: string}
  | {id: 'cards'; kind: 'propose'; proposer: ProposerId; label: string};
export type WorkflowTemplate = {id: WorkflowId; title: string; blurb: string; instruction: string; steps: readonly WorkflowStep[]};
const words = (label = 'Put it into words'): WorkflowStep => ({id: 'words', kind: 'words', label});
const cards = (proposer: ProposerId, label: string): WorkflowStep => ({id: 'cards', kind: 'propose', proposer, label});
const read = (reader: ReaderId, label: string): WorkflowStep => ({id: reader, kind: 'read', reader, label});
export const WORKFLOW_TEMPLATES: readonly WorkflowTemplate[] = [
  {id: 'review-week', title: 'Review my week and suggest three adjustments', blurb: 'Your habits, goal steps, spending and sleep of the last seven days, then three adjustments to keep as the intention of your weekly review.',
    instruction: 'Summarise my week from these records in three short sentences, then suggest exactly three small adjustments for the days ahead, one line each. Use only these records.',
    steps: [read('week-habits', 'Read your habits of the last seven days'), read('week-goals', 'Read your goal steps'), read('week-money', 'Read your money log'), read('week-sleep', 'Read your sleep'), words(), cards('review-intention', 'Propose your weekly intention')]},
  {id: 'journal-to-goal', title: 'Turn this journal entry into a goal and habits', blurb: 'Your latest journal entry becomes a goal draft and up to two small habits, each a card you confirm or change.',
    instruction: 'From my latest journal entry, name one goal it points to and up to two small daily habits that would support it, in plain words. Use only what the entry says.',
    steps: [read('journal-latest', 'Read your latest journal entry'), words(), cards('journal-goal', 'Propose a goal and habits')]},
  {id: 'meals-grocery', title: 'Plan my meals and grocery list for next week', blurb: 'Dinners for the days not planned yet, from your own recipes, and the grocery list from their ingredients.',
    instruction: 'Describe next week\'s dinner plan and what the grocery list covers, in two or three short sentences. Use only these records.',
    steps: [read('meals-next-week', 'Read your meal plan and recipes'), words(), cards('meals-plan', 'Propose dinners and the grocery list')]},
  {id: 'money-month', title: 'Where did my money go this month?', blurb: 'This month\'s spending by category from your money log, in each currency as you logged it.',
    instruction: 'Explain where my money went this month in three short sentences, biggest categories first. Information only, no advice. Use only these records.',
    steps: [read('money-month', 'Read this month\'s money log'), words()]},
  {id: 'sleep-factors', title: 'What\'s affecting my sleep?', blurb: 'The Compare explorer\'s rules on your last 90 days: what went together with longer or shorter nights, never a cause.',
    instruction: 'Say in plain words which things went together with my sleep in these records, and remind me that this is not proof of a cause. No advice. Use only these records.',
    steps: [read('sleep-factors', 'Compare your nights with your days'), read('week-sleep', 'Read this week\'s sleep'), words()]},
  {id: 'money-checkin', title: 'Prepare my monthly money check-in', blurb: 'This month against last month, the room to spend, the bills of the next 30 days and your accounts, then the monthly review.',
    instruction: 'Prepare my monthly money check-in from these records: what changed from last month, what is due soon, and one question to ask myself. Information only, no advice.',
    steps: [read('money-checkin', 'Read this month and last'), read('bills-next', 'Read the bills due soon'), words(), cards('money-review', 'Offer the monthly review')]},
  {id: 'focus-tomorrow', title: 'Draft my focus plan for tomorrow', blurb: 'Tomorrow\'s habits, the goal steps coming up, your open tasks and this week\'s focus time, then focus blocks as tasks.',
    instruction: 'Draft a calm focus plan for tomorrow with at most three blocks, in order, from these records. Use only these records.',
    steps: [read('focus-tomorrow', 'Read tomorrow\'s habits and goal steps'), read('tasks-tomorrow', 'Read your open tasks'), words(), cards('focus-tasks', 'Propose focus blocks as tasks')]},
  {id: 'notes-inbox', title: 'Clear my notes inbox', blurb: 'Your captured notes, each with where it could go: the day it was captured or a topic of its own.',
    instruction: 'Suggest where each note in my inbox belongs, one line per note. Use only these notes.',
    steps: [read('notes-inbox', 'Read your notes inbox'), words(), cards('notes-file', 'Propose where each note goes')]},
];
export const templateOf = (id: WorkflowId): WorkflowTemplate => WORKFLOW_TEMPLATES.find(t => t.id === id)!;
