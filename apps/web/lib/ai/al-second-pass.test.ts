import {describe, expect, test} from 'vitest';
import {assistantWords, errorSteps, AiError} from './errors';
import {guardMessage} from './safety-guard';
import {memoryCategory, fixTypos, rewriteQuestion} from './local-answers/al-more';
import {amount} from './local-answers/words';
import {goalQty, HEALTH_CLOSED} from './tools/format';
import {runTool} from './tools/registry';
import {toolEnv} from './tools/env';
import {gatesFor, showcaseSources} from './tools/fixtures';
import {localAnswer} from './local-answers/engine';
import {noModelReply} from './local-answers/no-model';
import {emptyTasks} from '../tasks/schema';
import {addTask} from '../tasks/engine';
import {showcaseCheck} from '../nova/setup';
import {suggestCommands} from './slash';
import {recognitionErrorText} from './voice';

// Session AL second pass (lane L7): the deterministic parts of this pass, one line each to the finding they close.
const env = (over = {}) => toolEnv(showcaseSources(undefined, over), gatesFor(true), 'local');
const textOf = (q: string, e = env()) => { const l = localAnswer(q, e), r = l.kind === 'none' ? noModelReply(q, e) : l; return 'text' in r ? r.text : ''; };

describe('words', () => {
  test('BN-047/P-BN-09: NOVA\'s errors say NOVA and point to NOVA\'s own settings', () => {
    expect(assistantWords('What arrived is kept above; ask ZIGi to continue.', 'NOVA')).toBe('What arrived is kept above; ask NOVA to continue.');
    expect(assistantWords('Open Settings → Your assistant → ZIGi · Your Personal AI Companion and paste the key again.', 'NOVA')).toBe('Open NOVA → Models (or NOVA → Build NOVA’s brain) and paste the key again.');
    expect(assistantWords('ask ZIGi', 'ZIGi')).toBe('ask ZIGi');
    const steps = errorSteps(new AiError('model-missing', 'x'), {providerName: 'Ollama', hostedPage: false, keysUrl: null, assistant: 'NOVA'});
    expect(steps[0]).toBe('Choose another model in NOVA → Models.');
    expect(errorSteps(new AiError('stalled', 'x'), {providerName: 'Ollama', hostedPage: false, keysUrl: null, local: {server: 'ollama', baseUrl: 'http://127.0.0.1:11434'}})[0]).toContain('A Retry is usually quicker');
  });
  test('MO-052/P-MO-12: the Health refusal names both switches and no longer says "with Health on Today"', () => {
    expect(HEALTH_CLOSED).toMatch(/^Health isn’t shared with ZIGi — turn it on in Settings/);
    expect(HEALTH_CLOSED).toContain('“Health page data” and “Include Health”');
    expect(HEALTH_CLOSED).not.toContain('with Health on Today');
  });
  test('LA-015/P-LA-27: no microphone says what to do next', () => expect(recognitionErrorText('audio-capture')).toBe('No microphone was found: type instead.'));
  test('X3-07/P-PR-78: "/" lists /recap with the rest; "/r" stays /review and /remember', () => {
    expect(suggestCommands('/').map(c => c.name)).toContain('/recap');
    expect(suggestCommands('/r').map(c => c.name)).toEqual(['/review', '/remember']);
  });
  test('PR-028/P-PR-13: a Showcase check is labelled as one', () => {
    expect(showcaseCheck({ok: true, note: 'A brief was made.'}).note).toBe('Showcase example (fictional records): A brief was made.');
    expect(showcaseCheck({ok: true, note: 'Showcase example: as before'}).note).toBe('Showcase example: as before');
  });
});

describe('DV-014 (L4\'s request): a count goal reads in its own word', () => {
  test('goalQty and the answers\' amount', () => {
    expect(goalQty('20', 'BOOKS')).toBe('20 books'); expect(goalQty('1', 'books')).toBe('1 book');
    expect(goalQty('500', 'USD')).toBe('500 USD'); expect(goalQty('0.5', 'BTC')).toBe('0.5 BTC');
    expect(amount('20', 'BOOKS')).toBe('20 books'); expect(amount('1500', 'USD')).toBe('1,500.00 USD');
  });
});

describe('safety (P-LA-01)', () => {
  test.each(['I want to hurt someone', 'how do i hack my neighbour\'s wifi', 'Ik wil iemand pijn doen'])('"%s" gets the fixed refusal, never a model', q => {
    const g = guardMessage(q);
    expect(g?.topic).toBe('harm'); expect(g?.text).toMatch(/112/);
  });
  test.each(['I want to hurt my back less when I run', 'How do I hack my morning routine?', 'help me attack this week\'s goals'])('"%s" is not guarded', q => expect(guardMessage(q)?.topic).not.toBe('harm'));
});

