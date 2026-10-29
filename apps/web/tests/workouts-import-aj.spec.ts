import {expect, test} from '@playwright/test';
import {freshDevice, hydrated} from './ah-helpers';

// Session AJ (item 27, D12): a GPX file imported into Workouts on the device; only its summary is kept (never the
// points), a second import of the same file is refused, and a file with an entity declaration is refused before reading.
// The track is fictional.
const point = (i: number) => `<trkpt lat="${(50.85 + i * 0.0009).toFixed(5)}" lon="4.35000"><ele>${20 + i}</ele><time>2026-10-28T07:${String(i * 3).padStart(2, '0')}:00Z</time><extensions><gpxtpx:TrackPointExtension><gpxtpx:hr>${140 + i}</gpxtpx:hr></gpxtpx:TrackPointExtension></extensions></trkpt>`;
const GPX = `<?xml version="1.0" encoding="UTF-8"?><gpx version="1.1" creator="fixture" xmlns="http://www.topografix.com/GPX/1/1" xmlns:gpxtpx="http://www.garmin.com/xmlschemas/TrackPointExtension/v1"><trk><name>Fictional morning run</name><type>running</type><trkseg>${Array.from({length: 11}, (_, i) => point(i)).join('')}</trkseg></trk></gpx>`;

test('import a GPX run: summary only, minutes in Health, and the same file twice is refused', async ({page}) => {
  await freshDevice(page);
  await page.goto('/app/health?view=workouts'); await hydrated(page);
  const box = page.locator('details', {hasText: 'Import a GPX or TCX file'});
  await box.getByText('Import a GPX or TCX file').click();
  await expect(box).toContainText('Only the summary is kept; the route’s points are not stored.');
  await box.getByLabel('GPX or TCX file').setInputFiles({name: 'run.gpx', mimeType: 'application/gpx+xml', buffer: Buffer.from(GPX)});
  await expect(box).toContainText('Fictional morning run');
  await box.getByRole('button', {name: 'Add workout'}).click();
  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('zigoals:workouts:v1') ?? 'null')) as {workouts: {name: string; exercises: unknown[]; imported?: Record<string, unknown>; activityId?: string}[]};
  expect(stored.workouts).toHaveLength(1);
  const w = stored.workouts[0]!;
  expect(w).toMatchObject({name: 'Fictional morning run', exercises: [], imported: {source: 'gpx', sport: 'running', durationSeconds: 1800, avgHr: 145}});
  expect(Number(w.imported!.distanceKm)).toBeGreaterThan(0.9);
  expect(JSON.stringify(stored)).not.toContain('50.85');
  expect(w.activityId).toBeTruthy();
  await box.getByLabel('GPX or TCX file').setInputFiles({name: 'run.gpx', mimeType: 'application/gpx+xml', buffer: Buffer.from(GPX)});
  await expect(box).toContainText(/Already imported/i);
  await box.getByLabel('GPX or TCX file').setInputFiles({name: 'bad.gpx', mimeType: 'application/gpx+xml', buffer: Buffer.from('<?xml version="1.0"?><!DOCTYPE gpx [<!ENTITY x "y">]><gpx></gpx>')});
  await expect(box.getByRole('alert').or(box.getByRole('status')).first()).toBeVisible();
  expect((await page.evaluate(() => JSON.parse(localStorage.getItem('zigoals:workouts:v1') ?? 'null'))).workouts).toHaveLength(1);
});
