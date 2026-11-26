import {describe, expect, test} from 'vitest';
import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {DRAFT_DELAY_MS, JOURNAL_DRAFT_KEY, draftBackLine, draftOf, draftWorthKeeping, journalDraftSchema, keepJournalDraft, readJournalDraft} from './draft';
import {MAX_TEXT} from './schema';
import {ALL_TEMPLATES, onlyHeadings, templateText} from '../journal-prompts/templates';

/**
 * Session AW (fr-journal, FR-AW-1): the Journal's unsaved entry is kept on this device and comes back; only the person's own
 * words are kept; Save entry sits right under the box, before the optional extras. Fictional words only.
 */
function store(initial: Record<string, string> = {}) {
  const items = new Map(Object.entries(initial)), writes: string[] = [];
  return {writes, items, getItem: (k: string) => items.get(k) ?? null, setItem: (k: string, v: string) => { writes.push(k); items.set(k, v); }, removeItem: (k: string) => { writes.push(`-${k}`); items.delete(k); }};
}
const NOW = new Date('2026-11-30T09:15:00.000Z');

describe('the journal draft record', () => {
  test('kept and read back: words, tags as typed and the template', () => {
    const s = store();
    const draft = draftOf({day: '2026-11-30', text: 'A fictional walk by the canal.', tags: 'walk, ', template: {id: 'gratitude', lang: 'en'}, now: NOW, worth: true})!;
    keepJournalDraft(s, draft);
    expect(JSON.parse(s.items.get(JOURNAL_DRAFT_KEY)!)).toEqual({version: 1, draft: {day: '2026-11-30', text: 'A fictional walk by the canal.', at: NOW.toISOString(), tags: 'walk, ', template: {id: 'gratitude', lang: 'en'}}});
    expect(readJournalDraft(s)).toEqual(draft);
  });
  test('nothing to keep removes it; empty tags and no template are left out', () => {
    const s = store();
    keepJournalDraft(s, draftOf({day: '2026-11-30', text: 'Fictional.', tags: '  ', template: null, now: NOW, worth: true}));
    expect(readJournalDraft(s)).toEqual({day: '2026-11-30', text: 'Fictional.', at: NOW.toISOString()});
    keepJournalDraft(s, draftOf({day: '2026-11-30', text: 'Fictional.', tags: '', template: null, now: NOW, worth: false}));
    expect(s.items.has(JOURNAL_DRAFT_KEY)).toBe(false);
    expect(readJournalDraft(s)).toBeNull();
  });
  test('a long entry is kept up to the journal\'s own limit', () => {
    const d = draftOf({day: '2026-11-30', text: 'w'.repeat(MAX_TEXT + 50), tags: '', template: null, now: NOW, worth: true})!;
    expect(d.text).toHaveLength(MAX_TEXT);
    expect(journalDraftSchema.safeParse(d).success).toBe(true);
  });
  test('bytes this build cannot read come back as no draft and are never rewritten by a read', () => {
    const s = store({[JOURNAL_DRAFT_KEY]: '{not json'});
    expect(readJournalDraft(s)).toBeNull();
    expect(s.writes).toEqual([]);
    expect(s.items.get(JOURNAL_DRAFT_KEY)).toBe('{not json');
    expect(readJournalDraft(store({[JOURNAL_DRAFT_KEY]: JSON.stringify({version: 1, draft: {day: '2026-11-30', text: '   ', at: NOW.toISOString()}})}))).toBeNull();
  });
  test('loose: a field from a later build is kept; an unreadable template or tags drop alone', () => {
    const raw = {version: 1, later: true, draft: {day: '2026-11-30', text: 'Fictional.', at: NOW.toISOString(), mood: 3, template: {id: 'Bad Id', lang: 'en'}, tags: 5}};
    const read = readJournalDraft(store({[JOURNAL_DRAFT_KEY]: JSON.stringify(raw)}))!;
    expect(read.text).toBe('Fictional.');
    expect(read.template).toBeUndefined();
    expect(read.tags).toBeUndefined();
    expect((read as Record<string, unknown>).mood).toBe(3);
  });
  test('a storage that refuses throws, so the page can say the words were not kept', () => {
    const refuses = {getItem: () => null, setItem: () => { throw new Error('QuotaExceededError'); }, removeItem: () => undefined};
    expect(() => keepJournalDraft(refuses, draftOf({day: '2026-11-30', text: 'Fictional.', tags: '', template: null, now: NOW, worth: true}))).toThrow();
  });
  test('the draft is written soon after typing rests', () => {
    expect(DRAFT_DELAY_MS).toBeGreaterThan(0);
    expect(DRAFT_DELAY_MS).toBeLessThanOrEqual(1000);
  });
});

