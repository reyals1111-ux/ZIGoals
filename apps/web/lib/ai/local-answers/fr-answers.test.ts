import {afterEach, describe, expect, test, vi} from 'vitest';
import {ask, freshAll, novaEnv, showcaseAll, zigiEnv} from '../evals/as/harness';
import {CORPUS} from '../evals/as/cases';
import {habitDataSchema, type HabitData} from '../../habits';
import {yesterdaysOpen} from '../../habits-yesterday';
import {healthGroupIn, withHealthGroup} from '../../vault/w-homes';
import {setDisplayLocale} from '../../visual-format';
import {runTool} from '../tools/registry';
import {firstSeries, seriesSummary} from '../viz';
import {tasksSchema} from '../../tasks/schema';
import {linkedSoFar} from '../tools/habits';
import type {ToolSources} from '../tools/env';
import {EXAMPLES_INTRO_NL, noModelReply} from './no-model';
import {DEFAULT_NOVA_SCOPES} from '../context-pack/nova';
import {SANNE_RECORDS, sanneAll} from './fr-answers-fixture';

/**
 * Session AV lane 2 (fr-answers): the friend-readiness walks' questions (fr-sanne.md, fr-max.md, fr-tom-jules.md), each
 * asked through the whole engine (`localAnswer`, then the no-model reply, as the harness's `ask` does) in NOVA and ZIGi,
 * English and Dutch, against the persona's own records. The device's storage is stubbed where the answer reads a device
 * record (meals in words, linked wallets).
 */
const store = (records: Record<string, string>) => vi.stubGlobal('window', {localStorage: {getItem: (k: string) => records[k] ?? null, setItem: () => undefined, removeItem: () => undefined, key: () => null, length: 0, clear: () => undefined}, sessionStorage: {getItem: () => null}});
afterEach(() => { vi.unstubAllGlobals(); setDisplayLocale('en-US'); });
const both = (s: () => ToolSources) => [['ZIGi', zigiEnv(s())], ['NOVA', novaEnv(s())]] as const;
/** Sanne's browser is nl-NL: the app writes every number the Dutch way there (lib/visual-format.ts), answers too. */
const inDutch = (run: () => void) => { setDisplayLocale('nl-NL'); try { run(); } finally { setDisplayLocale('en-US'); } };

describe('FR-S-1 and FR-TJ-2: a Dutch water question gets the Dutch answer, with the same figures', () => {
  test('Sanne: today, this week, yesterday (NOVA and ZIGi)', () => {
    for (const [who, env] of both(sanneAll)) {
      inDutch(() => {
        expect(ask('Hoeveel water heb ik vandaag gedronken?', env).text, who).toBe('Je logde vandaag (zo 29 nov) 250 mL water.');
        expect(ask('Hoeveel water heb ik deze week gedronken?', env).text, who).toBe('Je logde deze week (ma 23 nov t/m zo 29 nov) 5.750 mL water.\n- Gemiddeld 821 mL op de 7 dagen met water gelogd');
        expect(ask('Hoeveel water heb ik gisteren gedronken?', env).text, who).toBe('Je logde gisteren (za 28 nov) 750 mL water.');
      });
      expect(ask('How much water did I drink today?', env).text, who).toBe('You logged 250 mL of water today (Sun, Nov 29).');
      // A Dutch answer writes Dutch figures in any display locale (en-US here), as its words are Dutch.
      expect(ask('Hoeveel water heb ik deze week gedronken?', env).text, who).toMatch(/^Je logde deze week \(ma 23 nov t\/m zo 29 nov\) 5\.750 mL water\./);
    }
  });
  test('the Showcase and a fresh profile, in Dutch', () => {
    inDutch(() => expect(ask('Hoeveel water heb ik vandaag gedronken?', novaEnv(showcaseAll())).text).toBe('Je logde vandaag (di 17 nov) 1.000 mL water.'));
    expect(ask('Hoeveel water heb ik vandaag gedronken?', zigiEnv(freshAll())).text).toBe('Er is vandaag (di 17 nov) geen water gelogd.');
  });
});

