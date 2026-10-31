'use client';
import Link from 'next/link';
import {Suspense, lazy, useEffect, useState} from 'react';
import {DEVICE_ONLY, DEVICE_STORES, HOME_LABEL, NEVER_STORED, SYNCED, storedBytes, type CatalogEntry} from '../../lib/data-health/catalog';
import {getAccountScope} from '../../lib/account-session';
import {getAppStorage, isShowcase} from '../../lib/showcase-storage';
import {readAiSettings, PAGE_AREAS, type AiSettings} from '../../lib/ai/settings';
import {listImages} from '../../lib/vision/store';
import {formatNumber} from '../../lib/visual-format';
import {visionScope} from '../goals/use-goal-extras';
import {StorageHealth} from '../storage-health';
import {SectionHeading} from '../ui/section-heading';
import './data-health.css';
// Session AB-Cloud Part 5 (ADR-023 C22): Restore from a backup, loaded with the page's section, its code with the file.
const RestoreBackup = lazy(() => import('../restore/restore-backup').then(m => ({default: m.RestoreBackup})));
// Session AK Part 8.9: test a backup in a sandbox, and the monthly reminder to keep a copy.
const TestBackup = lazy(() => import('../restore/test-backup'));
const BackupReminder = lazy(() => import('../restore/backup-reminder'));

/**
 * Data health (Session AA-Cloud Part 6, Settings → Your data): where each part of the person's data lives, how much
 * this device holds, the copies they can make, the browser's storage and what ZIGi may read. Read-only: it changes
 * nothing, sends nothing and asks for no permission — except "Restore from a backup" (Session AB-Cloud Part 5), which
 * changes only what the person chose, after their confirmation. Export everything writes nothing on the device by design, so the
 * age of a copy is not recorded here; the browser's own downloads list shows it.
 */
type Read = {sizes: Record<string, number | null>; account: boolean; showcase: boolean; photos: {count: number; bytes: number} | null; ai: AiSettings | null};
const kb = (bytes: number) => bytes < 1024 ? `${formatNumber(bytes)} B` : bytes < 1048576 ? `${formatNumber(bytes / 1024, {maximumFractionDigits: 1})} kB` : `${formatNumber(bytes / 1048576, {maximumFractionDigits: 1})} MB`;
const AREA_LABEL: Record<(typeof PAGE_AREAS)[number], string> = {today: 'Today', goals: 'Goals', habits: 'Habits', health: 'Health', wealth: 'Wealth', help: 'Help'};