describe('only the person\'s own words are kept', () => {
  test('empty, a template\'s headings or the words a template put in are not a draft', () => {
    expect(draftWorthKeeping('', [], onlyHeadings)).toBe(false);
    expect(draftWorthKeeping('   \n', [], onlyHeadings)).toBe(false);
    const t = ALL_TEMPLATES.find(x => !x.body)!;
    expect(draftWorthKeeping(templateText(t, 'en'), [], onlyHeadings)).toBe(false);
    expect(draftWorthKeeping(templateText(t, 'nl'), [], onlyHeadings)).toBe(false);
    expect(draftWorthKeeping('My own template’s words\n', ['My own template’s words\n'], onlyHeadings)).toBe(false);
    expect(draftWorthKeeping(`${templateText(t, 'en')}A fictional line under it.`, [templateText(t, 'en')], onlyHeadings)).toBe(true);
    expect(draftWorthKeeping('A fictional day at the market.', [null, undefined], onlyHeadings)).toBe(true);
  });
});

describe('the line when it comes back', () => {
  test('today\'s draft says so plainly; an older one names its day and where it saves', () => {
    expect(draftBackLine({day: '2026-11-30'}, '2026-11-30')).toBe('Your unsaved draft is back.');
    const older = draftBackLine({day: '2026-11-29'}, '2026-11-30');
    expect(older).toMatch(/^Your unsaved draft from .+ is back\. Saving files it under today\.$/);
    expect(older).toMatch(/29/);
  });
});

describe('the Journal page (source)', () => {
  const src = readFileSync(join(__dirname, '../../components/journal/journal-compose.tsx'), 'utf8');
  const draft = readFileSync(join(__dirname, 'draft.ts'), 'utf8');
  test('Save entry comes right after the box, before every optional extra', () => {
    const at = (s: string) => { const i = src.indexOf(s); expect(i, s).toBeGreaterThan(-1); return i; };
    const box = at('<textarea ref={words}'), save = at("'Save entry'"), extras = at('className="journal-compose-extras"');
    expect(box).toBeLessThan(save);
    expect(save).toBeLessThan(extras);
    for (const extra of ['<summary>Link another day', '<span>Tags — optional', '<legend>Open it later, as a letter', '<span>This entry is about', '<summary>Start from a prompt', '<summary>Photos and a voice note', '<summary>Prompt packs']) expect(at(extra), extra).toBeGreaterThan(extras);
    // One Save entry in the form, and the problem line next to it.
    expect(src.match(/'Save entry'/g)).toHaveLength(1);
    expect(at('{problem && <p role="alert">')).toBeLessThan(save);
    expect(at('<SecretGuard text={text}')).toBeLessThan(save);
  });
  test('the draft comes back with one line and Discard draft; Save entry removes it', () => {
    expect(src).toContain('draftBackLine(draftBack, today)');
    expect(src).toContain('>Discard draft</button>');
    expect(src).toMatch(/if \(!compact\) forgetDraft\(\);/);
    expect(src).toMatch(/addEventListener\('pagehide'/);
  });
  test('the words are never sent or logged', () => {
    for (const s of [draft]) expect(s).not.toMatch(/\bfetch\(|console\.|sendBeacon|XMLHttpRequest/);
    const block = src.slice(src.indexOf('const pendingDraft'), src.indexOf("if (!journal.loaded || !energy.loaded) return"));
    expect(block.length).toBeGreaterThan(100);
    expect(block).not.toMatch(/\bfetch\(|console\.|sendBeacon|XMLHttpRequest/);
  });
});