describe('the no-model path (P-DV-86, P-LA-17, P-MO-101)', () => {
  test('typos are fixed in the routing words only', () => {
    expect(fixTypos('waht are my goasl')).toBe('what are my goals');
    expect(fixTypos('Hoeveel water heb ik')).toBe('Hoeveel water heb ik');
  });
  test('loose wordings are asked again in the device\'s words', () => {
    expect(rewriteQuestion('Is my Japan goal on track?')).toBe('How far am I on my Japan goal?');
    expect(rewriteQuestion('what\'s my streak')).toBe('What is my longest streak?');
    expect(rewriteQuestion('What should I focus on today?')).toBe('What is due today?');
    expect(rewriteQuestion('Log 2 glasses')).toBeNull();
  });
  test.each([
    ['I am allergic to peanuts', 'diet'], ['I get paid on the 25th', 'schedule'], ['I prefer morning workouts', 'preferences'],
    ['I can\'t train on Sundays', 'constraints'], ['My doctor said to watch my blood pressure', 'health'], ['My dog is called Max', 'other'],
  ])('MO-101: "%s" is proposed as %s', (note, category) => expect(memoryCategory(note)).toBe(category));
  test('Z-068/P-DVR-49: a question one of the person\'s notes answers is answered from it', () => {
    const e = env({notes: [{text: 'I get paid on the 25th of each month', category: 'schedule'}]});
    expect(textOf('When do I get paid?', e)).toBe('From what you asked me to remember: “I get paid on the 25th of each month”.');
  });
  test('NB-105/P-NB-60: "portfolio worth" names Wealth\'s totals, labelled', () => {
    expect(textOf('What is my portfolio worth?')).toMatch(/Your holdings in Wealth add up to [\d,.]+ USD/);
  });
  test('TK-071/P-TK-31: a net worth of a billion or more carries a note that it may hold a typing slip', () => {
    const base = showcaseSources(), loan = base.accounts!.items.find(a => a.kind === 'loan')!;
    const huge = {...loan, id: '9b2f5c1e-0d8a-4b8e-9a51-000000000001', name: 'Huge debt', currency: 'EUR', snapshots: [{id: '9b2f5c1e-0d8a-4b8e-9a51-000000000002', date: loan.snapshots[0]!.date, value: '99999999999999', decimals: 2}], payments: []};
    const t = textOf('What is my net worth?', env({accounts: {...base.accounts!, items: [...base.accounts!.items, huge]}} as never));
    expect(t).toMatch(/net worth is .*-[\d,.]+ EUR/);
    expect(t).toContain('A total of a billion or more: if a balance or a debt was typed with extra digits, correct it in Wealth → Accounts, debts & net worth.');
    expect(textOf('What is my net worth?')).not.toContain('A total of a billion or more');
  });
});

describe('tasks and the agenda (L5\'s requests; LA-021, LA-022, P-LA-13, P-LA-14)', () => {
  test('the agenda answer lists the person\'s tasks with their time and priority', () => {
    const day = showcaseSources().now?.toISOString?.().slice(0, 10) ?? '2026-10-05';
    let tasks = addTask(emptyTasks(), {title: 'Pick up parcel', due: day, time: '18:00'}, {id: 'task_1', at: new Date(`${day}T08:00:00Z`), today: day});
    tasks = addTask(tasks, {title: 'Team dinner', due: day, time: '19:30', priority: 'low'}, {id: 'task_2', at: new Date(`${day}T08:00:00Z`), today: day});
    const e = env({nova: {tasks}} as never), r = runTool('agenda', {days: 1}, e);
    expect(r.ok).toBe(true);
    const items = (r as unknown as {data: {items: {what: string; kind: string; time?: string}[]}}).data.items;
    expect(items).toEqual(expect.arrayContaining([expect.objectContaining({what: 'Pick up parcel', kind: 'task', time: '18:00'}), expect.objectContaining({what: 'Team dinner', kind: 'task, low priority', time: '19:30'})]));
  });
});
import {composeBrief} from '../nova/briefs';
test('DV-077/P-DV-101: NOVA\'s morning brief carries one goal line from the Goals page\'s own figures, in calm words', () => {
  const e = env(), brief = composeBrief('morning', e.habitDay, e)!, goal = brief.sections?.find(s => s.id === 'goal');
  expect(goal?.text).toMatch(/^(?:.+ can catch up with its plan|Next planned step: .+ on .+)/);
  expect(goal?.text).not.toMatch(/\bbehind\b/);
});
import {buildNovaPack, PILLAR_SCOPE} from './context-pack/nova';
test('BN-041/BN-052/P-BN-13: a governance question carries no records; a medicine question only Health; any other question every pillar', () => {
  const sources = showcaseSources(), gates = gatesFor(true);
  const input = {sources, gates, scopes: {today: true, goals: true, habits: true, health: true, wealth: true, notes: false, journal: false, earn: true}, chainChosen: true, privacy: {mode: 'relaxed' as const, redactForSend: (t: string) => t}};
  const gov = buildNovaPack({...input, question: 'How long is the voting period for proposal 45?'});
  expect(gov.included).toEqual([]); expect(gov.text).toContain('Governance is not in NOVA\'s records');
  const med = buildNovaPack({...input, question: 'Should I take creatine with my supplements?'});
  expect(med.included.every(p => PILLAR_SCOPE[p] === 'health')).toBe(true); expect(med.included).not.toContain('habits');
  const all = buildNovaPack({...input, question: 'How was my week?'});
  expect(all.included).toContain('habits'); expect(all.included).toContain('goals');
});
import {examplesFor} from './local-answers/examples';
import {emptyHabitData, type HabitData} from '../habits';
import {emptyPlatform} from '../positions';
test('LZ-008/P-LA-32: with Health closed no example needs Health', () => {
  const closed = toolEnv(showcaseSources(undefined, {habits: {...emptyHabitData(), timeZone: 'UTC'} as HabitData, platform: emptyPlatform()}), gatesFor(false), 'local');
  expect(examplesFor(closed).join(' ')).not.toMatch(/meditate|water|steps|protein|eat/i);
});
