import {expect, test} from '@playwright/test';
import {health, healthRecord, openHealth} from './ap-health-fixtures';

// Session AP (feature 5, DRAFT for the integrator): pace and per-km splits from a GPX run; a malicious file is refused.
const time = (s: number) => new Date(Date.parse('2026-11-13T07:00:00Z') + s * 1000).toISOString();
const RUN = `<?xml version="1.0"?><gpx version="1.1" creator="Fictional Watch" xmlns="http://www.topografix.com/GPX/1/1"><trk><name>Fictional park run</name><type>running</type><trkseg>${
  Array.from({length: 26}, (_, i) => `<trkpt lat="${(50 + i * 0.0009).toFixed(5)}" lon="20"><time>${time(i * 30)}</time></trkpt>`).join('')}</trkseg></trk></gpx>`;
const EVIL = '<?xml version="1.0"?><!DOCTYPE gpx SYSTEM "http://example.invalid/x.dtd"><gpx/>';

test('a GPX run comes in with its pace and splits; a file with a DOCTYPE is a field error', async ({page}) => {
  await openHealth(page, healthRecord(health()), '/app/health?tab=workouts');
  await page.getByText('Import a GPX or TCX file, a FIT file, or another app’s export', {exact: true}).click();
  const input = page.getByLabel('GPX or TCX file, FIT file, Strava ZIP, or Strong or Hevy CSV');
  await input.setInputFiles({name: 'evil.gpx', mimeType: 'application/gpx+xml', buffer: Buffer.from(EVIL)});
  await expect(page.getByRole('alert').filter({hasText: 'declares a document type (DOCTYPE)'})).toBeVisible();
  await expect(input).toHaveAttribute('aria-invalid', 'true');
  await input.setInputFiles({name: 'run.gpx', mimeType: 'application/gpx+xml', buffer: Buffer.from(RUN)});
  const preview = page.getByRole('group', {name: 'What this file holds'});
  await expect(preview).toContainText('Pace');
  await preview.getByRole('button', {name: 'Add workout'}).click();
  await page.getByRole('region', {name: 'Your workouts'}).getByText('Fictional park run', {exact: true}).click();
  await expect(page.getByRole('table', {name: /Splits of Fictional park run/})).toBeVisible();
  const splits = await page.evaluate(() => JSON.parse(localStorage.getItem('zigoals:workout-splits:v1') ?? 'null'));
  expect(Object.values(splits.workouts as Record<string, {splits: unknown[]}>)[0]!.splits).toHaveLength(3);
});
