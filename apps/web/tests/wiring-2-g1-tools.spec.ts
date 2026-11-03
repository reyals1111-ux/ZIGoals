import {expect, test} from '@playwright/test';
import {AI_OPTIONS_KEY} from '../lib/ai/store/keys';
import {HEALTH_NUMBERS_KEY} from '../lib/health-numbers/store';
import {TASKS_KEY} from '../lib/tasks/schema';
import {FORECAST_LABEL} from '../lib/ai/tools/g1-tools';
import {answer, askNova, cards, mockModel, novaChat, raw, seedDevice, toolCalls, zigiPanel} from './wiring-2-helpers';

/**
 * Session AK, lane WB (WIRING_AUDIT_2.md G8): BUILD list 2's tools and cards on the UI path, with a MOCK local model that
 * calls ZIGoals' read-only tools natively. ZIGi on Health: the model reads `your_numbers` (run in the browser, its result
 * sent back), then proposes `log-blood-pressure`; the reading is kept only on the person's tap and Undo removes it.
 * NOVA (one engine): the model reads `cash_forecast` ("a model, not a promise"), then proposes `move-task`; the task moves
 * to tomorrow on the tap and Undo puts it back as it was. Fictional records (the Showcase's, plus one fictional task).
 */
test.skip(({isMobile}) => isMobile, 'one run is enough: the engine is the same on a phone (wiring-2-r2.spec.ts covers NOVA\'s phone chat)');
const TOOLS = {[AI_OPTIONS_KEY]: {version: 1, toolMode: 'tools'}};
type Message = {role: string; content: unknown};
// Words that no on-device answer takes (lookups such as "my last blood pressure" are answered on the device first, with no
// request), so the question reaches the MOCK model, whose replies decide the tools and the cards.
const toolResult = (messages: Message[]) => messages.filter(m => m.role === 'tool').map(m => String(m.content)).join('\n');

test('G8 (ZIGi): your_numbers is read through the tool; a log-blood-pressure card is kept on the tap and undone exactly', async ({page}) => {
  const seen = await mockModel(page, (_, n) => n === 1 ? toolCalls([{name: 'your_numbers', args: {}}])
    : cards({kind: 'log-blood-pressure', systolic: 118, diastolic: 76, pulse: 64}, 'MOCK: your readings are listed; one card below for the reading you gave me.'));
  await seedDevice(page, TOOLS);
  await page.goto('/app/health');
  await page.getByRole('button', {name: /Open ZIGi/}).click();
  await expect(zigiPanel(page)).toBeVisible();
  await page.getByLabel('Message to your AI').fill('Write me one kind sentence about my week.');
  await page.getByRole('button', {name: 'Send', exact: true}).click();
  const card = zigiPanel(page).locator('.ai-card').filter({hasText: 'Blood pressure: 118/76 mmHg'});
  await expect(card).toBeVisible({timeout: 20_000});
  // The tool was offered, the model asked for it, and its result (the person's own readings) went back with the next request.
  expect(seen[0]!.tools?.map(t => t.function.name)).toContain('your_numbers');
  expect(seen).toHaveLength(2);
  expect(toolResult(seen[1]!.messages)).toContain('mmHg');
  // Nothing is kept before the tap.
  const before = await raw(page, HEALTH_NUMBERS_KEY);
  await expect(card).toHaveClass(/ai-card-proposed/);
  expect(await raw(page, HEALTH_NUMBERS_KEY)).toBe(before);
  await card.getByRole('button', {name: 'Keep the reading', exact: true}).click();
  await expect(card).toHaveClass(/ai-card-added/);
  const kept = JSON.parse(await raw(page, HEALTH_NUMBERS_KEY) ?? 'null') as {entries: {kind: string; systolic?: number; diastolic?: number; pulse?: number}[]};
  expect(kept.entries.filter(e => e.kind === 'bp' && e.systolic === 118 && e.diastolic === 76 && e.pulse === 64)).toHaveLength(1);
  await zigiPanel(page).getByRole('button', {name: /^Undo/}).click();
  await expect(card).toHaveClass(/ai-card-undone/);
  const strip = (value: string | null) => JSON.parse(value ?? 'null', (key, v: unknown) => key === 'updatedAt' ? undefined : v);
  expect(strip(await raw(page, HEALTH_NUMBERS_KEY))).toEqual(strip(before));
});

test('G8 (NOVA): cash_forecast is read through the tool as a model, not a promise; a move-task card moves the task and Undo puts it back', async ({page}) => {
  const task = {id: 'wb-task-1', title: 'Fictional return the library book', priority: 'normal', due: '2026-09-20', createdAt: '2026-09-15T08:00:00.000Z'};
  const seen = await mockModel(page, (_, n) => n === 1 ? toolCalls([{name: 'cash_forecast', args: {days: 60}}])
    : n === 2 ? cards({kind: 'move-task', task: 'Fictional return the library book', to: 'tomorrow'}, 'MOCK: your cash line is a model from your records. The library book can wait a day.')
    : answer('MOCK: noted.'));
  await seedDevice(page, {...TOOLS, [TASKS_KEY]: {version: 1, tasks: [task]}});
  await page.goto('/app/wealth');
  await askNova(page, 'Write me one calm sentence about my month.');
  const card = novaChat(page).locator('.nova-turn-assistant').last().locator('.ai-card').filter({hasText: 'Move to tomorrow: Fictional return the library book'});
  await expect(card).toBeVisible({timeout: 20_000});
  expect(seen[0]!.tools?.map(t => t.function.name)).toContain('cash_forecast');
  expect(toolResult(seen[1]!.messages)).toContain(FORECAST_LABEL);
  // Nothing moves before the tap.
  const before = await raw(page, TASKS_KEY);
  await expect(card).toHaveClass(/ai-card-proposed/);
  expect(await raw(page, TASKS_KEY)).toBe(before);
  await card.getByRole('button', {name: 'Move it', exact: true}).click();
  await expect(card).toHaveClass(/ai-card-added/);
  expect((JSON.parse(await raw(page, TASKS_KEY) ?? 'null') as {tasks: {id: string; due?: string}[]}).tasks.find(t => t.id === task.id)?.due).toBe('2026-09-21');
  await novaChat(page).locator('.nova-turn-assistant').last().getByRole('button', {name: /^Undo/}).click();
  await expect(card).toHaveClass(/ai-card-undone/);
  const strip = (value: string | null) => JSON.parse(value ?? 'null', (key, v: unknown) => key === 'updatedAt' ? undefined : v);
  expect(strip(await raw(page, TASKS_KEY))).toEqual(strip(before));
});
