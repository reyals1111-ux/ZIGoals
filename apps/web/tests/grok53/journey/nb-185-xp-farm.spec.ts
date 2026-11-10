import {expect, test} from '@playwright/test';
import {emptyPlatform, PLATFORM_KEY, platformSchema, privateGoalSchema} from '../../../lib/positions';
import {emptyDevice, open} from '../l3-helpers';

/**
 * NB-185/NB-203/NB-212/NB-213/NB-218 (P-NB-01): goal XP comes from the goal as it stands, once per real event. Records as
 * the bot left them: a project goal whose milestone was flipped eight times (eight "Goal milestones changed" rows, one
 * milestone ticked now) and closed/reopened four times. Journey must show 25 XP for it, not 25 per row.
 */
test.use({viewport: {width: 1280, height: 800}, timezoneId: 'Europe/Brussels'});
test('NB-185/NB-203: closing, reopening and milestone flips do not farm XP; Journey shows 25 for one ticked milestone', async ({page}) => {
  await page.clock.install({time: new Date('2026-11-04T03:55:00Z')});
  await emptyDevice(page);
  const at = (m: number) => `2026-11-04T03:${String(m).padStart(2, '0')}:00.000Z`;
  const goal = privateGoalSchema.parse({id: '7', name: 'FarmB', type: 'PROJECT', status: 'active', asset: 'MILESTONE', denom: 'milestone', decimals: 0, target: '2', notes: '', createdAt: at(0), milestones: [{id: 'm0', title: 'Step 1', done: true}, {id: 'm1', title: 'Step 2', done: false}]});
  const rows = [...Array.from({length: 8}, (_, i) => ({id: `change:7:milestone:${i}`, goalId: '7', kind: 'milestone', capturedAt: at(i + 1), label: 'Goal milestones changed', provenance: 'LOCAL_EDIT'})),
    ...Array.from({length: 8}, (_, i) => ({id: `change:7:status:${i}`, goalId: '7', kind: 'status', capturedAt: at(i + 20), label: i % 2 ? 'Goal reactivated' : 'Goal closed', provenance: 'LOCAL_EDIT'}))];
  const platform = platformSchema.parse({...emptyPlatform(), goals: [goal], goalHistory: rows});
  await page.evaluate(({key, value}) => { localStorage.setItem(key, value); localStorage.setItem('zigoals:game:v1', JSON.stringify({version: 1, enabled: true, levelSeen: 1})); }, {key: PLATFORM_KEY, value: JSON.stringify(platform)});
  await open(page, '/app/journey');
  await expect(page.locator('.journey-level-line')).toContainText('25 XP all told');
  await page.getByText('What earns XP').click();
  await expect(page.getByRole('table')).toContainText('+25, once per milestone');
});
