import {describe, expect, test} from 'vitest';
import {collectEverything} from '../export/everything';
import {nextValue, planParts} from '../restore/plan';
import {emptyJournal, JOURNAL_KEY, journalSchema} from './schema';

/**
 * Session AV lane 2 (bodymind-r2; LEDGER #230; TIER 3 (stored formats), additive): the journal's daily-challenge choice and
 * the last day Done was tapped. An older record reads as before; an unreadable value is dropped, never failing the
 * journal; Export everything → erase → Restore keeps both.
 */
const AT = '2026-11-20T08:00:00.000Z';
const WITH = journalSchema.parse({...emptyJournal(), entries: [{id: 'e1', date: '2026-11-20', text: 'Fictional day.', createdAt: AT}], affirmations: true, challenges: true, challengeDone: '2026-11-20'});

describe('the daily challenge fields', () => {
  test('an older record reads as before, with neither field', () => {
    const old = journalSchema.parse({version: 1, entries: [], shareWithAi: false, followUps: true});
    expect(old.challenges).toBeUndefined();
    expect(old.challengeDone).toBeUndefined();
  });
  test('kept when they read, dropped one by one when not', () => {
    expect(WITH).toMatchObject({challenges: true, challengeDone: '2026-11-20'});
    const odd = journalSchema.parse({...WITH, challenges: 'yes', challengeDone: 'Friday'});
    expect(odd.challenges).toBeUndefined();
    expect(odd.challengeDone).toBeUndefined();
    expect(odd.entries).toHaveLength(1);
  });
  test('Export everything → erase → Restore keeps them', () => {
    const collected = collectEverything({[JOURNAL_KEY]: JSON.stringify(WITH)}, {now: new Date(AT), version: '0.1.0', commit: 'a'.repeat(40), localSimulation: null});
    const part = planParts(JSON.parse(JSON.stringify(collected.json))).find(p => p.id === 'device:journal');
    expect(part).toBeDefined();
    const back = nextValue(part!, 'replace', undefined);
    expect('value' in back && journalSchema.parse(back.value)).toEqual(WITH);
  });
});
