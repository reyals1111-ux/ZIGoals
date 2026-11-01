import {describe, expect, test} from 'vitest';
import {emptyHabitData, type HabitData} from '../../habits';
import {createEmptyHealth, healthSchema} from '../../health';
import {emptyPlatform} from '../../positions';
import {readDeviceRecord} from '../../device-record';
import {parseReply} from '../../ai/actions/parse';
import {toolEnv, type ToolSources} from '../../ai/tools/env';
import {gatesFor, showcaseSources} from '../../ai/tools/fixtures';
import {scopedEnv, ALL_SCOPES} from '../briefs';
import {WORKFLOW_IDS, WORKFLOW_TEMPLATES, templateOf} from './templates';
import {acceptWords, collectRun, deviceWords, WORKFLOW_SYSTEM, type ModelAsk, type RunEvent} from './run';
import {NOVA_WORKFLOWS, NOVA_WORKFLOWS_KEY, MAX_CUSTOM, deleteCustom, editProblem, emptyNovaWorkflows, importSetupWorkflows, importWorkflows, noteRun, resolveWorkflow, restoreCustom, saveCustom, setTaskModel, setupChecks, shareWorkflows, taskModel, workflowsFile, workflowsForSetupShare} from './schema';
import {goalNameFrom, propose, weekAdjustments} from './proposers';
import {readStep} from './readers';

// Session AK (owner follow-up 2, N6): NOVA's workflows on the fictional Showcase records, with a MOCK model.
const DAY = '2026-10-05';
const sources = (extra: Partial<ToolSources> = {}, health = true, purpose: 'local' | 'provider' = 'local') => ({env: toolEnv(showcaseSources(DAY, extra), gatesFor(health), purpose)});
const emptySources = () => sources({habits: {...emptyHabitData(), timeZone: 'UTC'} as HabitData, health: healthSchema.parse({...createEmptyHealth(), schemaVersion: 4}), platform: emptyPlatform(), fasting: {version: 1, sessions: []}, weekly: null, moneyLog: null, journal: null, energy: null, accounts: null, chess: null, checklist: null, notes: null});
const steps = (events: RunEvent[]) => events.filter((e): e is Extract<RunEvent, {type: 'step'}> => e.type === 'step' && e.state !== 'running');
const cardsOf = (events: RunEvent[]) => events.find((e): e is Extract<RunEvent, {type: 'cards'}> => e.type === 'cards') ?? null;
const wordsOf = (events: RunEvent[]) => events.find((e): e is Extract<RunEvent, {type: 'words'}> => e.type === 'words')!;
/** A MOCK model that answers with the first records it was given, word for word (so every number is one of theirs). */
const echo: ModelAsk = async ({user}) => `Here is what I see. ${user.split('\n').filter(l => l.startsWith('- ')).slice(0, 2).map(l => l.slice(2)).join(' ')}`;

