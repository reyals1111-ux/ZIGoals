import {describe, expect, it} from 'vitest';
import {readDeviceRecord, updateDeviceRecord} from './device-record';
import {MAX_SHOWN, MAX_TRACKED, WINDOW_MS, ZIGI_SUGGESTIONS, mentionsHealth, normaliseQuestion, recordAsk, removeSuggestion, setPinned, shownSuggestions, suggestionsSchema, trackedQuestions, type SuggestionsRecord} from './zigi-suggestions';
import {ZIGI_SUGGESTIONS_KEY} from './z-device-keys';

const DAY = 24 * 60 * 60 * 1000, T0 = Date.UTC(2026, 9, 1, 9);
const open = {healthShared: true}, closed = {healthShared: false};
const ask = (record: SuggestionsRecord, text: string, at: number, gate = open) => recordAsk(record, text, at, gate);
const thrice = (text: string, start = T0, gate = open, record: SuggestionsRecord = {version: 1}) => ask(ask(ask(record, text, start, gate), text, start + DAY, gate), text, start + 2 * DAY, gate);

describe('normaliseQuestion', () => {
  it('folds case, spacing and punctuation, and keeps numbers as written', () => {
    expect(normaliseQuestion('  How many   minutes did I meditate?? ')).toBe('how many minutes did i meditate');
    expect(normaliseQuestion('How many minutes did I meditate')).toBe(normaliseQuestion('how many MINUTES, did i meditate!'));
    expect(normaliseQuestion('Log 2 glasses')).not.toBe(normaliseQuestion('Log 3 glasses'));
    expect(normaliseQuestion('Add 2,5 km')).toBe(normaliseQuestion('add 2.5 km'));
    expect(normaliseQuestion('Add 25 km')).not.toBe(normaliseQuestion('add 2.5 km'));
    expect(normaliseQuestion('Hoeveel stappen heb ik gezet?')).toBe('hoeveel stappen heb ik gezet');
  });
  it('is no question for a slash command, a very short or a very long text', () => {
    expect(normaliseQuestion('/help')).toBeNull();
    expect(normaliseQuestion('ok')).toBeNull();
    expect(normaliseQuestion('?!?')).toBeNull();
    expect(normaliseQuestion('x'.repeat(301))).toBeNull();
  });
});

describe('promotion: three asks within thirty days', () => {
  it('becomes a card at the third ask, not before', () => {
    const two = ask(ask({version: 1}, 'How did my week go?', T0), 'how did my week go', T0 + DAY);
    expect(shownSuggestions(two, open)).toEqual([]);
    const three = ask(two, 'How did my week go?!', T0 + 2 * DAY);
    expect(shownSuggestions(three, open)).toEqual([{key: 'how did my week go', text: 'How did my week go?!', pinned: false}]);
  });
  it('asks older than thirty days no longer count', () => {
    let record = ask({version: 1}, 'Weekly money summary', T0);
    record = ask(record, 'Weekly money summary', T0 + 1 * DAY);
    record = ask(record, 'Weekly money summary', T0 + WINDOW_MS + 2 * DAY);
    expect(shownSuggestions(record, open)).toEqual([]);
    expect(record.questions!['weekly money summary']!.asks).toEqual([T0 + WINDOW_MS + 2 * DAY]);
  });
  it('keeps a promoted question after its asks age out, until the person removes it', () => {
    let record = thrice('Show my goals');
    record = ask(record, 'Something else entirely', T0 + 90 * DAY);
    expect(shownSuggestions(record, open).map(s => s.key)).toEqual(['show my goals']);
    record = removeSuggestion(record, 'show my goals');
    expect(shownSuggestions(record, open)).toEqual([]);
    expect(JSON.stringify(record)).not.toContain('Show my goals');
    // Asked three more times, it returns.
    expect(shownSuggestions(thrice('Show my goals', T0 + 100 * DAY, open, record), open)).toHaveLength(1);
  });
});

