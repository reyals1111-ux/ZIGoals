import {afterEach, describe, expect, test} from 'vitest';
import {followupsFor} from './followups';
import {seriesSummary, statOf, type Series} from './viz';
import {cardInLanguage} from './actions/aw-p5-card-nl';
import {HEALTH_CLOSED, HEALTH_CLOSED_NL} from './tools/format';
import {novaHealthClosed} from './local-answers/nova-env';
import {setDisplayLocale} from '../visual-format';
import type {ToolResult} from './tools/types';

/**
 * Session AW (fr-answers; FRIEND_READINESS-aw FR-AW-9, FR-AW-10): the words around an answer in the conversation's
 * language — the chart's caption, the stat card and the follow-up chips — and the Health-closed replies without the
 * doubt-inducing bracket, the card to NOVA → Permissions naming the place, never its path.
 */
afterEach(() => setDisplayLocale('en-US'));
const water: Series = {title: 'Water per day', unit: 'mL', shape: 'bars', points: [{date: '2026-11-30', value: 1000}, {date: '2026-12-01', value: 500}, {date: '2026-12-03', value: 1000}, {date: '2026-12-06', value: 500}]};

describe('FR-AW-10: the chart caption, the stat card and the chips in Dutch for a Dutch question', () => {
  test('the caption: Dutch words, Dutch dates and Dutch figures, whatever the display locale', () => {
    for (const locale of ['en-US', 'en-GB', 'nl-NL']) {
      setDisplayLocale(locale);
      expect(seriesSummary(water, 'nl'), locale).toBe('Water per dag: 4 dagen met een registratie van 30 nov 2026 tot 6 dec 2026, 3.000 mL in totaal, het meest 1.000 mL op 30 nov 2026.');
    }
    const weight: Series = {title: 'Weight readings', unit: 'kg', shape: 'line', points: [{date: '2026-11-30', value: 68.4}, {date: '2026-12-03', value: 68.1}]};
    expect(seriesSummary(weight, 'nl')).toBe('Gewichtsmetingen: 2 dagen met een registratie van 30 nov 2026 tot 3 dec 2026, van 68,4 kg naar 68,1 kg; laagste 68,1 kg op 3 dec 2026, hoogste 68,4 kg op 30 nov 2026.');
    expect(seriesSummary({...water, title: 'Steps per day', unit: 'steps'}, 'nl')).toMatch(/^Stappen per dag: .* stappen in totaal/);
  });
  test('English stays word for word', () => {
    setDisplayLocale('en-US');
    expect(seriesSummary(water)).toBe('Water per day: 4 days with a record from Nov 30, 2026 to Dec 6, 2026, 3,000 mL in all, the most 1,000 mL on Nov 30, 2026.');
    expect(seriesSummary(water, 'en')).toBe(seriesSummary(water));
  });
  test('the stat card', () => {
    const result = {ok: true, tool: 'water', label: 'Water · this week', provenance: 'From your Health records', data: {totalMl: 3000, daysWithWater: 4, daysInRange: 7}} as unknown as ToolResult;
    expect(statOf(result, 'nl')).toEqual({value: '3.000 mL', label: 'Water · deze week', detail: '4 van 7 dagen met een registratie', source: 'From your Health records'});
    expect(statOf(result)).toMatchObject({label: 'Water · this week', detail: '4 of 7 days with a record'});
  });
  test('a habit\'s and a counter\'s stat card in Dutch too (review)', () => {
    const habit = {ok: true, tool: 'habit_stats', label: 'Meditate · this month', provenance: 'From your Habits journal on this device', data: {valueText: '120 minutes', checkIns: 12, days: {inRange: 17}}} as unknown as ToolResult;
    expect(statOf(habit, 'nl')).toEqual({value: '120 minuten', label: 'Meditate · deze maand', detail: '12 check-ins in 17 dagen', source: 'From your Habits journal on this device'});
    expect(statOf(habit)).toEqual({value: '120 minutes', label: 'Meditate · this month', detail: '12 check-ins over 17 days', source: 'From your Habits journal on this device'});
    const streak = {...habit, data: {valueText: '3 days now, best 9 days', checkIns: 3, days: {inRange: 7}}} as unknown as ToolResult;
    expect(statOf(streak, 'nl')).toMatchObject({value: 'nu 3 dagen, beste 9 dagen', detail: '3 check-ins in 7 dagen'});
    const counter = {ok: true, tool: 'counters', label: 'Push-ups · this week', provenance: 'From your Health records', data: {counters: [{total: 1250, daysWithEntry: 1}]}} as unknown as ToolResult;
    expect(statOf(counter, 'nl')).toEqual({value: '1.250 keer', label: 'Push-ups · deze week', detail: 'op 1 dag', source: 'From your Health records'});
    expect(statOf(counter)).toMatchObject({value: '1,250 times', detail: 'on 1 day'});
    expect(seriesSummary({title: 'Meditate per day', unit: 'minutes', shape: 'bars', points: [{date: '2026-11-16', value: 10}, {date: '2026-11-17', value: 20}]}, 'nl')).toBe('Meditate per dag: 2 dagen met een registratie van 16 nov 2026 tot 17 nov 2026, 30 minuten in totaal, het meest 20 minuten op 17 nov 2026.');
  });
  test('the follow-up chips: Dutch in a Dutch conversation, English otherwise', () => {
    expect(followupsFor([{tool: 'sleep_summary'}], 'Hoe heb ik deze week geslapen?', 3, 'nl')).toEqual(['Hoe heb ik vannacht geslapen?', 'Hoe regelmatig is mijn bedtijd?']);
    expect(followupsFor([{tool: 'sleep_summary'}], 'How did I sleep this week?')).toEqual(['How did I sleep last night?', 'How consistent is my bedtime?']);
    expect(followupsFor([{tool: 'water', args: {range: 'this week'}}], 'Hoeveel water?', 3, 'nl')).toEqual(['Hoeveel water heb ik gisteren gedronken?']);
    expect(followupsFor([{tool: 'habit_stats', args: {habit: 'Lezen', range: 'last week'}}], 'x', 3, 'nl')).toEqual(['Hoe vaak heb ik Lezen deze week gedaan?', 'Wat is mijn langste reeks voor Lezen?']);
    // Every tool that has English chips has Dutch ones, none English.
    for (const tool of ['habit_stats', 'goal_progress', 'list_goals', 'water', 'steps', 'nutrient_totals', 'diary_entries', 'holdings', 'sleep_nights', 'sleep_summary', 'meditation_summary', 'vitals', 'net_worth', 'milestones', 'chess_ratings', 'chess_games']) {
      const nl = followupsFor([{tool, args: {habit: 'Lezen', goal: 'Fiets'}}], 'x', 3, 'nl'), en = followupsFor([{tool, args: {habit: 'Lezen', goal: 'Fiets'}}], 'x');
      expect(nl.length, tool).toBe(en.length);
      for (const q of nl) expect(q, tool).not.toMatch(/\b(?:how|what|did|my|last|this|today)\b/i);
    }
  });
});

