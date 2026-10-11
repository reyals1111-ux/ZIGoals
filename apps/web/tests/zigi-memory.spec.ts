import {expect, test, type Page, type Route} from '@playwright/test';
import {buildShowcase} from '../lib/showcase-data';
import {DASHBOARD_SETTINGS_KEY, presetSettings} from '../lib/dashboard-settings';
import {WHATS_NEW_KEY, WHATS_NEW_RELEASE} from '../lib/whats-new';
import {AI_SETTINGS_KEY, defaultAiSettings, type AiSettings} from '../lib/ai/settings';
import {AI_ACTIONS_KEY, AI_MEMORY_KEY, AI_OPTIONS_KEY} from '../lib/ai/store/keys';
import {SECRET_REFUSAL} from '../lib/ai/memory';
import {readStoredZip} from '../lib/export/zip-reader';

/**
 * Session V Part 8, "What ZIGi knows about me": the person's notes in Settings (add, edit, delete with Undo, delete
 * all; nothing written on view; secret-shaped text never kept; in "Export everything"), the notes in what ZIGi sends only
 * while "Use my notes" is on (a removable "About me" chip; a health note only with the Health gate), the "Remember
 * this?" card from a MOCK reply, and Showcase notes kept apart in the tab. Every answer is a MOCK.
 */
const BASE = 'http://127.0.0.1:1234', DAY = '2026-09-20', EVENING = '2026-09-20T19:00:00.000Z';
const chunk = (delta: Record<string, unknown>, finish: string | null = null) => `data: ${JSON.stringify({id: 'mock', object: 'chat.completion.chunk', choices: [{index: 0, delta, finish_reason: finish}]})}\n\n`;
const stream = (text: string) => [chunk({role: 'assistant', content: text}), chunk({}, 'stop'), 'data: [DONE]\n\n'].join('');
const block = (value: unknown) => `\`\`\`zigoals-action\n${JSON.stringify(value)}\n\`\`\``;
type Body = {messages: {role: string; content: unknown}[]};
async function server(page: Page, reply: (body: Body) => string) {
  const bodies: Body[] = [];
  const handler = async (route: Route) => {
    const url = route.request().url();
    if (url.endsWith('/v1/models')) return route.fulfill({status: 200, contentType: 'application/json', body: JSON.stringify({object: 'list', data: [{id: 'mock-chat'}]})});
    if (url.endsWith('/v1/chat/completions')) { const body = JSON.parse(route.request().postData() ?? '{}') as Body; bodies.push(body); return route.fulfill({status: 200, contentType: 'text/event-stream', body: stream(reply(body))}); }
    return route.fulfill({status: 404, body: ''});
  };
  await page.route(`${BASE}/**`, handler);
  return bodies;
}
const note = (id: string, text: string, category: string, source = 'person') => ({id, text, category, source, createdAt: '2026-09-19T08:00:00.000Z', updatedAt: '2026-09-19T08:00:00.000Z'});
async function seed(page: Page, settings: Partial<AiSettings> | null, extra: Record<string, string> = {}) {
  await page.clock.install({time: EVENING});
  await page.goto('/app/settings');
  const ai = settings ? {[AI_SETTINGS_KEY]: JSON.stringify({...defaultAiSettings(), enabled: true, mode: 'local', provider: 'local', model: 'mock-chat', localServer: 'openai-compatible', baseUrl: BASE, ...settings}), [AI_OPTIONS_KEY]: JSON.stringify({version: 1, toolMode: 'attach'})} : {};
  await page.evaluate(values => { localStorage.clear(); sessionStorage.clear(); for (const [k, v] of Object.entries(values)) localStorage.setItem(k, v); }, {...buildShowcase(DAY).records, [DASHBOARD_SETTINGS_KEY]: JSON.stringify({...presetSettings('habits-health'), onboarded: true}), [WHATS_NEW_KEY]: JSON.stringify({version: 1, dismissed: [WHATS_NEW_RELEASE]}), ...ai, ...extra});
}
const stored = (page: Page, key: string) => page.evaluate(k => { const v = localStorage.getItem(k); return v === null ? null : JSON.parse(v) as Record<string, any>; }, key); // eslint-disable-line @typescript-eslint/no-explicit-any
const panel = (page: Page) => page.locator('dialog.ai-chat[open]');
async function openChat(page: Page) { await page.getByRole('button', {name: /Open ZIGi/}).click(); await expect(panel(page)).toBeVisible(); }
const systemOf = (body: Body) => String(body.messages[0]!.content);
async function openNotes(page: Page) {
  // A full load (not a same-page hash change), so every store reads what the test seeded.
  await page.goto('about:blank');
  await page.goto('/app/settings#zigi-notes');
  const card = page.locator('details#zigi-notes');
  await expect(card).toHaveAttribute('open', '');
  await expect(card.getByRole('switch', {name: 'Use my notes'})).toBeVisible();
  return card;
}
test.beforeEach(async ({page}) => { await page.route('**/api/**', route => route.fulfill({status: 503, json: {error: 'offline fixture'}})); });