describe('FR-S-2 and FR-TJ-3: a meal logged in words is read, never "nothing logged"', () => {
  test('Sanne: yesterday, Wednesday, this week, calories (NOVA and ZIGi, Dutch and English)', () => {
    store(SANNE_RECORDS);
    for (const [who, env] of both(sanneAll)) {
      expect(ask('Wat heb ik gisteren gegeten?', env).text, who).toBe('Gisteren (za 28 nov) logde je 1 maaltijd in woorden:\n- Avondeten, in woorden: “Pasta pesto met salade” (calorieën onbekend)\nEen maaltijd in woorden heeft geen calorieën, dus die telt in geen totaal mee (onbekend, nooit 0); “Find these foods” bij de maaltijd in Health maakt er voedingsmiddelen met calorieën van.');
      expect(ask('What did I eat on Wednesday?', env).text, who).toMatch(/^On Wed, Nov 25 you logged 1 meal in words:\n- Dinner, in words: “Stamppot boerenkool met rookworst” \(calories unknown\)\nA meal in words has no calories/);
      expect(ask('Wat heb ik woensdag gegeten?', env).text, who).toMatch(/^Op wo 25 nov logde je 1 maaltijd in woorden:\n- Avondeten, in woorden: “Stamppot boerenkool met rookworst”/);
      const week = ask('Welke maaltijden heb ik deze week gelogd?', env).text;
      expect(week, who).toMatch(/^Deze week \(ma 23 nov t\/m zo 29 nov\) logde je 3 maaltijden in woorden:\n- ma 23 nov · Lunch, in woorden: “Boterham met kaas en een appel”[^\n]*\n- wo 25 nov · Avondeten[^\n]*\n- za 28 nov · Avondeten, in woorden: “Pasta pesto met salade”/);
      expect(week, who).not.toMatch(/water/i);
      expect(ask('How many calories did I eat yesterday?', env).text, who).toMatch(/^Your calories yesterday \(Sat, Nov 28\) are unknown: you logged 1 meal in words \(Dinner: “Pasta pesto met salade”\)/);
      expect(ask('Hoeveel calorieën heb ik gisteren gegeten?', env).text, who).toMatch(/^Je calorieën gisteren \(za 28 nov\) zijn onbekend: je logde 1 maaltijd in woorden/);
      for (const q of ['Wat heb ik gisteren gegeten?', 'What did I eat on Wednesday?', 'Hoeveel calorieën heb ik gisteren gegeten?']) expect(ask(q, env).text, `${who}: ${q}`).not.toMatch(/niets in je eetdagboek\b(?!, ook)|Nothing is logged|Nog geen eten gelogd|no entries/);
    }
  });
  test('Tom: breakfast in words today, beside a diary entry; the known total is said with the words as unknown', () => {
    const today = '2026-11-17', words = JSON.stringify({version: 1, entries: [{id: 'words_t1', date: today, meal: 'Breakfast', words: 'Two eggs and toast', at: `${today}T07:30:00.000Z`}]});
    store({'zigoals:meal-words:v1': words});
    const env = novaEnv(showcaseAll());
    const eat = ask('What did I eat today?', env).text;
    expect(eat).toMatch(/^Today \(Tue, Nov 17\) you logged \d+ diary entr(?:y|ies) and 1 meal in words:/);
    expect(eat).toContain('- Breakfast, in words: “Two eggs and toast” (calories unknown)');
    expect(ask('How many calories did I eat today?', env).text).toMatch(/^Energy today \(Tue, Nov 17\): [\d,]+ kcal known from \d+ diary entr(?:y|ies), plus 1 meal in words without calories \(Breakfast: “Two eggs and toast”\), not counted: the true total is higher and unknown\.$/);
    expect(ask('Wat heb ik vandaag gegeten?', env).text).toContain('- Ontbijt, in woorden: “Two eggs and toast” (calorieën onbekend)');
  });
  test('without a meal in words, the diary answers stand word for word (nothing stolen)', () => {
    store({});
    expect(ask('Wat heb ik gisteren gegeten?', zigiEnv(sanneAll())).text).toBe('Er staat gisteren niets in je eetdagboek (za 28 nov).');
    expect(ask('What did I eat yesterday?', novaEnv(showcaseAll())).text).toMatch(/^You logged 4 things yesterday|^Yesterday|Berry overnight oats/);
  });
  test('Health closed: the words are not read', () => {
    store(SANNE_RECORDS);
    expect(ask('Wat heb ik gisteren gegeten?', zigiEnv(sanneAll(), false)).text).not.toContain('Pasta pesto');
  });
});

