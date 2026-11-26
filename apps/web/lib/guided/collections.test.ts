import {describe, expect, it} from 'vitest';
import {COLLECTIONS, ITEM_KIND_LABEL, collectionById, itemWords} from './collections';
import {COLLECTION_IDS, COLLECTION_TITLES, collectionHref} from './collection-titles';
import {LESSON_CARE, SLEEP_LESSONS, lessonWords} from './sleep-lessons';
import {GUIDED_PROGRAMS, PROGRAMME_CARE, programById} from './programs';
import {GUIDES} from '../meditation/guides';
import {STRETCHES} from '../calm/stretches';

/**
 * Session AW (content; owner decision 1d, ADR-046; LEDGER #82 written collections, #278 insomnia lessons): the four
 * collections group what the app already has, and the seven sleep lessons are general guidance with the care line.
 */
const all = (c: (typeof COLLECTIONS)[number]) => [c.title, c.intro, ...c.items.flatMap(i => [i.title, i.note, ...(i.text ?? [])]), ...(c.lessons ?? []).flatMap(l => [l.title, ...l.paragraphs])];
// The programmes' own check (lib/guided/programmes.test.ts), and "will help", "fixes" and "insomnia cure" besides.
const PROMISE = /recommend|you should|you must|guarantee|you will (?:be|get|lose|feel|sleep)|will help|results? in|burn|kcal|calorie|lose weight|cure|treat|fix(?:es)? your|diagnos/i;

describe('Collections (LEDGER #82)', () => {
  it('are the four themes, their literal titles equal their own, in order', () => {
    expect(COLLECTIONS.map(c => c.id)).toEqual(['sleep-better', 'calm-down', 'move-gently', 'start-a-habit']);
    expect(COLLECTION_IDS).toEqual(COLLECTIONS.map(c => c.id));
    for (const c of COLLECTIONS) expect(COLLECTION_TITLES[c.id], c.id).toBe(c.title);
    expect(collectionById('calm-down')?.title).toBe('Calm down');
    expect(collectionById('nope')).toBeUndefined();
    expect(collectionHref('sleep-better')).toBe('/app/guided?collection=sleep-better');
  });
  it('give each a short intro and a few items, each with a title, a note and a place inside the app', () => {
    for (const c of COLLECTIONS) {
      expect(c.intro.length, c.id).toBeGreaterThan(40);
      expect(c.intro.length, c.id).toBeLessThanOrEqual(240);
      expect(c.items.length, c.id).toBeGreaterThanOrEqual(5);
      expect(c.items.length, c.id).toBeLessThanOrEqual(10);
      expect(new Set(c.items.map(i => i.id)).size, c.id).toBe(c.items.length);
      for (const i of c.items) {
        const where = `${c.id}/${i.id}`;
        expect(i.id, where).toMatch(/^[a-z0-9-]{1,60}$/);
        expect(ITEM_KIND_LABEL[i.kind], where).toBeTruthy();
        expect(i.title.trim().length, where).toBeGreaterThan(3);
        expect(i.note.trim().length, where).toBeGreaterThan(10);
        // Exactly one way in: a programme or journey on this page, or a link to the place it is done.
        expect(!!i.onPage !== !!i.action, where).toBe(true);
        if (i.onPage) expect(programById(i.onPage), where).toBeTruthy();
        if (i.action) {
          expect(i.action.href.startsWith('/app/'), i.action.href).toBe(true);
          expect(new URL(i.action.href, 'https://example.test').origin).toBe('https://example.test');
          expect(i.action.label.trim().length).toBeGreaterThan(3);
        }
      }
    }
  });
  it('group what already exists: the five written programmes, the four longer journeys, the meditation guides and every stretch', () => {
    const onPage = new Set(COLLECTIONS.flatMap(c => c.items.flatMap(i => i.onPage ? [i.onPage] : [])));
    for (const p of GUIDED_PROGRAMS.filter(x => x.days)) expect(onPage.has(p.id), p.id).toBe(true);
    for (const id of ['calm-mind', 'walking-start', 'reading-start']) expect(onPage.has(id), id).toBe(true);
    const guides = new Set(COLLECTIONS.flatMap(c => c.items.filter(i => i.kind === 'guide').map(i => i.id.replace(/^guide-/, ''))));
    expect(guides.size).toBeGreaterThanOrEqual(8);
    for (const id of guides) expect(GUIDES.some(g => g.id === id), id).toBe(true);
    const stretches = new Set(COLLECTIONS.flatMap(c => c.items.filter(i => i.kind === 'stretch').map(i => i.id.replace(/^stretch-/, ''))));
    expect([...stretches].sort()).toEqual(STRETCHES.map(s => s.id).sort());
  });
  it('takes a guide’s and a stretch’s words from their own source, read in place and aloud', () => {
    const evening = collectionById('sleep-better')!.items.find(i => i.id === 'guide-evening')!;
    const g = GUIDES.find(x => x.id === 'evening')!;
    expect(evening.title).toBe(`${g.en.title}, ${g.minutes} minutes`);
    expect(evening.text).toEqual(g.en.steps);
    expect(itemWords(evening)).toBe(`${evening.title}. ${g.en.steps.join(' ')}`);
    const unwind = collectionById('move-gently')!.items.find(i => i.id === 'stretch-evening-unwind')!;
    expect(unwind.text![0]).toBe(`${STRETCHES.find(s => s.id === 'evening-unwind')!.steps[0]!.en.name}: ${STRETCHES.find(s => s.id === 'evening-unwind')!.steps[0]!.en.cue}`);
  });
  it('shows the care line on the health collections; promises nothing', () => {
    for (const id of ['sleep-better', 'calm-down', 'move-gently']) expect(collectionById(id)!.care?.startsWith(PROGRAMME_CARE), id).toBe(true);
    for (const c of COLLECTIONS) expect(all(c).join('\n'), c.id).not.toMatch(PROMISE);
  });
});

