import {describe, expect, test} from 'vitest';
import {CORPUS} from '../evals/as/cases';
import {ask, freshAll, novaEnv, showcaseAll, zigiEnv} from '../evals/as/harness';
import {nlFact, saysIn} from '../evals/as/says';
import {dayIn, dayWords, dayWriter, monthIn, nlDate, nlDay, periodSpan, periodWords, resolvePeriod} from './exact/period';

/**
 * Session AV lane 2 (Dutch dates, R5 of lane2/minors.md): NOVA's and ZIGi's Dutch on-device answers write their days,
 * spans and months the Dutch way ("ma 16 nov", "zo 1 nov t/m di 17 nov", "april 2028") with the answers' own writers
 * (exact/period.ts nlDay, nlDate, monthIn — the same approach 8152f805 took for the task answers); every English answer
 * is byte-for-byte as it was. Showcase on 17 November 2026 (a Tuesday).
 */
const TODAY = '2026-11-17';
const ENGLISH_DATE = /\b(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun|Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday|Mondays|Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec|January|February|March|April|June|July|August|September|October|November|December)\b/;
const byId = (id: string) => { const c = CORPUS.find(x => x.id === id); if (!c) throw new Error(id); return c; };

describe('the day and month writers', () => {
  test('a day, a date and a month in Dutch; the year only when it is not this year (or always, for a date with no today)', () => {
    expect(nlDay('2026-11-16', TODAY)).toBe('ma 16 nov');
    expect(nlDay('2027-04-16', TODAY)).toBe('vr 16 apr 2027');
    expect(nlDate('2026-10-19', TODAY)).toBe('19 okt');
    expect(nlDate('2028-01-31', TODAY)).toBe('31 jan 2028');
    expect(nlDate('2026-11-30', null)).toBe('30 nov 2026');
    expect(monthIn('nl', '2028-04')).toBe('april 2028');
    expect(monthIn('nl', '2026-12', {year: false})).toBe('december');
  });
  test('English is the app\'s own formatter, unchanged', () => {
    expect(dayIn('en', '2026-11-16', TODAY)).toBe(dayWords('2026-11-16', TODAY));
    expect(dayIn('en', '2026-11-16', TODAY)).toBe('Mon, Nov 16');
    expect(dayWriter('en')).toBe(dayWords);
    expect(dayWriter('nl')).toBe(nlDay);
    expect(monthIn('en', '2028-04')).toBe('Apr 2028');
  });
  test('a period\'s span writes its days in the answer\'s language by default', () => {
    const month = resolvePeriod('this-month', TODAY)!, since = resolvePeriod('since:2026-11-01', TODAY)!, october = resolvePeriod('month:2025-10', TODAY)!;
    expect(periodSpan(month, 'en', TODAY)).toBe('this month (Sun, Nov 1 to Tue, Nov 17)');
    expect(periodSpan(month, 'nl', TODAY)).toBe('deze maand (zo 1 nov t/m di 17 nov)');
    expect(periodWords(since, 'en', TODAY)).toBe('since Sun, Nov 1');
    expect(periodWords(since, 'nl', TODAY)).toBe('sinds zo 1 nov');
    expect(periodWords(october, 'en', TODAY)).toBe('in Oct 2025');
    expect(periodWords(october, 'nl', TODAY)).toBe('in oktober 2025');
  });
});