describe('FR-S-3: a water habit partly done shows the journal\'s progress, never 0', () => {
  test('NOVA\'s and ZIGi\'s open list, Dutch and English', () => {
    for (const [who, env] of both(sanneAll)) {
      inDutch(() => expect(ask('Wat staat er vandaag nog open?', env).text, who).toContain('Gewoontes nog open: Drink water (0,25 van 2 liters)'));
      expect(ask('What is still open today?', env).text, who).toContain('Habits still open: Drink water (0.25 of 2 liters)');
      expect(ask('Which habits are still open today?', env).text, who).toMatch(/Drink water: 0\.25 of 2 liters/);
    }
  });
  test('yesterday, still open (Today\'s card and the answers): 750 mL of 2 liters reads 0.75 of 2', () => {
    const env = zigiEnv(sanneAll());
    const y = yesterdaysOpen(env.habits, '2026-11-29', linkedSoFar(env)).open.find(o => o.title === 'Drink water')!;
    expect(y).toMatchObject({shown: 0.75, count: 0, target: 2, missing: 2});
    expect(yesterdaysOpen(env.habits, '2026-11-29').open.find(o => o.title === 'Drink water')).toMatchObject({shown: 0, count: 0});
  });
});

describe('FR-S-4: "hoe laat moet ik vanavond naar bed" is tonight\'s bedtime, never the clock', () => {
  const withGoal = (): ToolSources => { const s = sanneAll(); const sleep = healthGroupIn(s.health, 'sleep')!; return {...s, health: withHealthGroup(s.health, 'sleep', {...sleep, goal: {minutes: 480, updatedAt: '2026-11-23T08:00:00.000Z'}}, false)}; };
  test('no sleep goal: where to set it, Dutch and English', () => {
    for (const [who, env] of both(sanneAll)) {
      expect(ask('Hoe laat moet ik vanavond naar bed?', env).text, who).toBe('De bedtijd van vanavond heeft je eigen slaapdoel nodig: stel het in bij Health → Sleep, dan wordt de bedtijd berekend uit dat doel en je gewone wektijd.');
      expect(ask('What time should I go to bed tonight?', env).text, who).toMatch(/^Tonight’s bedtime needs your own sleep goal/);
      expect(ask('Wanneer moet ik naar bed?', env).text, who).not.toMatch(/^Het is \d/);
    }
  });
  test('with a sleep goal: the bedtime from it and the usual wake time', () => {
    const env = novaEnv(withGoal());
    expect(ask('Hoe laat moet ik vanavond naar bed?', env).text).toMatch(/^Naar bed om \d{2}:\d{2} voor je 8 h/);
    expect(ask('What time should I go to bed tonight?', env).text).toMatch(/^Bed by /);
  });
});

describe('FR-S-5: the sleep goal, on time to bed, and a Dutch fallback in Dutch', () => {
  test('"haal ik mijn slaapdoel": the average goal against the nights logged', () => {
    for (const [who, env] of both(sanneAll)) {
      inDutch(() => expect(ask('Haal ik mijn slaapdoel?', env).text, who).toBe('Elke nacht 8 uur slapen (gemiddeld 8 uur per nacht, over 7 dagen): je gemiddelde is 7,9 uur over 6 nachten, dus het doel is nog niet gehaald (99% ervan). Zoals Goals het toont, uit je eigen nachten.'));
      expect(ask('Am I reaching my sleep goal?', env).text, who).toBe('Elke nacht 8 uur slapen (8 h a night on average, over 7 days): your average is 7.9 h over 6 nights, so the goal is not met yet (99% of it). As Goals shows it, from your own nights.');
    }
    expect(ask('Haal ik mijn slaapdoel?', zigiEnv(freshAll())).text).toMatch(/^Je hebt nog geen slaapdoel: stel er een in bij Health → Sleep/);
  });
  test('"hoe vaak ben ik deze week op tijd naar bed gegaan": the bedtime habit\'s done days', () => {
    for (const [who, env] of both(sanneAll)) {
      expect(ask('Hoe vaak ben ik deze week op tijd naar bed gegaan?', env).text, who).toBe('Lights out by 23:00: gedaan op 4 van 7 dagen deze week (ma 23 nov t/m zo 29 nov): ma 23 nov, di 24 nov, vr 27 nov en zo 29 nov. Uit je eigen check-ins.');
      expect(ask('How often did I go to bed on time this week?', env).text, who).toBe('Lights out by 23:00: done on 4 of 7 days this week (Mon, Nov 23 to Sun, Nov 29): Mon, Nov 23, Tue, Nov 24, Fri, Nov 27 and Sun, Nov 29. From your own check-ins.');
    }
  });
  test('a Dutch question with no answer: a Dutch introduction, Dutch examples that fit her pillars, each answered in Dutch', () => {
    for (const [who, env] of both(sanneAll)) {
      const r = noModelReply('Kun je een gedicht voor mij schrijven?', env);
      expect(r.kind, who).toBe('examples');
      if (r.kind !== 'examples') continue;
      expect(r.text, who).toBe(EXAMPLES_INTRO_NL);
      expect(EXAMPLES_INTRO_NL).not.toMatch(/Engels/);
      expect(r.examples.length, who).toBeGreaterThanOrEqual(3);
      for (const q of r.examples) {
        expect(q, who).not.toMatch(/net worth|vermogen|\b(?:How|What|Which)\b/);
        const got = ask(q, env);
        expect(['answer', 'choices'], `${who}: ${q} → ${got.text.slice(0, 80)}`).toContain(got.kind);
      }
    }
  });
});

