import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {beforeAll, describe, expect, test} from 'vitest';
import {loadAaPlanner} from '../actions/plan';
import {showcaseSources, withG1, withHandHealth, withPortfolios} from '../tools/fixtures';
import {HEALTH_CLOSED} from '../tools/format';
import {healthGoalsSchema} from '../../health-goals/schema';
import {denver, lisbon, novaEnv, typed, zigiEnv} from '../evals/l7-fourth-fixtures';
import {followUpQuestion, previousQuestion} from './followup';
import {HELP_ENTRIES} from './al-final';
import {plannedDaysLine} from '../proactive/review';
import type {ToolEnv} from '../tools/env';
beforeAll(() => loadAaPlanner());

/**
 * Session AL final pass (lane L7; GROK53_REPLAY_ZIGI_3.md / _PILLARS_3.md, the ZIGi and NOVA rows still open on 1a7b0163):
 * each group's cause, held in ZIGi's panel and NOVA's chat with no model, in the bots' own conditions (Showcase, Lisbon,
 * Denver; everything fictional). English and Dutch where the wording is the fix.
 */
const sc = () => withG1(withPortfolios(withHandHealth(showcaseSources())));
/** A chat as the panel runs it: each message with the question a follow-up refers to (components/ai/use-chat-session.ts). */
function chat(env: ToolEnv, messages: readonly string[]): string[] {
  const asked: string[] = [], out: string[] = [];
  for (const m of messages) { out.push(typed(m, env, previousQuestion([...asked].reverse())).text); asked.push(m); }
  return out;
}
const HG = healthGoalsSchema.parse({version: 1, goals: [{version: 1, id: '92000000-0000-4000-8000-0000000000a1', name: 'Walk more (Showcase)', measure: 'steps', direction: 'at-least', target: {value: '8000', decimals: 0}, unit: 'steps', window: {kind: 'rolling', weeks: 4}, status: 'active', notes: 'fictional', createdAt: '2026-09-01T08:00:00.000Z', updatedAt: '2026-09-01T08:00:00.000Z'}]}).goals;

describe('1. money follow-ups keep their question (TK:14–16, Z12, C-TK-35, BUG-055, TK-051)', () => {
  test.each([['zigi'], ['nova']] as const)('%s: "and in EUR?", "and BTC?", "and for ETH?" after a typo\'d ETH question', surface => {
    const env = surface === 'zigi' ? zigiEnv(sc()) : novaEnv(sc());
    const [eth, eur, btc, again] = chat(env, ['how mch eth do i hav', 'and in EUR?', 'and BTC?', 'and for ETH?']);
    expect(eth).toMatch(/^You hold 4 ETH in Wealth/);
    expect(eur).toMatch(/^You hold 4 ETH in Wealth/); expect(eur).toContain('No value in EUR: each value stays in its price\'s own currency and is never converted');
    expect(btc).toMatch(/^You hold 0\.45 BTC in Wealth/);
    expect(again).toMatch(/^You hold 4 ETH in Wealth/);
    for (const t of [eur, btc, again]) expect(t).not.toContain('That isn’t something I can answer');
  });
  test('the follow-up reads the typo-fixed question; Dutch "en BTC?" too', () => {
    expect(followUpQuestion('and in EUR?', 'how mch eth do i hav')).toBe('how much eth do i have in EUR?');
    expect(followUpQuestion('en BTC?', 'how mch eth do i hav')).toBe('how much BTC do i have');
    expect(followUpQuestion('and Read?', 'how mch eth do i hav')).toBeNull();
  });
});

describe('2. a coin with nothing in Wealth: "no ETH recorded", never 0 and never the examples (NB:P6, BUG-056, NB-107)', () => {
  test.each([['how mch eth do i hav'], ['how much eth do i have'], ['How much BTC do I hold?']])('"%s" with no Wealth records', q => {
    for (const env of [zigiEnv(lisbon('L1')), novaEnv(lisbon('L1'))]) {
      const t = typed(q, env).text;
      expect(t).toMatch(/^You have no (?:ETH|BTC) recorded in Wealth, so there is no amount to show\.\n- To track it: Wealth → \+ Add asset → Crypto, then (?:ETH|BTC) and the amount you hold$/);
      expect(t).not.toMatch(/\b0 (?:ETH|BTC)\b/);
    }
  });
  test('a held coin keeps its answer; gold points to Precious metals', () => {
    expect(typed('how much ETH do I have?', zigiEnv(sc())).text).toMatch(/^You hold 4 ETH/);
    expect(typed('how much gold do I have?', zigiEnv(lisbon('L1'))).text).toContain('Wealth → + Add asset → Precious metals');
  });
});