describe('FR-AW-9: the Health-closed replies say only what is true; the card names the place', () => {
  test('no bracket about the Today page in any of the replies', () => {
    for (const t of [HEALTH_CLOSED, HEALTH_CLOSED_NL, novaHealthClosed({healthScope: false, healthGate: false}, 'en'), novaHealthClosed({healthScope: false, healthGate: false}, 'nl'), novaHealthClosed({healthScope: true, healthGate: false})]) {
      expect(t).not.toMatch(/once Health is on your Today page|zodra Health op je Today-pagina staat|\(/);
      expect(t).toMatch(/Allow Health in NOVA → Permissions/);
    }
  });
  test('the card to NOVA → Permissions: a place\'s name, never a path; in Dutch under a Dutch reply', () => {
    const card = {ok: true as const, plan: {card: {kind: 'open-page', title: 'Open NOVA → Permissions', lines: ['Opens NOVA → Permissions, where Allow Health is', 'Nothing is written']}}};
    expect(cardInLanguage(card, 'nl').plan.card.lines).toEqual(['Opent NOVA → Permissions, waar Allow Health staat', 'Er wordt niets opgeslagen']);
    expect(cardInLanguage(card, 'en')).toBe(card);
    for (const line of card.plan.card.lines) expect(line).not.toMatch(/\/app\//);
  });
});