describe('A Dutch sleep summary in Dutch (seen in Sanne\'s walk)', () => {
  test('"some nights estimated" reads Dutch', () => {
    const t = ask('Hoe heb ik deze week geslapen?', novaEnv(sanneAll())).text;
    expect(t).toMatch(/^De afgelopen 7 dagen: 6 nachten gelogd, gemiddeld 7 h 55 min (?:\(sommige nachten geschat\) )?geslapen/);
    expect(t).not.toMatch(/some nights estimated/);
  });
});

describe('FR-MAX-4: when a task or the dentist is, EN and NL', () => {
  const withSam = (): ToolSources => { const s = freshAll(); return {...s, nova: {...s.nova!, tasks: tasksSchema.parse({version: 1, tasks: [{id: 'sam', title: 'Email Sam about', priority: 'normal', due: '2026-11-21', createdAt: '2026-11-16T08:00:00.000Z'}]})}}; };
  test('the Showcase\'s "Book the dentist"', () => {
    for (const [who, env] of both(showcaseAll)) {
      expect(ask('When is the dentist?', env).text, who).toBe('“Example · Book the dentist” is due today (Tue, Nov 17) at 10:30 AM.');
      expect(ask('Wanneer is de tandarts?', env).text, who).toBe('“Example · Book the dentist” staat gepland voor vandaag (di 17 nov) om 10:30.');
    }
  });
  test('Max\'s "Email Sam about", never a goal of that name', () => {
    for (const [who, env] of both(withSam)) {
      expect(ask('When is Email Sam due?', env).text, who).toBe('“Email Sam about” is due Sat, Nov 21.');
      expect(ask('Wanneer moet ik Sam mailen?', env).text, who).toBe('“Email Sam about” staat gepland op za 21 nov.');
      expect(ask('When is Email Sam due?', env).text, who).not.toMatch(/No goal is called/);
    }
  });
  test('no task of that name: the older answers stand', () => {
    expect(ask('When is my next paycheck?', zigiEnv(showcaseAll())).text).toMatch(/payday|paycheck|income/);
  });
});

describe('FR-MAX-5: the streak starts on the run\'s first check-in, today still open', () => {
  const day = (d: string) => ({date: d, count: 1, disposition: 'logged', note: '', updatedAt: `${d}T20:00:00.000Z`});
  const read = (): ToolSources => {
    const habits = habitDataSchema.parse({schemaVersion: 2, kind: 'zigoals-habits', habits: [{id: '7d0f5f3e-2a3b-4c5d-8e9f-0a1b2c3d4e5f', title: 'Read 20 pages', category: 'Learning', description: '', notes: '', timeOfDay: 'anytime', endCondition: {kind: 'none'}, startDate: '2026-11-20', createdAt: '2026-11-20T07:00:00.000Z', updatedAt: '2026-11-27T20:00:00.000Z',
      rules: [{from: '2026-11-20', schedule: {kind: 'daily'}, type: 'build', measurement: {kind: 'boolean'}, target: 1, targetPeriod: 'day', endCondition: {kind: 'none'}, state: 'active'}], entries: [day('2026-11-26'), day('2026-11-27')]}]}) as HabitData;
    return {...freshAll(), now: new Date('2026-11-28T09:00:00Z'), habitDay: '2026-11-28', healthDay: '2026-11-28', habits};
  };
  test('2 days, Thu 26 and Fri 27, while Sat 28 is open: since Thu, Nov 26', () => {
    for (const [who, env] of both(read)) {
      const t = ask('What is my streak for Read 20 pages?', env).text;
      expect(t, who).toMatch(/streak is 2 days/);
      expect(t, who).toContain('since Thu, Nov 26');
    }
  });
});