test('notes in Settings: add, refuse a secret, edit, delete with Undo, Export everything, delete all; nothing is written on view', async ({page}) => {
  await seed(page, null);
  const card = await openNotes(page);
  await expect(card).toContainText('No notes yet.');
  await expect(card.getByRole('switch', {name: 'Use my notes'})).toHaveAttribute('aria-checked', 'true');
  expect(await stored(page, AI_MEMORY_KEY)).toBeNull(); expect(await stored(page, AI_OPTIONS_KEY)).toBeNull();
  await card.getByLabel('Kind of note').selectOption('goals');
  await card.getByRole('textbox', {name: 'Your note', exact: true}).fill('Training for a half marathon in April');
  await card.getByRole('button', {name: 'Add note'}).click();
  await expect(card.getByRole('status')).toHaveText('Note added.');
  const list = card.getByRole('list', {name: 'Your notes'});
  await expect(list.getByRole('listitem')).toHaveCount(1);
  await expect(list).toContainText('Goals · written by you · 2026-09-20');
  expect((await stored(page, AI_MEMORY_KEY))!.notes).toEqual([expect.objectContaining({text: 'Training for a half marathon in April', category: 'goals', source: 'person', createdAt: expect.stringMatching(/^2026-09-20T19:0/), updatedAt: expect.stringMatching(/^2026-09-20T19:0/)})]);
  // Something shaped like a password is never kept.
  await card.getByRole('textbox', {name: 'Your note', exact: true}).fill('password: hunter22');
  await card.getByRole('button', {name: 'Add note'}).click();
  await expect(card.getByRole('alert')).toHaveText(SECRET_REFUSAL);
  expect((await stored(page, AI_MEMORY_KEY))!.notes).toHaveLength(1);
  await card.getByRole('textbox', {name: 'Your note', exact: true}).fill('');
  // Edit, then delete and put it back.
  await card.getByRole('button', {name: 'Edit the note "Training for a half marathon in April"'}).click();
  const edit = card.getByRole('form', {name: 'Edit the note "Training for a half marathon in April"'});
  await edit.getByRole('textbox', {name: 'Note', exact: true}).fill('Half marathon on 12 April');
  await edit.getByLabel('Kind of note').selectOption('schedule');
  await edit.getByRole('button', {name: 'Save'}).click();
  await expect(card.getByRole('status')).toHaveText('Note saved.');
  await expect(list).toContainText('Half marathon on 12 April'); await expect(list).toContainText('Schedule · written by you');
  await card.getByRole('button', {name: 'Delete the note "Half marathon on 12 April"'}).click();
  await expect(card.getByRole('status')).toContainText('Note deleted.');
  expect((await stored(page, AI_MEMORY_KEY))!.notes).toEqual([]);
  await card.getByRole('button', {name: 'Undo'}).click();
  await expect(card.getByRole('status')).toHaveText('The note is back.');
  expect((await stored(page, AI_MEMORY_KEY))!.notes).toEqual([expect.objectContaining({text: 'Half marathon on 12 April', category: 'schedule'})]);
  // The notes are part of "Export everything".
  const section = page.getByRole('region', {name: 'Everything you’ve saved, in one file.', exact: true});
  await section.getByLabel('I understand this file is readable and holds my personal records, including Health.').check();
  const waiting = page.waitForEvent('download');
  await section.getByRole('button', {name: 'Export everything', exact: true}).click();
  const file = await waiting, chunks: Buffer[] = [];
  for await (const part of await file.createReadStream()) chunks.push(Buffer.from(part));
  const json = JSON.parse(new TextDecoder().decode(readStoredZip(new Uint8Array(Buffer.concat(chunks)))[0]!.data));
  expect(json.device.aiMemory.notes).toEqual([expect.objectContaining({text: 'Half marathon on 12 April', category: 'schedule', source: 'person'})]);
  // Delete all asks first, then removes the record from this device.
  await card.getByRole('button', {name: 'Delete all notes'}).click();
  await card.getByRole('group', {name: 'Delete all notes'}).getByRole('button', {name: 'Delete all 1'}).click();
  await expect(card.getByRole('status')).toHaveText('All notes were deleted from this device.');
  expect(await stored(page, AI_MEMORY_KEY)).toBeNull();
  await expect(card).toContainText('No notes yet.');
});