describe('3. the fallback is the closest answer or Help, else the examples (N-LA-01, BN-053)', () => {
  test('BN-053: both halves answered from Help\'s own words, in ZIGi and NOVA', () => {
    for (const env of [zigiEnv(lisbon('L1')), novaEnv(lisbon('L1'))]) {
      const t = typed('What is on the Ecosystem page, and what does Chess have to do with ZIGoals?', env);
      expect(t.reply.kind).toBe('answer');
      expect(t.text).toContain('From Help, “What is the Ecosystem page?”: A directory of projects on ZIGChain');
      expect(t.text).toContain('From Help, “What does the Chess page do?”: Add your public Lichess or Chess.com username');
      expect(t.proposals).toEqual(['open-page', 'open-page']);
    }
  });
  test('Help\'s words here are Help\'s own (components/help/help-page.tsx)', () => {
    const raw = readFileSync(fileURLToPath(new URL('../../../components/help/help-page.tsx', import.meta.url)), 'utf8');
    for (const e of HELP_ENTRIES) expect(raw, e.id).toContain(`id="${e.id}" question="${e.question.replace(/&/g, '&amp;')}"`);
    const help = raw.replace(/<[^>]+>/g, '').replace(/&rsquo;/g, '’').replace(/&ldquo;/g, '“').replace(/&rdquo;/g, '”').replace(/&rarr;/g, '→').replace(/&amp;/g, '&');
    for (const e of HELP_ENTRIES) expect(help, e.id).toContain(e.answer);
  });
  test('N-LA-01: a statement that shares a habit\'s words gets that habit\'s answer, named as a guess', () => {
    const t = typed('I didn\'t drink water today', zigiEnv(lisbon('L1')));
    expect(t.text).toBe('I’m not sure I read that right. The closest question I can answer here is “Did I do Drink water today?”:\n\nDrink water: 0 times today (Wed, Nov 4).');
    expect(t.proposals).toEqual([]);
  });
  test('nothing close: still the examples (emoji, a Dutch question)', () => {
    for (const q of ['🧹🧹🧹 ✅?', '🙂🙂🙂']) expect(typed(q, zigiEnv(lisbon('L1'))).reply.kind).toBe('examples');
    expect(typed('Wat is het weer morgen?', zigiEnv(lisbon('L1'))).reply.kind).toBe('examples');
  });
});

describe('4. one money format for goals (DV:Z-003, DV:N-004)', () => {
  test.each([['zigi'], ['nova']] as const)('%s: the one-goal answer and "list my goals" write money alike', surface => {
    const env = surface === 'zigi' ? zigiEnv(denver()) : novaEnv(denver());
    const one = typed('How far am I on my Holiday goal?', env).text, list = typed('list my goals', env).text;
    const amount = /(?:US)?\$500(?!\.)/;
    expect(one).toMatch(amount); expect(list).toMatch(amount);
    expect(list).not.toContain('0.00 USD'); expect(list).not.toContain('500.00 USD');
    expect(list).toContain('20 books');
  });
});

describe('5. real places for settings (DV:N-007, DV:N-064, N-LA-08)', () => {
  test('auto-accept is named where it is, in English and Dutch', () => {
    for (const q of ['What can you read about me?', 'What can you see about me?']) {
      const t = typed(q, novaEnv(denver())).text;
      expect(t).toContain('Settings → ZIGi · Your Personal AI Companion → Auto-accept; that group shows once an AI is turned on there');
      expect(t).not.toContain('Settings → ZIGi → Auto-accept');
    }
    const nl = typed('Wat zie je van mijn gegevens?', zigiEnv(denver())).text;
    expect(nl).toContain('Settings → ZIGi · Your Personal AI Companion → Auto-accept; die groep verschijnt zodra daar een AI aan staat');
  });
  test('ZIGi\'s Health line names the same two switches NOVA → Permissions shows', () => {
    expect(typed('how much water did i drink today', zigiEnv(lisbon('L1'))).text).toBe(HEALTH_CLOSED);
    expect(HEALTH_CLOSED).toContain('They are the same two switches NOVA → Permissions shows.');
    const nova = typed('how much water did i drink today', novaEnv(lisbon('L1'))).text;
    expect(nova).toContain('NOVA → Permissions'); expect(nova).toContain('Health page data and Include Health');
  });
});