describe('FR-MAX-6: "which habit do I skip most" also says the days missed', () => {
  const tidy = (): ToolSources => {
    const habits = habitDataSchema.parse({schemaVersion: 2, kind: 'zigoals-habits', habits: [{id: '8e1a6b4f-3c4d-4e6f-9a0b-1c2d3e4f5a6b', title: 'Tidy desk', category: 'Home', description: '', notes: '', timeOfDay: 'anytime', endCondition: {kind: 'none'}, startDate: '2026-11-13', createdAt: '2026-11-13T07:00:00.000Z', updatedAt: '2026-11-13T07:00:00.000Z',
      rules: [{from: '2026-11-13', schedule: {kind: 'daily'}, type: 'build', measurement: {kind: 'boolean'}, target: 1, targetPeriod: 'day', endCondition: {kind: 'none'}, state: 'active'}], entries: []}]}) as HabitData;
    return {...freshAll(), habits};
  };
  test('no planned skip, 4 days missed', () => {
    for (const [who, env] of both(tidy)) {
      const t = ask('Which habit do I skip most this month?', env).text;
      expect(t, who).toContain('You skipped no habit this month');
      expect(t, who).toContain('Missed most (not done, not a planned skip): Tidy desk (4 days).');
    }
  });
});

describe('FR-MAX-12: what was finished this week, from Tasks → Completed', () => {
  test('the Showcase, English and Dutch', () => {
    for (const [who, env] of both(showcaseAll)) {
      // The same answer as "which tasks did I complete this week" (the corpus's tasks-done-week), word for word.
      expect(ask('What did I finish this week?', env).text, who).toBe('1 task done this week (Mon, Nov 16 to Tue, Nov 17): Renew the library card.');
      expect(ask('What did I finish this week?', env).text, who).toBe(ask('which tasks did I complete this week', env).text);
      expect(ask('Wat heb ik deze week afgerond?', env).text, who).toBe('1 taak gedaan deze week (ma 16 nov t/m di 17 nov): Renew the library card.');
    }
  });
});