// Each pillar: one corpus question in English and in Dutch, the whole sentence (English as recorded in expected.json).
const PILLARS: readonly {pillar: string; id: string; en: string; nl: string}[] = [
  {pillar: 'habits', id: 'read-done-dates-week', en: 'Read: done on 2 of 2 due days this week (Mon, Nov 16 to Tue, Nov 17): Mon, Nov 16 and Tue, Nov 17. 60 minutes in total.', nl: 'Read: gedaan op 2 van 2 geplande dagen deze week (ma 16 nov t/m di 17 nov): ma 16 nov en di 17 nov. 60 minutes in totaal.'},
  {pillar: 'sleep', id: 'sleep-best-month', en: 'Sleep: your best day this month (Sun, Nov 1 to Tue, Nov 17) was Sat, Nov 7 (8 h 5 min).', nl: 'Slaap: je beste dag deze maand (zo 1 nov t/m di 17 nov) was za 7 nov (8 h 5 min).'},
  {pillar: 'weight', id: 'weight-now', en: 'Your latest weight is 73.5 kg, on Mon, Nov 16.\n- Change from Mon, Oct 19 to Mon, Nov 16: -1.1 kg\n- 8 readings the last 30 days (Mon, Oct 19 to Tue, Nov 17)', nl: 'Gewicht: 73.48 kg (ma 16 nov), 1.12 kg lager dan op 19 okt. Je doel is 72 kg.'},
  {pillar: 'workouts', id: 'au-r3-run-lastweek', en: 'You ran 6 km last week (Mon, Nov 9 to Sun, Nov 15), in 1 run: 6 km on Sun, Nov 15.', nl: 'Je liep 6 km vorige week (ma 9 nov t/m zo 15 nov), in 1 loop: 6 km op zo 15 nov.'},
  {pillar: 'money', id: 'spend-biggest-expense', en: 'Your largest expense this month (Sun, Nov 1 to Tue, Nov 17): €120.00 on Sun, Nov 8 (Energy).', nl: 'Je grootste uitgave deze maand (zo 1 nov t/m di 17 nov): €120.00 op zo 8 nov (Energy).'},
  {pillar: 'bills', id: 'bills-next', en: 'Next bill: Rent €950.00, in 14 days (Tue, Dec 1); 3 more after it.', nl: 'Volgende rekening: Rent €950.00, over 14 dagen (di 1 dec); daarna nog 3.'},
  {pillar: 'bill prices', id: 'au-r6-bill-price', en: 'Streaming went up from €12.99 to €13.99 since Jul 2026. From their payments in your money log, as Bills → Price changes shows them.', nl: 'Streaming ging omhoog van €12.99 naar €13.99 sinds juli 2026. Uit de betalingen in je geldlog, zoals Bills → Price changes ze toont.'},
  {pillar: 'budget targets', id: 'av-budget-targets', en: 'Groceries: target €300.00 by Dec 2026: €62.90 set aside, €237.10 a month from next month, on track.', nl: 'Groceries: doel €300.00 uiterlijk december 2026: €62.90 opzij, €237.10 per maand vanaf volgende maand, op schema. Food & drink en Fun hebben geen doel.'},
  {pillar: 'focus', id: 'focus-best-month', en: 'Focus: your best day this month (Sun, Nov 1 to Tue, Nov 17) was Mon, Nov 16 (150 minutes).', nl: 'Focus: je beste dag deze maand (zo 1 nov t/m di 17 nov) was ma 16 nov (150 minuten).'},
  {pillar: 'journal', id: 'journal-last', en: 'Journal: last written on Tue, Nov 17 (today).', nl: 'Dagboek: voor het laatst geschreven op di 17 nov (vandaag).'},
  {pillar: 'goals', id: 'goal-emergency-eta', en: 'At your current pace, you reach Emergency fund about Jan 31, 2028 — an estimate from your pace so far, not a promise. Target date Thu, Nov 16, 2028; $11,000.00 still to go.', nl: 'In je huidige tempo haal je Emergency fund rond 31 jan 2028 — een schatting op basis van je tempo tot nu toe, geen belofte. Streefdatum do 16 nov 2028; nog $11,000.00 te gaan.'},
  {pillar: 'notes', id: 'notes-count', en: '8 notes in all; 2 wait in your inbox. The newest is from Tue, Nov 17.', nl: '8 notities in totaal; 2 wachten in je inbox. De nieuwste is van di 17 nov.'},
  {pillar: 'the date', id: 'au-r4-date', en: 'It\'s Tuesday, Nov 17.', nl: 'Het is dinsdag 17 nov.'},
];
describe('a Dutch answer with a date writes it the Dutch way; the English answer is unchanged (NOVA, Showcase)', () => {
  const env = novaEnv(showcaseAll());
  for (const p of PILLARS) test(`${p.pillar} (${p.id})`, () => {
    const c = byId(p.id);
    expect(ask(c.en[0]!, env).text).toBe(p.en);
    expect(ask(c.nl[0]!, env).text).toBe(p.nl);
  });
  test('the debt-free months (av-debt-free) and the goal list\'s next steps (goals-status)', () => {
    expect(ask(byId('av-debt-free').nl[0]!, env).text).toMatch(/^USD: schuldenvrij in april 2028 \(over 1 jaar en 5 maanden, \$316\.87 rente\) met lawine, april 2028 .* alleen de minimumbedragen: oktober 2029 /);
    expect(ask(byId('av-debt-free').en[0]!, env).text).toContain('debt-free in Apr 2028 (in 1 year and 5 months, $316.87 interest) with avalanche; Apr 2028');
    const nl = ask(byId('goals-status').nl[0]!, env).text;
    expect(nl).toContain('• Emergency fund: 45% — $9,000 van $20,000, nog $11,000 te gaan; volgende geplande stap vr 20 nov');
    expect(ask(byId('goals-status').en[0]!, env).text).toContain('• Emergency fund: 45% — $9,000 of $20,000, $11,000 to go; next planned Fri, Nov 20');
    expect(ask(byId('agenda-today').nl[0]!, env).text).toContain('Vandaag (di 17 nov), uit je eigen gegevens:');
    expect(ask(byId('agenda-today').nl[0]!, env).text).toContain('(sinds ma 16 nov)');
  });
});

describe('ZIGi answers the same Dutch way (the exact layer is shared)', () => {
  const env = zigiEnv(showcaseAll());
  for (const id of ['read-done-dates-week', 'sleep-best-month', 'spend-biggest-expense', 'bills-next', 'focus-best-month', 'journal-last']) test(id, () => {
    const p = PILLARS.find(x => x.id === id)!, c = byId(id);
    expect(ask(c.en[0]!, env).text).toBe(p.en);
    expect(ask(c.nl[0]!, env).text).toBe(p.nl);
  });
});

describe('no Dutch answer in the corpus writes an English day or month name (every phrasing, Showcase and fresh)', () => {
  const showcase = novaEnv(showcaseAll()), fresh = novaEnv(freshAll());
  test('every Dutch phrasing', () => {
    const english: string[] = [];
    for (const c of CORPUS) for (const q of c.nl) for (const env of [showcase, fresh]) {
      const text = ask(q, env).text;
      if (ENGLISH_DATE.test(text)) english.push(`${c.id} “${q}”: ${text.slice(0, 120)}`);
    }
    expect(english).toEqual([]);
  }, 120_000);
});

describe('the corpus\'s date facts, in Dutch', () => {
  test('a date fact reads as the Dutch answer writes it; any other fact as it is', () => {
    expect(nlFact('Nov 3')).toBe('3 nov');
    expect(nlFact('Apr 16, 2027')).toBe('16 apr 2027');
    expect(nlFact('Apr 2028')).toBe('april 2028');
    expect(nlFact('62.5 kg')).toBe('62.5 kg');
    expect(nlFact('Mondays')).toBe('Mondays');
    expect(saysIn('med-notdone-month', 'nl')).toEqual(['3 nov', '12 nov']);
    expect(saysIn('med-notdone-month', 'en')).toEqual(['Nov 3', 'Nov 12']);
  });
});