describe('Sleep lessons (LEDGER #278)', () => {
  it('are seven short lessons in the Sleep better collection, on the themes asked for', () => {
    expect(collectionById('sleep-better')!.lessons).toBe(SLEEP_LESSONS);
    expect(SLEEP_LESSONS.map(l => l.id)).toEqual(['wake-time', 'wind-down', 'bed-for-sleep', 'twenty-minutes', 'light-caffeine', 'worry-time', 'see-a-doctor']);
    for (const c of COLLECTIONS.filter(x => x.id !== 'sleep-better')) expect(c.lessons, c.id).toBeUndefined();
    for (const l of SLEEP_LESSONS) {
      expect(l.id).toMatch(/^[a-z0-9-]{1,60}$/);
      expect(l.paragraphs.length, l.id).toBeGreaterThanOrEqual(1);
      expect(l.paragraphs.length, l.id).toBeLessThanOrEqual(3);
      const words = l.paragraphs.join(' ');
      expect(words.length, l.id).toBeGreaterThan(120);
      expect(words.length, l.id).toBeLessThanOrEqual(520);
      if (l.action) expect(l.action.href.startsWith('/app/'), l.id).toBe(true);
    }
    expect(SLEEP_LESSONS.find(l => l.id === 'twenty-minutes')!.paragraphs[0]).toMatch(/twenty minutes, get up/);
  });
  it('carries the care line in every lesson, read aloud too; the last says to see a doctor if sleep stays hard', () => {
    expect(LESSON_CARE).toBe('General guidance, not medical advice.');
    expect(PROGRAMME_CARE.startsWith('General guidance, not medical advice')).toBe(true);
    SLEEP_LESSONS.forEach((l, i) => expect(lessonWords(l, i + 1)).toBe([`Lesson ${i + 1}. ${l.title}.`, ...l.paragraphs, LESSON_CARE].join(' ')));
    const last = SLEEP_LESSONS.at(-1)!;
    expect(last.title).toBe('When to see a doctor');
    expect(last.paragraphs.join(' ')).toMatch(/If sleep stays hard .*see a doctor/);
  });
  it('promises no result and gives no orders', () => {
    const words = SLEEP_LESSONS.flatMap(l => [l.title, ...l.paragraphs]).join('\n');
    expect(words).not.toMatch(PROMISE);
    expect(words).not.toMatch(/\b(?:will (?:fall|sleep|wake)|always works|insomnia)\b/i);
  });
});
