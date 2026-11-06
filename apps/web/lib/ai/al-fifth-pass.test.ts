import {beforeAll, describe, expect, test} from 'vitest';
import {loadAaPlanner} from './actions/plan';
import {quickAddOffered} from './actions/decline';
import {habitDraft} from './local-answers/ai-session';
import {germanAsk, messageLines, onePhrase, pastPeriodAsk, tooLongAdd} from './local-answers/al-fifth';
import {EXAMPLES_INTRO} from './local-answers/examples';
import {ADVICE_REPLIES} from './safety-guard';
import {checklistSchema, emptyChecklistDays} from '../checklist/schema';
import {TEXT_LIMITS} from '../limits/text';
import {taskSchema} from '../tasks/schema';
import {actionSchema} from './actions/schema';
import {showcaseSources, withG1, withPortfolios} from './tools/fixtures';
import type {ToolSources} from './tools/env';
import type {AverageGoal} from '../average-goals/store';
import {HID, denver, lisbon, novaEnv, typed, zigiEnv, L_DAY} from './evals/l7-fourth-fixtures';
beforeAll(() => loadAaPlanner());

/**
 * Session AL fifth pass (lane L7-5b): the answer rows GROK53_REPLAY_L7_2.md (on 37d2370c) still found open, one test per
 * id, in ZIGi's panel and NOVA's chat (one answer source), with no model, in the bots' own conditions (Lisbon's path at
 * 02:30 Brussels on Wed 4 Nov 2026, Denver's goals, the Showcase). The exact words each bot saw are the asks here.
 */
const both = (sources: ToolSources, ask: string, opts: {health?: boolean; previous?: string} = {}) => (['zigi', 'nova'] as const).map(surface => {
  const env = surface === 'zigi' ? zigiEnv(sources, {health: !!opts.health}) : novaEnv(sources, {health: !!opts.health});
  return {surface, ...typed(ask, env, opts.previous ?? null)};
});
const card = (text: string) => { const block = /```zigoals-action\n([\s\S]*?)\n```/.exec(text)?.[1]; return block ? JSON.parse(block) as Record<string, unknown> : null; };
const showcase = () => withG1(withPortfolios(showcaseSources(L_DAY)));
/** Lisbon's path with the person's own item "Floss teeth" in the morning orbit (own-b). */
function lisbonFloss(): ToolSources {
  const src = lisbon('L2'), items = [[HID.water, 'morning'], [HID.stretch, 'afternoon'], [HID.read, 'evening']] as const;
  const record = checklistSchema.parse({version: 1, items: [...items.map(([habitId, section], i) => ({id: `ck_${i}`, kind: 'habit', ref: {habitId}, section, addedAt: '2026-10-20T08:00:00.000Z'})), {id: 'ck_floss', kind: 'custom', label: 'Floss teeth', section: 'morning', addedAt: '2026-10-21T08:00:00.000Z'}], healthItems: [], order: ['ck_0', 'ck_floss', 'ck_1', 'ck_2']});
  return {...src, checklist: {record, days: emptyChecklistDays(), date: L_DAY, unreadable: false}};
}
/** Denver with the "Keep an average" goals the bot made from the template (Health not shared). */
function denverAverages(): ToolSources {
  const at = '2026-10-25T08:00:00.000Z', avg = (id: string, name: string): AverageGoal => ({id, name, metric: 'sleep-hours', unit: 'h a night', target: 7, direction: 'at-least', windowDays: 14, status: 'active', createdAt: at, entries: []} as AverageGoal);
  return {...denver(), averageGoals: [avg('dv-sleep-7', 'Sleep 7 hours a night'), avg('dv-sleep-avg', 'DV Sleep avg')]};
}

