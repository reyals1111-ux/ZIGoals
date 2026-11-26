// @vitest-environment jsdom
import {afterEach, beforeEach, expect, test, vi} from 'vitest';
import {act, createElement as h} from 'react';
import {createRoot, type Root} from 'react-dom/client';
import {JournalCompose} from '../../components/journal/journal-compose';
import {JOURNAL_KEY} from './schema';
import {JOURNAL_DRAFT_KEY} from './draft';
import {periodChoices} from './periods';
import {journalDay} from './journal-day';

/**
 * Session AW (fr-journal, review fixes): the Journal's Write form in a page. A kept draft brings back its choices (what it
 * is about, a letter, its journal, a dream night); a draft that came back is not turned into a dream or a quote by the
 * address; text the secret guard flags is never kept (and removes a draft kept before); words another tab saved are not
 * brought back or kept again. Fictional words only.
 */
let element: HTMLDivElement, root: Root;
beforeEach(() => { vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true); localStorage.clear(); window.history.replaceState(null, '', '/app/journal'); element = document.createElement('div'); document.body.append(element); root = createRoot(element); });
afterEach(async () => { await act(async () => root.unmount()); element.remove(); vi.unstubAllGlobals(); window.history.replaceState(null, '', '/'); });
const settle = async (ms = 0) => { for (let i = 0; i < 10; i++) await act(async () => { await new Promise(r => setTimeout(r, ms / 10)); }); };
const AT = '2026-11-30T09:00:00.000Z';
const keep = (draft: Record<string, unknown>) => localStorage.setItem(JOURNAL_DRAFT_KEY, JSON.stringify({version: 1, draft: {at: AT, ...draft}}));
const kept = () => (JSON.parse(localStorage.getItem(JOURNAL_DRAFT_KEY) ?? 'null') as {draft?: {text?: string}} | null)?.draft ?? null;
const box = () => element.querySelector<HTMLTextAreaElement>('form[aria-label="Write in your journal"] textarea')!;
const labelled = (words: string) => [...element.querySelectorAll('label.field')].find(l => l.querySelector('span')?.textContent === words)?.querySelector('select, textarea') as HTMLSelectElement | HTMLTextAreaElement | undefined;
async function type(text: string) {
  const field = box(), set = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')!.set!;
  await act(async () => { set.call(field, text); field.dispatchEvent(new Event('input', {bubbles: true})); });
}
/** The guard and its Latin list have loaded (they load once the journal is open). */
async function guardReady() { for (let i = 0; i < 100 && !(await import('../secret-guard/word-lists')).wordListsFor('latin'); i++) await settle(20); await settle(20); }

test('a letter about this month, in another journal, comes back with its choices', async () => {
  const today = journalDay(), month = periodChoices(today).find(c => c.kind === 'month' && c.which === 'this')!.value;
  localStorage.setItem(JOURNAL_KEY, JSON.stringify({version: 1, entries: [], shareWithAi: false, followUps: true, journals: [{id: 'j-abcd1', name: 'Travel', theme: 'teal'}]}));
  keep({day: today, text: 'Dear future me, a fictional letter.', period: month, opens: 'year', book: 'j-abcd1'});
  await act(async () => root.render(h(JournalCompose)));
  await settle();
  expect(box().value).toBe('Dear future me, a fictional letter.');
  expect(labelled('Open this entry')!.value).toBe('year');
  expect(labelled('This entry is about')!.value).toBe(month);
  expect(labelled('Journal')!.value).toBe('j-abcd1');
  expect(element.querySelector('.journal-draft-line')!.textContent).toContain('Your unsaved draft is back.');
});

test('a dream draft comes back as a dream; an ordinary draft is not made a dream or a quote by the address', async () => {
  const today = journalDay();
  keep({day: today, text: 'A fictional dream about a lighthouse.', dream: today});
  await act(async () => root.render(h(JournalCompose)));
  await settle();
  expect(labelled('Your dream')!.value).toBe('A fictional dream about a lighthouse.');
  expect(element.querySelector('.journal-dream-line')).toBeTruthy();
  await act(async () => root.unmount());
  root = createRoot(element);
  window.history.replaceState(null, '', `/app/journal?dream=${today}&quote=ma-4-3`);
  keep({day: today, text: 'A fictional ordinary day.'});
  await act(async () => root.render(h(JournalCompose)));
  await settle(200);
  expect(labelled('Today’s entry')!.value).toBe('A fictional ordinary day.');
  expect(element.querySelector('.journal-dream-line')).toBeNull();
  expect(element.querySelector('.journal-status')!.textContent).not.toContain('The quote is in your entry');
});

test('recovery words are never kept, and a draft kept before goes', async () => {
  const today = journalDay();
  keep({day: today, text: 'A fictional morning.'});
  await act(async () => root.render(h(JournalCompose)));
  await settle();
  await guardReady();
  expect(kept()?.text).toBe('A fictional morning.');
  await type('abandon ability able about above absent absorb abstract absurd abuse access accident');
  await settle(1000);
  expect(localStorage.getItem(JOURNAL_DRAFT_KEY)).toBeNull();
  expect(element.querySelector('.secret-guard')).toBeTruthy();
  // An ordinary long sentence is kept again once the words are gone.
  await type('A fictional page: the market in the rain, and a long call with an old friend.');
  await settle(1000);
  expect(kept()?.text).toBe('A fictional page: the market in the rain, and a long call with an old friend.');
});

test('words another tab saved are not brought back, and are not kept again', async () => {
  const today = journalDay();
  const saved = (text: string) => JSON.stringify({version: 1, entries: [{id: 'e1', date: today, text, createdAt: AT}], shareWithAi: false, followUps: true});
  localStorage.setItem(JOURNAL_KEY, saved('A fictional walk.'));
  keep({day: today, text: 'A fictional walk.'});
  await act(async () => root.render(h(JournalCompose)));
  await settle();
  expect(box().value).toBe('');
  expect(localStorage.getItem(JOURNAL_DRAFT_KEY)).toBeNull();
  // Live: this tab holds words, the other tab saves them; the draft goes and the line says so.
  await guardReady();
  await type('A fictional swim in the lake.');
  await settle(1000);
  expect(kept()?.text).toBe('A fictional swim in the lake.');
  localStorage.setItem(JOURNAL_KEY, saved('A fictional swim in the lake.'));
  await act(async () => { window.dispatchEvent(new StorageEvent('storage', {key: JOURNAL_KEY})); });
  await settle(1000);
  expect(localStorage.getItem(JOURNAL_DRAFT_KEY)).toBeNull();
  expect(element.querySelector('.journal-draft-line')!.textContent).toContain('already saved in your journal');
});
