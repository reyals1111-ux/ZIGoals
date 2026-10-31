import {openBackup} from './read-backup';
import {nextValue, planParts} from './plan';

/**
 * Session AK Part 8.9: "Test a backup". The backup is opened and every part is replayed into an empty sandbox — as if
 * restored on a new device — and read back, so a person knows the file will restore before they ever need it. Nothing on
 * this device is read or written (no storage is touched); the file stays in the browser.
 */
export type TestReport = {exportedAt: string | null; app: string | null; demo: boolean; ok: number; parts: {label: string; ok: boolean; reason?: string}[]; photos: number};
export async function testBackup(file: Blob): Promise<TestReport> {
  const opened = await openBackup(file), parts = planParts(opened.json), out: TestReport['parts'] = [];
  for (const part of parts) {
    const next = nextValue(part, 'replace', undefined);
    if ('error' in next) { out.push({label: part.label, ok: false, reason: next.error}); continue; }
    // The sandbox write and read: the value serialised as it would be stored, then read back through the same schema.
    const back = part.schema.safeParse(JSON.parse(JSON.stringify(next.value)));
    out.push(back.success ? {label: part.label, ok: true} : {label: part.label, ok: false, reason: 'This part did not read back as it was written.'});
  }
  const app = opened.json.app ? [opened.json.app.version, opened.json.app.commit?.slice(0, 7)].filter(Boolean).join(' · ') || null : null;
  return {exportedAt: opened.json.exportedAt ?? null, app, demo: opened.demo, ok: out.filter(p => p.ok).length, parts: out, photos: opened.vision.length + opened.photos.length};
}