describe('the eight templates', () => {
  test('eight templates, unique ids, each reads first, words before cards, calm titles', () => {
    expect(WORKFLOW_TEMPLATES.map(t => t.id)).toEqual([...WORKFLOW_IDS]);
    for (const t of WORKFLOW_TEMPLATES) {
      expect(t.steps[0]!.kind).toBe('read');
      const kinds = t.steps.map(s => s.kind);
      expect(kinds.lastIndexOf('read')).toBeLessThan(kinds.indexOf('words'));
      if (kinds.includes('propose')) expect(kinds.indexOf('words')).toBeLessThan(kinds.indexOf('propose'));
      expect(`${t.title} ${t.blurb} ${t.instruction}`).not.toMatch(/!/);
    }
  });
  test.each(WORKFLOW_IDS.map(id => [id]))('%s runs every step on the Showcase without a model; every card is one the engine accepts', async id => {
    const events = await collectRun(templateOf(id), {local: sources()});
    const done = steps(events);
    expect(done.map(s => s.id)).toEqual(templateOf(id).steps.map(s => s.id));
    expect(wordsOf(events).by).toBe('device');
    expect(events.at(-1)!.type).toBe('done');
    const cards = cardsOf(events);
    if (cards) {
      const parsed = parseReply(cards.text);
      expect(parsed.rejected).toEqual([]);
      expect(parsed.proposals.length).toBe(cards.count);
    }
  });
  test.each(WORKFLOW_IDS.map(id => [id]))('%s on an empty start: every reading says why it found nothing; no card invents a record', async id => {
    const events = await collectRun(templateOf(id), {local: emptySources()});
    for (const s of steps(events).filter(s => templateOf(id).steps.find(t => t.id === s.id)!.kind === 'read')) {
      expect(['skipped', 'done']).toContain(s.state);
      if (s.state === 'skipped') expect(s.note).toBeTruthy();
    }
    const cards = cardsOf(events);
    if (cards) for (const p of parseReply(cards.text).proposals) expect(['open-page', 'open-review']).toContain(p.kind);
  });
  test('with a MOCK model: the words come from the model, from the SENDING records, with NOVA\'s system prompt', async () => {
    const seen: {system: string; user: string}[] = [];
    const model: ModelAsk = async input => { seen.push(input); return echo(input); };
    const events = await collectRun(templateOf('review-week'), {local: sources(), send: sources({}, false, 'provider'), model});
    expect(wordsOf(events).by).toBe('model');
    expect(seen).toHaveLength(1); expect(seen[0]!.system).toBe(WORKFLOW_SYSTEM);
    // Health is closed on the sending path: no sleep line reaches the model, while the device still shows it.
    expect(seen[0]!.user).not.toMatch(/^- Sleep:/m);
    const local = steps(events).find(s => s.id === 'week-sleep')!;
    expect(local.state === 'done' ? local.facts!.join(' ') : local.note).toBeTruthy();
  });
  test('a model that adds a number, fails, or sends a card block: NOVA\'s own words, never a card from the model', async () => {
    const liar: ModelAsk = async () => 'You walked 999 km this week.';
    const words = wordsOf(await collectRun(templateOf('money-month'), {local: sources(), send: sources({}, true, 'provider'), model: liar}));
    expect(words.by).toBe('device');
    const failing: ModelAsk = async () => { throw new Error('local-unreachable'); };
    const failed = await collectRun(templateOf('money-month'), {local: sources(), send: sources({}, true, 'provider'), model: failing});
    expect(steps(failed).find(s => s.id === 'words')!.state).toBe('failed'); expect(wordsOf(failed).by).toBe('device');
    expect(acceptWords(['Food: 12.50 EUR.'], '', 'Food came to 12.50 EUR.\n```zigoals-action\n{"kind":"log-water","amount_ml":999}\n```')).toBe('Food came to 12.50 EUR.');
    expect(acceptWords(['a'], '', '')).toBeNull();
  });
  test('the journal reaches a model only with journal sharing on', async () => {
    const local = sources();
    const off = readStep('journal-latest', sources({}, true, 'provider'), true).facts.join(' ');
    expect(off).toMatch(/journal sharing is off/);
    const entry = local.env.journal!.entries.at(-1)!;
    expect(off).not.toContain(entry.text.slice(0, 30));
    const on = sources({journal: {...local.env.journal!, shareWithAi: true}}, true, 'provider');
    expect(readStep('journal-latest', on, true).facts.join(' ')).toMatch(/Latest journal entry \(/);
  });
  test('scopes: a pillar closed in Permissions is not read, and its cards are not proposed', async () => {
    const env = scopedEnv(sources().env, {...ALL_SCOPES, wealth: false, health: false});
    expect(readStep('money-month', {env}).empty).toMatch(/Wealth is not shared/);
    expect(readStep('week-sleep', {env}).empty).toMatch(/Health is not shared/);
    expect(propose('meals-plan', {env}).actions).toEqual([]);
  });
  test('the proposals: next week\'s intention, a goal draft with habits, dinners from the person\'s own recipes', () => {
    const s = sources();
    const adjustments = weekAdjustments(s);
    expect(adjustments.length).toBeGreaterThan(0); expect(adjustments.length).toBeLessThanOrEqual(3);
    expect(propose('review-intention', s).actions[0]).toMatchObject({kind: 'review-intention'});
    const journal = propose('journal-goal', sources({journal: {version: 1, entries: [{id: 'j1', date: DAY, text: 'I want to run a half marathon next spring. Work was stressful today.', createdAt: `${DAY}T08:00:00.000Z`}], shareWithAi: false, followUps: true}}));
    expect(journal.actions.map(a => a.kind)).toEqual(['create-goal', 'create-habit', 'create-habit']);
    expect(journal.actions[0]).toMatchObject({name: 'I want to run a half marathon next spring', type: 'PROJECT'});
    const meals = propose('meals-plan', s);
    if (s.env.health!.recipes.length) for (const a of meals.actions.filter(a => a.kind === 'plan-meal')) expect(s.env.health!.recipes.map(r => r.name)).toContain(a.recipe_name);
    expect(goalNameFrom('x '.repeat(80)).length).toBeLessThanOrEqual(61);
  });
  test('device words list the facts; nothing found says so', () => {
    expect(deviceWords(['A.', 'B.'])).toBe('• A.\n• B.');
    expect(deviceWords([])).toMatch(/Nothing in your records/);
  });
});

describe('custom workflows', () => {
  const NOW = new Date('2026-10-05T10:00:00Z');
  test('save, edit, resolve, delete with undo; at most 30; edits checked', () => {
    let record = saveCustom(emptyNovaWorkflows(), 'review-week', {title: 'My Sunday review', instruction: 'Keep it to two lines.', skip: ['week-money']}, NOW);
    const own = record.custom![0]!;
    expect(own).toMatchObject({from: 'review-week', title: 'My Sunday review', skip: ['week-money']});
    const def = resolveWorkflow(own);
    expect(def.steps.map(s => s.id)).not.toContain('week-money'); expect(def.instruction).toBe('Keep it to two lines.'); expect(def.customId).toBe(own.id);
    record = saveCustom(record, 'review-week', {title: 'Sunday review', instruction: '', skip: []}, new Date('2026-10-06T10:00:00Z'), own.id);
    expect(record.custom).toHaveLength(1); expect(record.custom![0]!.title).toBe('Sunday review'); expect(resolveWorkflow(record.custom![0]!).instruction).toBe(templateOf('review-week').instruction);
    const removed = deleteCustom(record, own.id); expect(removed.custom).toEqual([]);
    expect(restoreCustom(removed, record.custom![0]!).custom).toHaveLength(1);
    expect(editProblem('money-month', {title: 'x', instruction: '', skip: ['money-month']})).toMatch(/at least one step/);
    expect(editProblem('money-month', {title: ' ', instruction: '', skip: []})).toMatch(/name/);
    expect(editProblem('money-month', {title: 'Mine', instruction: 'my key is sk-abcdefghijklmnopqrstuvwxyz123', skip: []})).toMatch(/key/);
    let full = emptyNovaWorkflows();
    for (let i = 0; i < MAX_CUSTOM; i++) full = saveCustom(full, 'money-month', {title: `Money ${String.fromCharCode(97 + (i % 26))}${i}`, instruction: '', skip: []}, new Date(NOW.getTime() + i));
    expect(() => saveCustom(full, 'money-month', {title: 'One more', instruction: '', skip: []}, NOW)).toThrow(/30/);
  });
  test('the export and the shared setup hold no personal data: personal words fall back to the template\'s', () => {
    let record = saveCustom(emptyNovaWorkflows(), 'money-checkin', {title: 'Check-in for jane@example.com', instruction: 'Compare with account 123456789.', skip: []}, NOW);
    record = saveCustom(record, 'sleep-factors', {title: 'Sleep questions', instruction: 'Short, please.', skip: ['week-sleep']}, NOW);
    record = noteRun(setTaskModel(record, 'local', 'workflows', 'llama3.2'), 'review-week', NOW);
    const shared = shareWorkflows(record);
    expect(shared.heldBack).toBe(2);
    expect(shared.workflows).toEqual([
      {from: 'money-checkin', title: templateOf('money-checkin').title, instruction: templateOf('money-checkin').instruction, skip: []},
      {from: 'sleep-factors', title: 'Sleep questions', instruction: 'Short, please.', skip: ['week-sleep']},
    ]);
    const file = workflowsFile(record, NOW);
    expect(file).not.toMatch(/jane|123456789|llama|review-week|wf_|createdAt/);
    expect(JSON.parse(file)).toMatchObject({format: 'zigoals-nova-workflows', version: 1});
    const back = importWorkflows(emptyNovaWorkflows(), JSON.parse(file), NOW);
    expect(back.added).toBe(2); expect(back.refused).toBe(0);
    expect(importWorkflows(emptyNovaWorkflows(), {workflows: [{from: 'nope', title: 'x', instruction: '', skip: []}, {from: 'money-month', title: 'a@b.c', instruction: '', skip: []}]}, NOW)).toMatchObject({added: 0, refused: 2});
    expect(importWorkflows(emptyNovaWorkflows(), 'junk', NOW).added).toBe(0);
  });
  test('runs, the setup checks and the model per task; the record reads back and keeps unknown fields', () => {
    let record = emptyNovaWorkflows();
    expect(setupChecks(record)).toEqual({ranReview: false, savedOwn: false});
    record = noteRun(record, 'review-week', NOW);
    record = saveCustom(record, 'review-week', {title: 'Mine', instruction: '', skip: []}, NOW);
    expect(setupChecks(record)).toEqual({ranReview: true, savedOwn: true});
    record = setTaskModel(record, 'openai', 'briefs', 'gpt-mini');
    expect(taskModel(record, 'openai', 'briefs')).toBe('gpt-mini'); expect(taskModel(record, 'anthropic', 'briefs')).toBeNull(); expect(taskModel(record, 'openai', 'workflows')).toBeNull();
    record = setTaskModel(record, 'anthropic', 'workflows', 'claude-haiku-5-5');
    expect(record.taskModels).toEqual({provider: 'anthropic', workflows: 'claude-haiku-5-5'});
    expect(setTaskModel(record, 'anthropic', 'workflows', null).taskModels).toEqual({provider: 'anthropic'});
    for (let i = 0; i < 50; i++) record = noteRun(record, `wf_x-${i}`, new Date(NOW.getTime() + i * 1000));
    expect(Object.keys(record.runs!)).toHaveLength(40);
    const map = new Map([[NOVA_WORKFLOWS_KEY, JSON.stringify({...record, later: 1})]]);
    const read = readDeviceRecord({getItem: k => map.get(k) ?? null}, NOVA_WORKFLOWS);
    expect(read.unreadable).toBe(false); expect((read.data as Record<string, unknown>).later).toBe(1);
  });
});

test('the setup share shape: template id first, kept steps after, no instruction; it reads back', () => {
  const NOW = new Date('2026-10-05T10:00:00Z');
  const record = saveCustom(emptyNovaWorkflows(), 'review-week', {title: 'Weekly look', instruction: 'Private words here.', skip: ['week-money']}, NOW);
  const list = workflowsForSetupShare(record);
  expect(list).toEqual([{title: 'Weekly look', steps: ['review-week', 'week-habits', 'week-goals', 'week-sleep', 'words', 'cards']}]);
  expect(JSON.stringify(list)).not.toMatch(/Private words/);
  const back = importSetupWorkflows(emptyNovaWorkflows(), list, NOW);
  expect(back.added).toBe(1); expect(back.record.custom![0]).toMatchObject({from: 'review-week', title: 'Weekly look', skip: ['week-money']});
  expect(importSetupWorkflows(emptyNovaWorkflows(), [{title: 'x', steps: ['nope']}], NOW)).toMatchObject({added: 0, refused: 1});
});

test('the Showcase examples: labelled, valid in their records, one own workflow already run, one pinned memory', async () => {
  const {showcaseNovaWorkflows, showcaseNovaMemory} = await import('./showcase');
  const {aiMemorySchema} = await import('../../ai/store/records');
  const {memoryGroups} = await import('../../ai/memory');
  const wf = showcaseNovaWorkflows('2026-10-05');
  expect(setupChecks(wf)).toEqual({ranReview: true, savedOwn: true});
  expect(wf.custom![0]!.title).toMatch(/\(Showcase\)$/);
  const mem = aiMemorySchema.parse(showcaseNovaMemory('2026-10-05'));
  expect(mem.notes!.every(n => n.text.endsWith('(Showcase)'))).toBe(true);
  expect(memoryGroups(mem.notes!).map(g => g.id)).toEqual(['pinned', 'decision', 'person', 'context']);
});

describe('Clear my notes inbox: file-note cards through the one engine', () => {
  const at = '2026-10-05T08:00:00.000Z';
  const notes = {version: 1 as const, voice: false, notes: [
    {id: 'n-goal', kind: 'inbox' as const, title: '', body: 'Idea for the emergency fund: round up', createdAt: at},
    {id: 'n-habit', kind: 'inbox' as const, title: 'Meditate', body: 'try the body scan', createdAt: at},
    {id: 'n-day', kind: 'inbox' as const, title: '', body: 'Lovely walk by the river', day: '2026-10-04', createdAt: at},
    {id: 'n-topic', kind: 'inbox' as const, title: 'Books to read', body: 'Dune', createdAt: at},
    {id: 'n-empty', kind: 'inbox' as const, title: '', body: '', createdAt: at},
  ]};
  const all = {today: true, goals: true, habits: true, health: false, wealth: true, notes: true, journal: true, earn: true};
  test('each inbox note gets a card: beside the goal or habit it names, else its day, else a topic; the engine accepts them all', async () => {
    const s = {...sources(), notes, scopes: all};
    const events = await collectRun(templateOf('notes-inbox'), {local: s});
    expect(steps(events).find(x => x.id === 'notes-inbox')!.facts![0]).toBe('Notes in your inbox: 5.');
    const cards = cardsOf(events)!, parsed = parseReply(cards.text);
    expect(parsed.rejected).toEqual([]);
    expect(parsed.proposals.map(p => ({...p}))).toEqual([
      {kind: 'file-note', note: 'n-goal', to: 'goal', name: 'Emergency fund'},
      {kind: 'file-note', note: 'n-habit', to: 'habit', name: 'Meditate'},
      {kind: 'file-note', note: 'n-day', to: 'daily', day: '2026-10-04'},
      {kind: 'file-note', note: 'n-topic', to: 'topic', title: 'Books to read'},
      {kind: 'file-note', note: 'n-empty', to: 'topic', title: 'Inbox note'},
    ]);
  });
  test('Notes and the Journal closed in Permissions (the defaults): nothing read, no card, said plainly', async () => {
    const closed = {...all, notes: false, journal: false};
    const events = await collectRun(templateOf('notes-inbox'), {local: {...sources(), notes, scopes: closed}});
    expect(steps(events).find(x => x.id === 'notes-inbox')).toMatchObject({state: 'skipped', note: 'Notes is not shared with NOVA (Permissions).'});
    expect(cardsOf(events)).toBeNull();
    const journal = await collectRun(templateOf('journal-to-goal'), {local: {...sources(), scopes: closed}});
    expect(steps(journal).find(x => x.id === 'journal-latest')!.note).toMatch(/journal is not shared/i);
    expect(cardsOf(journal)).toBeNull();
  });
});