describe('Session AL fifth pass (L7-5b): the replay of 37d2370c, answers', () => {
  test('ZIGi #19 (Berlin): "Add a habit called Evening walk" is the habit "Evening walk", the time of day kept from the name', () => {
    for (const t of both(denver(), 'Add a habit called Evening walk')) {
      expect(card(t.text), t.surface).toMatchObject({kind: 'create-habit', title: 'Evening walk', timeOfDay: 'evening'});
      expect(t.text).toContain('A new habit, Evening walk.');
    }
    expect(habitDraft('Walk in the evening')).toMatchObject({title: 'Walk', timeOfDay: 'evening'});
    expect(habitDraft('Morning pages every day')).toMatchObject({title: 'Morning pages', schedule: 'daily', timeOfDay: 'morning'});
    expect(habitDraft('Read 20 pages daily 21:00')).toMatchObject({title: 'Read 20 pages', schedule: 'daily', timeOfDay: 'evening', at: '21:00'});
  });
  test('H7 (Nairobi): "Exercise last week" answers last week and offers no Save for today', () => {
    for (const t of both(showcase(), 'Exercise last week')) {
      expect(t.reply.kind, t.surface).toBe('answer');
      expect(t.text).toMatch(/^You checked in Exercise \d+ times? last week \(Mon, Oct 26 to Sun, Nov 1\)\./);
      expect(t.quickAdd, t.surface).toBe(false);
      expect(t.proposals).toEqual([]);
    }
    expect(quickAddOffered('Exercise last week')).toBe(false);
    expect(quickAddOffered('ran 5 km last month')).toBe(false);
    expect(quickAddOffered('Water vorige week')).toBe(false);
    expect(quickAddOffered('ran 5 km')).toBe(true); // a log line still gets its preview
    expect(pastPeriodAsk('exercise past week', ['Exercise'])).toBe('How many times did I check in Exercise last week?');
    expect(pastPeriodAsk('running last week', ['Exercise'])).toBeNull();
  });
  test('own-b (Lisbon): "I flossed my teeth" ticks the person\'s own item "Floss teeth"; a miss or another item is never guessed', () => {
    for (const t of both(lisbonFloss(), 'I flossed my teeth')) {
      expect(card(t.text), t.surface).toMatchObject({kind: 'checklist-tick', item: 'Floss teeth'});
      expect(t.quickAdd).toBe(false);
    }
    for (const t of both(lisbonFloss(), 'I stretched')) expect(t.proposals).not.toContain('checklist-tick'); // no object: not this template
    for (const t of both(lisbonFloss(), 'I missed my teeth')) expect(t.proposals).not.toContain('checklist-tick');
    for (const t of both(lisbonFloss(), 'I brushed my teeth')) expect(t.proposals).not.toContain('checklist-tick'); // "brush" is not "Floss"
    for (const t of both(lisbonFloss(), 'I stretched my legs')) expect(card(t.text)?.item ?? null).not.toBe('Floss teeth');
  });
  test('#337/338 (Lisbon): a 300-character "add …" gets the too-long note with the limits table\'s numbers, never the list', () => {
    const ask = `add ${'x'.repeat(300)}`;
    for (const t of both(lisbon('L2'), ask)) {
      expect(t.reply.kind, t.surface).toBe('answer');
      expect(t.text).toBe(`That is too long to add as one item (300 characters): a task title holds up to ${TEXT_LIMITS.taskTitle} characters, a habit name ${TEXT_LIMITS.habitTitle} and a Checklist item of your own ${TEXT_LIMITS.checklistItem}. Say it shorter; details can go in the task’s notes once it is added. Nothing was added.`);
      expect(t.proposals).toEqual([]);
    }
    expect(tooLongAdd('add buy milk', 'en')).toBeNull();
    expect(tooLongAdd(`voeg ${'x'.repeat(200)} toe`, 'nl')).toBeNull(); // only the "add …" shape
    expect(tooLongAdd(`add ${'y'.repeat(150)}`, 'nl')).toContain('Dat is te lang om als één item toe te voegen (150 tekens)');
  });
  test('lib/limits/text.ts: each number is the one its schema enforces', () => {
    const base = {id: 't1', priority: 'normal', createdAt: '2026-11-01T00:00:00.000Z'};
    expect(taskSchema.safeParse({...base, title: 'x'.repeat(TEXT_LIMITS.taskTitle)}).success).toBe(true);
    expect(taskSchema.safeParse({...base, title: 'x'.repeat(TEXT_LIMITS.taskTitle + 1)}).success).toBe(false);
    expect(actionSchema.safeParse({kind: 'checklist-add-custom', text: 'x'.repeat(TEXT_LIMITS.checklistItem)}).success).toBe(true);
    expect(actionSchema.safeParse({kind: 'checklist-add-custom', text: 'x'.repeat(TEXT_LIMITS.checklistItem + 1)}).success).toBe(false);
    expect(actionSchema.safeParse({kind: 'create-habit', title: 'x'.repeat(TEXT_LIMITS.habitTitle)}).success).toBe(true);
    expect(actionSchema.safeParse({kind: 'create-habit', title: 'x'.repeat(TEXT_LIMITS.habitTitle + 1)}).success).toBe(false);
  });
  test('#216, LA-028 (Lisbon): "show my checklist" typed 40 times is answered once, as the single ask is', () => {
    const single = both(lisbon('L2'), 'Show my checklist');
    for (const [i, t] of both(lisbon('L2'), Array(40).fill('show my checklist').join(' ')).entries()) {
      expect(t.reply.kind, t.surface).toBe('answer');
      expect(t.text).toBe(single[i]!.text);
      expect(t.text).toContain('Checklist today: 1 of 4 done.');
    }
    expect(onePhrase('show my checklist\nshow my checklist?')).toBe('show my checklist');
    expect(onePhrase('show my checklist and my habits')).toBeNull();
  });
  test('LZ-019 (Lisbon): "open goals⏎and tell me what is left today" answers both lines', () => {
    for (const t of both(lisbon('L1'), 'open goals\nand tell me what is left today')) {
      expect(t.text, t.surface).toMatch(/^Opening Goals\./);
      expect(t.text).toContain('Today (Wed, Nov 4), from your own records:');
      expect(t.text).toContain('Habits still open: Drink water');
      expect(t.proposals).toEqual(['open-page']);
    }
    // A line with no answer here says so, the other lines keep theirs.
    for (const t of both(lisbon('L2'), 'Show my checklist\nTell me a joke')) {
      expect(t.text, t.surface).toContain('Checklist today: 1 of 4 done.');
      expect(t.text).toContain('“Tell me a joke”: I have no answer for this one on this device.');
    }
    expect(messageLines('How many steps\ndid I walk today?')).toBeNull(); // one sentence wrapped over two lines
  });
  test('N-LA-01 (Lisbon): an unmatched wording gets what the device does before the examples', () => {
    for (const t of both(lisbon('L2'), 'Tell me a joke')) {
      expect(t.reply.kind).toBe('examples');
      expect(t.text, t.surface).toBe(`That isn’t something I can answer from your records here. Without a brain I answer about your habits, Checklist, tasks, goals, Health (once you share it) and money, and I prepare cards you confirm for check-offs, tasks and new habits.\n${EXAMPLES_INTRO}`);
    }
  });
  test('DVR:Z-052 (Denver): two goals in one question get both goals\' answers, never this month\'s contributions', () => {
    for (const t of both(showcase(), 'How far am I on my Emergency fund goal and my First home deposit goal?')) {
      expect(t.text, t.surface).toMatch(/^Emergency fund: \d+% of the target/);
      expect(t.text).toMatch(/\n\nFirst home deposit: \d+% of the target/);
      expect(t.text).not.toContain('Contributions this month');
    }
    for (const t of both(showcase(), 'How far am I on my First home deposit goal?')) expect(t.text, t.surface).toMatch(/^First home deposit: \d+% of the target/);
    for (const t of both(showcase(), 'How much did I contribute this month?')) expect(t.text, t.surface).toContain('Contributions');
  });
  test('Z-021, N-040 (Denver): a goal that keeps an average is answered as a goal; its Health days stay unread with Health off', () => {
    for (const [ask, name] of [['Show my Sleep 7 hours a night goal', 'Sleep 7 hours a night'], ['How far am I on my DV Sleep avg goal?', 'DV Sleep avg']] as const) {
      for (const t of both(denverAverages(), ask)) {
        expect(t.reply.kind, `${t.surface} ${ask}`).toBe('answer');
        expect(t.text).toBe(`${name} (a goal that keeps an average): at least 7 h a night over the last 14 days.\n- Its days come from Health, which isn’t shared here, so its average is not read (unknown here, never zero). The goal itself stays on Goals.`);
      }
    }
  });
  test('N16/N17, T6/T7 (Nairobi): a routine asked for points to the person\'s own AI and to Habits → Routines', () => {
    for (const ask of ['10-minute morning routine', 'give me a 10-minute routine for tonight', 'a routine for my mornings']) {
      for (const t of both(lisbon('L2'), ask)) {
        expect(t.text, `${t.surface} ${ask}`).toMatch(/^Suggestions and routines written for you need your own AI \((?:Settings → ZIGi · Your Personal AI Companion|NOVA → setup \(“Build NOVA’s brain”\))\)\./);
        expect(card(t.text)).toMatchObject({kind: 'open-page', page: 'habits', view: 'routines'});
      }
    }
    for (const t of both(lisbon('L2'), 'open my routines')) expect(t.text).toMatch(/^Opening Habits → Routines\./);
  });
  test('TK #10 (Tokyo): the ZIG price says where it comes from: the person\'s own value, and the market\'s price or its absence', () => {
    for (const t of both(showcase(), 'What is the price of ZIG?')) {
      expect(t.text, t.surface).toContain('Wealth: 0.06 USD per ZIG (Manual value');
      expect(t.text).toContain('The Wealth figure is the value you entered yourself (Manual value), not a market price. Markets has no live ZIG price on this device right now (the Markets page shows the same).');
    }
    const quoted = {...showcase(), quotes: [{base: {network: 'zigchain-1', denom: 'azig', decimals: 18}, currency: 'USD', price: '4145', priceDecimals: 5, source: 'CoinGecko', providerAssetId: 'zignaly', observedAt: '2026-11-04T18:55:00.000Z', verification: 'VERIFIED' as const}]};
    for (const t of both(quoted, 'What is the price of ZIG?')) expect(t.text, t.surface).toContain('Markets: 0.04145 USD per ZIG (CoinGecko, 2026-11-04 18:55 UTC).');
  });
  test('TK #14–16 (Tokyo): "and in EUR?", "and BTC?", "and for ETH?" after a price keep that question\'s subject', () => {
    for (const t of both(showcase(), 'and in EUR?', {previous: 'What is the price of ETH?'})) {
      expect(t.reply.kind, t.surface).toBe('answer');
      expect(t.text).toContain('No EUR price for ETH on this device: each figure stays in the currency its page holds, never converted.');
    }
    for (const t of both(showcase(), 'and BTC?', {previous: 'What is the price of ETH?'})) expect(t.text, t.surface).toMatch(/^Wealth: no price for BTC on this device yet/);
    for (const t of both(showcase(), 'and for ETH?', {previous: 'What is the price of BTC?'})) expect(t.text, t.surface).toMatch(/^Wealth: no price for ETH on this device yet/);
  });
  test('#352/353, LA-010, LZ-020, ZIGi-F8 (Lisbon, Berlin): German "Was steht auf meiner Checkliste?" gets the English-for-now note and the answer', () => {
    for (const t of both(lisbon('L2'), 'Was steht auf meiner Checkliste?')) {
      expect(t.text, t.surface).toMatch(/^Im Moment antworte ich auf Englisch \(und Niederländisch\)\.\nChecklist today: 1 of 4 done\./);
    }
    expect(germanAsk('Welche Gewohnheiten sind heute offen?')).toBe('Which habits are open today?');
    expect(germanAsk('Ich habe Wasser getrunken')).toBeNull(); // not a question: no question is made of it
  });
  test('DVR:D-061 (Denver, from L7-5a): "what should I do with …" names a goal → its figures under the no-advice line; a money thing → the no-advice line, EN and NL', () => {
    for (const t of both(showcase(), 'What should I do with my Emergency fund?')) {
      expect(t.text, t.surface).toMatch(/^What to do with it is your choice: I don’t advise on money\. The goal’s own figures: Emergency fund: [\d,.]+ USD of 20,000\.00 USD \(\d+%\)/);
      expect(t.proposals).toEqual([]);
    }
    for (const t of both(showcase(), 'Wat moet ik met mijn Emergency fund doen?')) expect(t.text, t.surface).toMatch(/^Wat je ermee doet is jouw keuze: ik geef geen geldadvies\. De cijfers van het doel: /);
    for (const ask of ['Wat moet ik met mijn noodfonds doen?', 'Wat moet ik doen met mijn noodfonds?']) {
      for (const t of both(showcase(), ask)) { expect(t.reply.kind, `${t.surface} ${ask}`).toBe('answer'); expect(t.text).toBe(ADVICE_REPLIES.money.nl); }
    }
    for (const t of both(showcase(), 'What should I do with my savings?')) expect(t.text, t.surface).toBe(ADVICE_REPLIES.money.en);
  });
  test('LA-034 (Lisbon): "Did I drink water today?" says "1 time", the unit singular after one (lib/plural.ts)', () => {
    for (const t of both(lisbon('L2'), 'Did I drink water today?')) expect(t.text, t.surface).toBe('Drink water: 1 time today (Wed, Nov 4).');
  });
});
