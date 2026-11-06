import {expect, test} from '@playwright/test';
import {emptyPlatform, PLATFORM_KEY, platformSchema, privateGoalSchema} from '../../../lib/positions';
import {emptyDevice, open} from '../l3-helpers';

/**
 * Session AL second pass (lane L3): DV-045a/DV-042 (P-DV-22) Journey says "1 goal reached" for a goal reached and then
 * closed (it said "0 goals reached · 1 goal set aside"); NB-227/NB-229 the weekly review quest links to where it is done;
 * NB-227 the Life review shows one line for a goal's fourteen milestone flips and calls its week "Last 7 days".
 * Bot: Denver desktop 1280×800, Dark. Fictional data only.
 */
test.use({viewport: {width: 1280, height: 800}, timezoneId: 'Europe/Brussels', colorScheme: 'dark'});
const life = (kind: 'completed' | 'closed', at: string, n: number) => ({id: `aaaaaaaa-0000-4000-8000-00000000000${n}`, kind, cycle: 0, at, target: '1', asset: 'BOOK', decimals: 0});

test('DV-045a: a goal reached and then closed counts as reached on Journey, never "set aside"', async ({page}) => {
  await page.clock.install({time: new Date('2026-11-04T10:00:00Z')});
  await emptyDevice(page, {theme: 'dark'});
  const goal = privateGoalSchema.parse({id: '9', name: 'Read 1 book', type: 'QUANTITY', status: 'closed', asset: 'BOOK', denom: 'book', decimals: 0, target: '1', notes: '', createdAt: '2026-11-01T08:00:00.000Z', milestones: [], lifecycle: [life('completed', '2026-11-02T09:00:00.000Z', 1), life('closed', '2026-11-03T09:00:00.000Z', 2)]});
  await page.evaluate(({key, value}) => { localStorage.setItem(key, value); localStorage.setItem('zigoals:game:v1', JSON.stringify({version: 1, enabled: true, levelSeen: 1})); }, {key: PLATFORM_KEY, value: JSON.stringify(platformSchema.parse({...emptyPlatform(), goals: [goal]}))});
  await open(page, '/app/journey');
  await expect(page.locator('main')).toContainText('1 goal reached');
  await expect(page.locator('main')).not.toContainText('set aside, kept as faint rings');
});

test('NB-227/NB-229: an unmet quest links to the place it is done; the Life review groups milestone flips', async ({page}) => {
  await page.clock.install({time: new Date('2026-11-04T04:55:00Z')});
  await emptyDevice(page, {theme: 'dark'});
  const at = (m: number) => `2026-11-04T03:${String(m).padStart(2, '0')}:00.000Z`;
  const goal = privateGoalSchema.parse({id: '7', name: 'FarmB', type: 'PROJECT', status: 'active', asset: 'MILESTONE', denom: 'milestone', decimals: 0, target: '2', notes: '', createdAt: at(0), milestones: [{id: 'm0', title: 'Step 1', done: true}, {id: 'm1', title: 'Step 2', done: false}]});
  const rows = Array.from({length: 14}, (_, i) => ({id: `change:7:milestone:${i}`, goalId: '7', kind: 'milestone', capturedAt: at(i + 1), label: 'Goal milestones changed', provenance: 'LOCAL_EDIT'}));
  await page.evaluate(({key, value}) => { localStorage.setItem(key, value); localStorage.setItem('zigoals:game:v1', JSON.stringify({version: 1, enabled: true, levelSeen: 1})); }, {key: PLATFORM_KEY, value: JSON.stringify(platformSchema.parse({...emptyPlatform(), goals: [goal], goalHistory: rows}))});
  await open(page, '/app/journey');
  const quest = page.locator('.journey-quest-list li').filter({hasText: 'Complete your weekly review'});
  if (await quest.count()) await expect(quest.getByRole('link', {name: 'Open it →'})).toHaveAttribute('href', '/app/review#weekly-reflection');
  await open(page, '/app/review');
  await expect(page.getByRole('group', {name: 'Review period'}).getByRole('button', {name: 'Last 7 days'})).toBeVisible();
  await expect(page.locator('main')).toContainText('Milestones changed 14 times · 1 of 2 milestones done now');
  await expect(page.locator('main').getByText('Goal milestones changed')).toHaveCount(0);
});