export function DataHealthView() {
  const [read, setRead] = useState<Read | null>(null);
  useEffect(() => {
    let active = true;
    queueMicrotask(async () => {
      const storage = getAppStorage(), sizes: Record<string, number | null> = {};
      for (const e of [...SYNCED, ...DEVICE_ONLY]) { try { sizes[e.key] = storedBytes(storage.getItem(e.key)); } catch { sizes[e.key] = null; } }
      let ai: AiSettings | null = null;
      try { ai = readAiSettings(storage).data; } catch { ai = null; }
      let photos: Read['photos'] = null;
      try { const images = isShowcase() ? [] : await listImages(visionScope()); photos = {count: images.length, bytes: images.reduce((n, i) => n + i.bytes, 0)}; } catch { photos = null; }
      if (active) setRead({sizes, account: getAccountScope() !== null, showcase: isShowcase(), photos, ai});
    });
    return () => { active = false; };
  }, []);
  if (!read) return <div className="aa-skeleton" aria-hidden="true"><i /><i /><i /></div>;
  const total = Object.values(read.sizes).reduce<number>((n, b) => n + (b ?? 0), 0);
  const row = (e: CatalogEntry) => <li key={e.key}><span><strong>{e.label}</strong><small>{e.area}</small></span><span className="dh-size">{read.sizes[e.key] === null ? 'Nothing yet' : kb(read.sizes[e.key]!)}</span></li>;
  const ai = read.ai, areas = ai ? PAGE_AREAS.filter(a => ai.pageShare[a] && (a !== 'health' || ai.includeHealth)) : [];

  return <div className="data-health">
    {read.showcase && <p className="notice">You are in the Showcase: these figures describe its fictional records, kept in this tab only.</p>}
    <section className="panel" aria-labelledby="dh-synced">
      <SectionHeading id="dh-synced" eyebrow={read.account ? 'Your account syncs these, encrypted' : 'No account on this device'} title="Synced records" lede={read.account ? 'Encrypted on this device before they leave it; Health only after you agree on each device.' : 'Without an account these stay on this device. An account syncs them, encrypted, when you choose.'} level={3} />
      <ul className="dh-list">{SYNCED.map(row)}</ul>
      {/* Phase 2 closing pass (design critique): one line per area (the same pair had repeated once per record type). */}
      <p className="fine">{[...SYNCED.reduce((m, e) => m.set(e.area, new Set([...(m.get(e.area) ?? []), HOME_LABEL[e.home].toLowerCase()])), new Map<string, Set<string>>())].map(([area, homes]) => `${area}: ${[...homes].join(' or ')}`).join(' · ')}.</p>
    </section>
    <section className="panel" aria-labelledby="dh-device">
      <SectionHeading id="dh-device" eyebrow={HOME_LABEL.device} title="Kept on this device" lede="Never synced or uploaded. Export everything includes them; another device does not see them." level={3} />
      <ul className="dh-list">{DEVICE_ONLY.filter(e => read.sizes[e.key] !== null).map(row)}</ul>
      <details className="dh-more"><summary>Also kept here, nothing saved yet ({DEVICE_ONLY.filter(e => read.sizes[e.key] === null).length})</summary><ul className="dh-list">{DEVICE_ONLY.filter(e => read.sizes[e.key] === null).map(row)}</ul></details>
      <ul className="dh-list">
        <li><span><strong>{DEVICE_STORES[0]}</strong><small>Goals</small></span><span className="dh-size">{read.photos === null ? 'Unknown' : read.photos.count ? `${read.photos.count} · ${kb(read.photos.bytes)}` : 'None'}</span></li>
        <li><span><strong>{DEVICE_STORES[1]}</strong><small>ZIGi</small></span><span className="dh-size">In ZIGi</span></li>
      </ul>
    </section>
    <section className="panel" aria-labelledby="dh-never">
      <SectionHeading id="dh-never" eyebrow="Never stored" title="Worked out each time" lede="These are read again from your records each time you open them, so they never go stale and are never kept." level={3} />
      <ul className="dh-chips">{NEVER_STORED.map(n => <li key={n}>{n}</li>)}</ul>
    </section>
    <section className="panel" aria-labelledby="dh-copies">
      <SectionHeading id="dh-copies" eyebrow="Copies" title="Your copies" level={3} />
      <dl className="dh-facts">
        <div><dt>Records on this device</dt><dd>{kb(total)}</dd></div>
        <div><dt>Last Export everything</dt><dd>Not recorded</dd></div>
      </dl>
      <p className="fine">Export everything writes nothing on this device, by design, so it keeps no date; your browser&apos;s downloads list shows when you last exported. Restore from a backup, below, reads that ZIP back.</p>
      <div className="dh-actions"><Link className="primary" href="/app/settings#privacy">Export everything or keep a protected copy</Link></div>
      <Suspense fallback={null}><BackupReminder/></Suspense>
    </section>
    <section className="panel" aria-labelledby="dh-restore" id="restore">
      <SectionHeading id="dh-restore" eyebrow="From Export everything" title="Restore from a backup" lede="Bring back records from an Export everything ZIP: see what it holds, choose per part, confirm, and undo if you change your mind." level={3} />
      <Suspense fallback={null}><RestoreBackup showcase={read.showcase} /></Suspense>
      {!read.showcase && <Suspense fallback={null}><TestBackup/></Suspense>}
    </section>
    <section className="panel" aria-labelledby="dh-storage">
      <SectionHeading id="dh-storage" eyebrow="This browser" title="Storage used" level={3} />
      <StorageHealth />
    </section>
    <section className="panel" aria-labelledby="dh-zigi">
      <SectionHeading id="dh-zigi" eyebrow="ZIGi" title="What ZIGi can see" level={3} action={<Link className="text-link" href="/app/settings#your-ai">Settings → ZIGi →</Link>} />
      {!ai ? <p>ZIGi&apos;s settings could not be read on this device, so nothing is assumed.</p> : !ai.enabled ? <p>ZIGi is off. Nothing is sent anywhere; answers that need no AI stay on this device.</p> : <>
        <p>ZIGi is on{ai.model ? ` (${ai.model})` : ''}. With a question it may send a short summary of these areas to the service you chose: <strong>{areas.length ? areas.map(a => AREA_LABEL[a]).join(', ') : 'none'}</strong>.</p>
        <p className="fine">Health goes only when its own switch, &ldquo;Include Health&rdquo; and your consent all allow it. Settings and sensitive screens are never read.</p>
      </>}
    </section>
  </div>;
}