describe('FR-TJ-5: a watched Bitcoin address is read (view only), never "no BTC"', () => {
  const WALLETS = {'zigoals:linked-wallets:v1': JSON.stringify({version: 1, wallets: [{id: 'b5d3f2de-097c-47b2-a147-4e412d3b0d6a', kind: 'btc', wallet: 'address-lookup', label: 'Bitcoin address', address: 'bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq', addedAt: '2026-11-16T08:00:12.005Z', via: 'typed'}]}),
    'zigoals:wallet-balances:v1': JSON.stringify({version: 1, observations: {'b5d3f2de-097c-47b2-a147-4e412d3b0d6a|bitcoin': {walletId: 'b5d3f2de-097c-47b2-a147-4e412d3b0d6a', chainId: 'bitcoin', at: '2026-11-17T11:30:02.363Z', assets: [{id: 'native', symbol: 'BTC', decimals: 8, amount: '18234271'}]}}})};
  test('holdings, price and net worth, English and Dutch', () => {
    store(WALLETS);
    for (const [who, env] of both(freshAll)) {
      const held = ask('How much BTC do I have?', env).text;
      expect(held, who).toMatch(/^Your linked wallets hold 0\.18234271 BTC in your linked wallet “Bitcoin address” \(view only, read /);
      expect(held, who).not.toMatch(/You have no BTC/);
      inDutch(() => expect(ask('Hoeveel BTC heb ik?', env).text, who).toMatch(/^Je gekoppelde wallets bevatten 0,18234271 BTC in je gekoppelde wallet “Bitcoin address” \(alleen bekijken, gelezen di 17 nov 11:30 UTC\)/));
      expect(ask('What is bitcoin worth today?', env).text, who).toMatch(/^BTC: your linked wallets hold 0\.18234271 BTC/);
      expect(ask('What is my net worth?', env).text, who).toContain('Your linked wallets hold 0.18234271 BTC');
    }
  });
  test('without a linked wallet the older answers stand', () => {
    store({});
    expect(ask('How much BTC do I have?', zigiEnv(freshAll())).text).toMatch(/^You have no BTC recorded in Wealth/);
    // fr-recheck (FR-TJ-5): the Dutch net-worth answer too, unchanged without a linked wallet.
    for (const [who, env] of both(freshAll)) expect(ask('Wat is mijn vermogen?', env).text, who).toBe('Er wordt nog niets gevolgd bij Wealth.');
  });
  // Session AV lane 2 (fr-recheck, FR-TJ-5): "Wat is mijn vermogen?" said "Er wordt nog niets gevolgd bij Wealth." beside a
  // linked wallet that "What is my net worth?" names; the Dutch answer reads it the same way (view only, no value).
  test('Dutch net worth names the linked wallet, view only, as the English one does (NOVA and ZIGi)', () => {
    store(WALLETS);
    for (const [who, env] of both(freshAll)) {
      inDutch(() => {
        const nl = ask('Wat is mijn vermogen?', env).text;
        expect(nl, who).toBe('Er wordt bij Wealth geen bezitting met een prijs gevolgd, dus er is geen totaal. Je gekoppelde wallets bevatten 0,18234271 BTC in je gekoppelde wallet “Bitcoin address” (alleen bekijken, gelezen di 17 nov 11:30 UTC); zonder prijs ervan op dit apparaat is er geen waarde om op te tellen.');
        expect(nl, who).not.toMatch(/niets gevolgd/);
      });
      expect(ask('Wat is mijn vermogen?', env).text, who).toContain('Je gekoppelde wallets bevatten 0,18234271 BTC');
      expect(ask('What is my net worth?', env).text, who).toContain('Your linked wallets hold 0.18234271 BTC');
    }
    // The Showcase keeps its own answer: its record has no linked wallets (fr-wallets.ts), so nothing is added there.
    expect(ask('Wat is mijn vermogen?', novaEnv(showcaseAll())).text).not.toMatch(/gekoppelde wallet/);
  });
});

describe('FR-TJ-1: NOVA\'s Health-off reply names the one button, Allow Health', () => {
  test('English and Dutch, scope off and sharing off', () => {
    const off = novaEnv(sanneAll(), {...DEFAULT_NOVA_SCOPES, health: false, journal: true, notes: true});
    expect(ask('How did I sleep?', off).text).toBe('Health is off for NOVA, so nothing from Health is read here. Tap Allow Health in NOVA → Permissions: one tap opens Health (the button is there once Health is on your Today page).');
    expect(ask('Hoe heb ik geslapen?', off).text).toBe('Health staat uit voor NOVA, dus er wordt niets uit Health gelezen. Tik op Allow Health in NOVA → Permissions: één tik opent Health (de knop staat er zodra Health op je Today-pagina staat).');
    const gate = novaEnv(sanneAll(), undefined, false);
    expect(ask('How did I sleep?', gate).text).toBe('Health answers are off on this device, so nothing from Health is read here; turn them on with Allow Health in NOVA → Permissions.');
    for (const t of [ask('How did I sleep?', off).text, ask('How did I sleep?', gate).text]) expect(t).not.toMatch(/Health page data|Include Health/);
  });
});

describe('FR-TJ-4 and FR-S-20: one number format per answer: Dutch for a Dutch answer, the display locale\'s for an English one', () => {
  // A comma locale's answer must hold no en-US grouping or decimal ("1,000 mL", "73.5 kg"); record names are words, not figures.
  const NAMES = /My first 0\.1 BTC|8,000 steps a day/g;
  const EN_IN_COMMA = [/(?<![\d.,])\d{1,3}(?:,\d{3})+(?![\d])/, /(?<![\d.,\w])\d+\.\d{1,2}(?![\d.])/];
  test('en-NL and nl-NL: no answer of the corpus mixes en-US figures in', () => {
    const bad: string[] = [];
    for (const locale of ['en-NL', 'nl-NL']) {
      setDisplayLocale(locale);
      const env = novaEnv(showcaseAll());
      for (const c of CORPUS) for (const q of [c.en[0]!, c.nl[0]!]) {
        const t = ask(q, env).text.replace(/\d{4}-\d{2}-\d{2}/g, '').replace(NAMES, '');
        for (const re of EN_IN_COMMA) { const m = re.exec(t); if (m) bad.push(`${locale} ${c.id} “${q}”: ${m[0]}`); }
      }
    }
    expect(bad).toEqual([]);
  }, 600_000);
  test('en-NL: water and weight as the app writes them', () => {
    setDisplayLocale('en-NL');
    const env = novaEnv(showcaseAll());
    expect(ask('How much water did I drink today?', env).text).toMatch(/1\.000 mL/);
    expect(ask('What is my weight?', env).text).toMatch(/73,5 kg/);
  });
  test('en-US: a Dutch answer the Dutch way, money too; an English one as before', () => {
    const env = zigiEnv(showcaseAll());
    expect(ask('Hoeveel water heb ik deze week gedronken?', env).text).toContain('3.100 mL');
    expect(ask('hoeveel weeg ik', env).text).toContain('73,48 kg');
    expect(ask('hoeveel heb ik deze maand uitgegeven', env).text).toMatch(/€\s435,59/);
    expect(ask('How much water did I drink this week?', env).text).toContain('3,100 mL');
  });
  // Session AV lane 2 (fr-recheck, FR-TJ-4): two figures were still en-US in a comma locale: a nutrient's total ("Protein
  // yesterday … 137.6 g") and the water chart's caption ("5,750 mL in all … 1,250 mL") under the Dutch and the en-NL answer.
  const captions = (q: string, env: ReturnType<typeof novaEnv>) => { const r = ask(q, env).reply, calls = 'calls' in r ? r.calls : []; const series = firstSeries(calls.map(c => runTool(c.tool, c.args, env))); return series ? seriesSummary(series) : ''; };
  const usFigures = (t: string) => EN_IN_COMMA.map(re => re.exec(t.replace(/\d{4}-\d{2}-\d{2}/g, ''))?.[0]).filter(Boolean);
  test('en-NL and nl-NL: a nutrient total and the water caption in the display locale (NOVA and ZIGi)', () => {
    for (const locale of ['en-NL', 'nl-NL']) {
      setDisplayLocale(locale);
      for (const [who, env] of both(showcaseAll)) {
        const protein = ask('How much protein did I eat yesterday?', env).text;
        expect(protein, `${locale} ${who}`).toMatch(/^Protein yesterday \(.+\): 137,6 g from 4 diary entries\.$/);
        expect(usFigures(protein), `${locale} ${who}`).toEqual([]);
        for (const q of ['How much protein did I eat today?', 'How much protein did I eat this week?', 'Hoeveel eiwit heb ik gisteren gegeten?']) expect(usFigures(ask(q, env).text), `${locale} ${who} ${q}`).toEqual([]);
      }
      for (const [who, env] of both(sanneAll)) for (const q of ['Hoeveel water heb ik deze week gedronken?', 'How much water did I drink this week?']) {
        const caption = captions(q, env);
        expect(caption, `${locale} ${who} ${q}`).toContain('5.750 mL in all');
        expect(caption, `${locale} ${who} ${q}`).toContain('the most 1.250 mL');
        expect(usFigures(`${ask(q, env).text} ${caption}`), `${locale} ${who} ${q}`).toEqual([]);
      }
    }
    setDisplayLocale('en-US');
    // en-US keeps its own way, caption and figure alike.
    expect(captions('How much water did I drink this week?', novaEnv(sanneAll()))).toContain('5,750 mL in all');
    expect(ask('How much protein did I eat yesterday?', novaEnv(showcaseAll())).text).toMatch(/: 137\.6 g from 4 diary entries\.$/);
  });
  test('en-US: every Dutch answer of the corpus holds no en-US figure (record names aside)', () => {
    const bad: string[] = [], env = novaEnv(showcaseAll());
    for (const c of CORPUS) { const t = ask(c.nl[0]!, env).text.replace(/\d{4}-\d{2}-\d{2}/g, '').replace(NAMES, ''); for (const re of EN_IN_COMMA) { const m = re.exec(t); if (m) bad.push(`${c.id} “${c.nl[0]}”: ${m[0]}`); } }
    expect(bad).toEqual([]);
  }, 600_000);
});