describe('6. cards and lists that agree (LS:#382m, NB:T3, NB:H1, NB:H2)', () => {
  test('LS:#382m: an item already on the path is said so with its orbit, and no card offers it', () => {
    const t = typed('add stretch to my evening checklist', zigiEnv(lisbon('L2')));
    expect(t.text).toMatch(/^Stretch 5 min is already on your Checklist, in the Afternoon orbit, so there is nothing to add\. To have it in the Evening orbit, drag it there on the Checklist \(Edit path\); a card can’t move it\./);
    expect(t.proposals).toEqual(['open-page']);
  });
  test('NB:T3/H2: "tick the first one" takes the first of the list just shown', () => {
    const [, first] = chat(zigiEnv(denver()), ['which habits are open today?', 'tick the first one']);
    expect(first).toMatch(/^The first one among today’s open habits is Drink water; the card below checks it off, only when you add it\./);
    const [, second] = chat(zigiEnv(denver()), ['which habits are open today?', 'tick the second one']);
    expect(second).toContain('Solve five puzzles');
    const path = typed('tick the first one', zigiEnv(lisbon('L2'))).text;
    expect(path).toMatch(/^The first one on your path is Stretch 5 min;/);
    expect(path).toContain('"kind":"checklist-tick","item":"Stretch 5 min"');
  });
  test('NB:H1: "behind on" is behind on schedule (missed planned days), never today\'s open list, in English and Dutch', () => {
    const t = typed('which of these habits am I behind on', zigiEnv(sc())).text;
    expect(t).toMatch(/^Behind on schedule over the last 7 days \(2026-09-28 to 2026-10-04; today is still open, so it is not counted\)/);
    expect(t).toContain('• Late-night snacks (Showcase): 1 of 6 planned days without a check-in');
    expect(t).not.toContain('Habits still open');
    const nl = typed('welke gewoontes loop ik achter', zigiEnv(sc())).text;
    expect(nl).toMatch(/^Achter op schema over de laatste 7 dagen/);
  });
});

describe('7. habit and streak copy (Z-061, Z-021, Z-025)', () => {
  test('Z-061: the planned-days line agrees with the table under it', () => {
    expect(plannedDaysLine({quietDays: [], habits: [{title: 'Exercise', done: 6, scheduled: 7, skipped: 1}, {title: 'Snacks', done: 3, scheduled: 5, skipped: 2}]}))
      .toBe('Each day with a habit planned had at least one check-in, but not every habit did: 3 planned habit days were skipped (each habit is in the table below).');
    expect(plannedDaysLine({quietDays: [], habits: [{title: 'A', done: 2, scheduled: 4, skipped: 1}]})).toBe('Each day with a habit planned had at least one check-in, but not every habit did: 1 planned habit day was skipped and 1 planned habit day had no check-in (each habit is in the table below).');
    expect(plannedDaysLine({quietDays: [], habits: [{title: 'A', done: 4, scheduled: 4, skipped: 0}]})).toBe('Every planned habit day had its check-in.');
    expect(plannedDaysLine({quietDays: ['2026-10-03'], habits: []})).toBe('Days with a habit planned and no check-in: 1 (2026-10-03).');
  });
  test('Z-021: a streak longer than the month\'s check-ins says why', () => {
    expect(typed('What is my longest Exercise streak?', zigiEnv(sc())).text).toBe('Your longest Exercise streak is 26 days; the current one is 26 days.\n- The current one runs since Thu, Sep 10: a streak counts scheduled days in a row across months, and a skipped day keeps it going (skipped days never count against you), so it can be longer than one month’s check-ins');
  });
  test('Z-025: a "Walk goal" question answers the Health goal and the habit, each named', () => {
    const shared = typed('What is my Walk goal progress?', zigiEnv({...sc(), healthGoals: HG}, {health: true})).text;
    expect(shared).toMatch(/^Two of your records match “Walk”, so here are both:\n• Health goal “Walk more \(Showcase\)” \(Goals → Health goals\): [\d,]+ of 8,000 steps a day on average\.\n• Habit “Walk”: Walk: 32,000 steps this month/);
    const closed = typed('What is my Walk goal progress?', zigiEnv(sc())).text;
    expect(closed).toMatch(/^Walk: 32,000 steps this month[\s\S]*\n\nThis is your habit “Walk”\. A Health goal \(Goals → Health goals\) is read only while Health is shared with ZIGi, so none is counted here\.$/);
  });
});

describe('9. the language note on French asks (BN:ZIGi #9, ZIGi-F8)', () => {
  test('a French governance question gets the French note above the English answer', () => {
    for (const env of [zigiEnv(lisbon('L1')), novaEnv(lisbon('L1'))]) {
      const t = typed('Combien de temps dure la période de vote ?', env).text;
      expect(t).toMatch(/^Pour l’instant, je réponds en anglais \(et en néerlandais\)\.\n/);
      expect(t).toContain('Governance');
    }
  });
  test('English and Dutch questions get no note', () => {
    expect(typed('How long is the voting period?', zigiEnv(lisbon('L1'))).text).not.toContain('Pour l’instant');
    expect(typed('Hoe lang duurt de stemperiode?', zigiEnv(lisbon('L1'))).text).not.toContain('Pour l’instant');
  });
});