describe('caps, pins and order', () => {
  it('shows at most twelve: pinned first, then the most recent', () => {
    let record: SuggestionsRecord = {version: 1};
    for (let i = 0; i < 15; i++) record = thrice(`Question number ${i}`, T0 + i * 3 * DAY, open, record);
    expect(shownSuggestions(record, open)).toHaveLength(MAX_SHOWN);
    expect(shownSuggestions(record, open)[0]!.key).toBe('question number 14');
    record = setPinned(record, 'question number 0', true);
    const shown = shownSuggestions(record, open);
    expect(shown).toHaveLength(MAX_SHOWN);
    expect(shown[0]).toEqual({key: 'question number 0', text: 'Question number 0', pinned: true});
    expect(shownSuggestions(setPinned(record, 'question number 0', false), open)[0]!.key).toBe('question number 14');
  });
  it('tracks at most two hundred questions, dropping the least recently asked and never a pinned one', () => {
    let record = setPinned(thrice('Keep me'), 'keep me', true);
    for (let i = 0; i < MAX_TRACKED + 20; i++) record = ask(record, `Unique question ${i}`, T0 + 3 * DAY + i * 1000);
    expect(Object.keys(record.questions!)).toHaveLength(MAX_TRACKED);
    expect(record.questions!['keep me']!.pinned).toBe(true);
    expect(record.questions!['unique question 0']).toBeUndefined();
    expect(record.questions![`unique question ${MAX_TRACKED + 19}`]).toBeDefined();
    expect(suggestionsSchema.safeParse(record).success).toBe(true);
  });
});

describe('Health (owner plan edit 9)', () => {
  it('a Health question is not recorded at all while Health is not shared with ZIGi', () => {
    const record = thrice('How much water did I drink today?', T0, closed);
    expect(record).toEqual({version: 1});
    expect(mentionsHealth('Hoeveel heb ik geslapen?')).toBe(true);
    expect(mentionsHealth('Wat heb ik gisteren gegeten?')).toBe(true);
    expect(mentionsHealth('Hoeveel heb ik gespaard?')).toBe(false);
    expect(mentionsHealth('Hoe was mijn slaap deze week?')).toBe(true);
    expect(mentionsHealth('What did I weigh on Monday?')).toBe(true);
    expect(mentionsHealth('How are my savings goals?')).toBe(false);
  });
  it('one recorded while Health was shared shows only while it still is', () => {
    const record = thrice('How did I sleep this week?');
    expect(record.questions!['how did i sleep this week']!.health).toBe(true);
    expect(shownSuggestions(record, open)).toHaveLength(1);
    expect(shownSuggestions(record, closed)).toEqual([]);
    expect(trackedQuestions(record)).toEqual([{key: 'how did i sleep this week', text: 'How did I sleep this week?', asks: 3, promoted: true, pinned: false, health: true}]);
  });
  it('other questions are recorded whatever the Health gate', () => {
    expect(shownSuggestions(thrice('How are my savings goals?', T0, closed), closed)).toHaveLength(1);
  });
});

describe('storage', () => {
  const memory = () => { const map = new Map<string, string>(); return {getItem: (k: string) => map.get(k) ?? null, setItem: (k: string, v: string) => void map.set(k, v), map}; };
  it('lives in its own device key, read tolerantly; unknown fields survive', () => {
    const storage = memory();
    expect(ZIGI_SUGGESTIONS.key).toBe(ZIGI_SUGGESTIONS_KEY);
    expect(ZIGI_SUGGESTIONS_KEY).toBe('zigoals:zigi-suggestions:v1');
    storage.setItem(ZIGI_SUGGESTIONS_KEY, JSON.stringify({version: 1, later: {x: 1}, questions: {'how did my week go': {text: 'How did my week go?', asks: [T0], future: true}}}));
    const next = updateDeviceRecord(storage, ZIGI_SUGGESTIONS, r => ask(r, 'How did my week go?', T0 + DAY));
    expect(next).toMatchObject({later: {x: 1}, questions: {'how did my week go': {future: true, asks: [T0, T0 + DAY]}}});
    storage.setItem(ZIGI_SUGGESTIONS_KEY, '{not json');
    expect(readDeviceRecord(storage, ZIGI_SUGGESTIONS)).toEqual({data: {version: 1}, unreadable: true});
    expect(storage.getItem(ZIGI_SUGGESTIONS_KEY)).toBe('{not json');
  });
});