test('the notes go with each message only while "Use my notes" is on: a removable "About me" chip; a health note waits for the gate', async ({page}) => {
  const bodies = await server(page, () => 'MOCK answer.');
  await seed(page, {}, {[AI_MEMORY_KEY]: JSON.stringify({version: 1, notes: [note('note_1', 'Prefers short answers', 'preferences'), note('note_2', 'MOCK knee note', 'health')]})});
  await page.goto('/app');
  await openChat(page);
  const box = page.getByLabel('Message to your AI');
  await box.fill('Hi there');
  const chips = panel(page).getByRole('group', {name: 'Records ZIGi chose for this question'});
  await expect(chips).toContainText('About me · 1 note');
  await panel(page).getByRole('button', {name: 'Send'}).click();
  await expect.poll(() => bodies.length).toBe(1);
  expect(systemOf(bodies[0]!)).toContain('Prefers short answers'); expect(JSON.stringify(bodies[0])).not.toContain('MOCK knee note');
  // Left out for one message: that message goes without them.
  await box.fill('Hi again');
  await chips.getByRole('button', {name: 'Leave out About me · 1 note'}).click();
  await expect(chips).toHaveCount(0);
  await panel(page).getByRole('button', {name: 'Send'}).click();
  await expect.poll(() => bodies.length).toBe(2);
  expect(JSON.stringify(bodies[1])).not.toContain('Prefers short answers');
  // "Use my notes" off: nothing about the person goes at all.
  await page.evaluate(([key]) => localStorage.setItem(key!, JSON.stringify({version: 1, toolMode: 'attach', useNotes: false})), [AI_OPTIONS_KEY]);
  await page.reload();
  await openChat(page);
  await page.getByLabel('Message to your AI').fill('Hi once more');
  await expect(panel(page).getByRole('group', {name: 'Records ZIGi chose for this question'})).toHaveCount(0);
  await panel(page).getByRole('button', {name: 'Send'}).click();
  await expect.poll(() => bodies.length).toBe(3);
  expect(JSON.stringify(bodies[2])).not.toContain('Prefers short answers');
});

test('"Remember this?": Remember keeps the note as ZIGi\'s, Undo forgets it; a health condition is never proposed', async ({page}) => {
  const bodies = await server(page, body => JSON.stringify(body).includes('asthma')
    ? `Noted.\n\n${block({kind: 'remember', text: 'Has asthma', category: 'health'})}`
    : `I can keep that in mind.\n\n${block({kind: 'remember', text: 'Prefers to train before work', category: 'schedule'})}`);
  await seed(page, {});
  await page.goto('/app');
  await openChat(page);
  await page.getByLabel('Message to your AI').fill('I always train before work');
  await panel(page).getByRole('button', {name: 'Send'}).click();
  const card = panel(page).locator('.ai-card');
  await expect(card).toHaveCount(1);
  await expect(card.getByRole('heading', {name: 'Remember this?'})).toBeVisible();
  await expect(card).toContainText('Prefers to train before work'); await expect(card).toContainText('Kept as: Schedule'); await expect(card).toContainText('ZIGi · What ZIGi knows about me');
  expect(systemOf(bodies[0]!)).toContain('{"kind":"remember","text":');
  expect(await stored(page, AI_MEMORY_KEY)).toBeNull();
  await card.getByRole('button', {name: 'Remember', exact: true}).click();
  await expect(card).toContainText('Remembered: in What ZIGi knows about me');
  expect((await stored(page, AI_MEMORY_KEY))!.notes).toEqual([expect.objectContaining({text: 'Prefers to train before work', category: 'schedule', source: 'zigi'})]);
  expect((await stored(page, AI_ACTIONS_KEY))!.actions).toEqual([expect.objectContaining({kind: 'remember', title: 'Remembered: Prefers to train before work'})]);
  await panel(page).getByRole('button', {name: /^Undo/}).click();
  await expect(panel(page).locator('.ai-card-undone')).toHaveCount(1);
  expect((await stored(page, AI_MEMORY_KEY))!.notes).toEqual([]);
  expect((await stored(page, AI_ACTIONS_KEY))!.actions).toEqual([]);
  // A health condition: no card, a plain reason, nothing kept.
  await page.getByLabel('Message to your AI').fill('I have asthma');
  await panel(page).getByRole('button', {name: 'Send'}).click();
  const refused = panel(page).locator('.ai-card-refused').last();
  await expect(refused.getByRole('heading', {name: 'Nothing proposed'})).toBeVisible();
  await expect(refused).toContainText('ZIGi does not keep notes about health conditions by itself.');
  expect((await stored(page, AI_MEMORY_KEY))!.notes).toEqual([]);
});

test('Showcase: notes stay in the tab, fictional, and never reach the person\'s own notes', async ({page}) => {
  await page.goto('/app/settings');
  await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); });
  await page.reload();
  await page.getByRole('button', {name: 'Load Showcase Demo', exact: true}).click();
  await page.waitForURL('**/app');
  const card = await openNotes(page);
  await expect(card).toContainText('Showcase (fictional): notes you add here stay in this tab and are gone when it closes.');
  await card.getByRole('textbox', {name: 'Your note', exact: true}).fill('Fictional: prefers evening walks');
  await card.getByRole('button', {name: 'Add note'}).click();
  await expect(card.getByRole('status')).toHaveText('Note added.');
  const where = await page.evaluate(key => ({local: Object.keys(localStorage).filter(k => k.includes(key)), session: Object.keys(sessionStorage).filter(k => k.includes(key))}), AI_MEMORY_KEY);
  expect(where.local).toEqual([]); expect(where.session.length).toBe(1);
  await page.getByRole('button', {name: 'Return to my data', exact: true}).click();
  await expect(page.getByRole('button', {name: 'Load Showcase Demo', exact: true})).toBeVisible();
  const own = await openNotes(page);
  await expect(own).toContainText('No notes yet.');
  expect(await page.evaluate(key => Object.keys(localStorage).filter(k => k.includes(key)), AI_MEMORY_KEY)).toEqual([]);
});
