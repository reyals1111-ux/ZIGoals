import {getAccountScope} from '../account-session';
import {getAppStorage, isShowcase, showcaseDay} from '../showcase-storage';
import {PORTFOLIO_KEY} from '../portfolio/schema';
import {showcasePortfolios} from '../portfolio/showcase';
import {deletedAccountRecords} from '../deleted-account-records';
import {localDate} from '../local-date';

/**
 * Session AV Part 3 (ADR-045 D-KEEP): the whole Export everything, made and downloaded on this device, shared by Settings'
 * Export everything (components/export-everything.tsx) and Today's "Export a backup" (components/keep-data). Moved here
 * unchanged from the Settings component: one readable ZIP with every stored record, the photos as files; nothing uploaded,
 * nothing written to storage. Loaded only with the tap. Returns the notes the person should read.
 */
/** Session Z-Cloud Part 5 (A7): the plain note on an export of a deleted account's records. */
export const DELETED_EXPORT_NOTE = 'Your cloud copy was deleted; this export holds the records this device kept for that account. Nothing was changed or uploaded, and they stay locked in the app.';
export async function makeEverythingExport(): Promise<{notes: string[]}> {
  const {buildEverythingZip, collectEverything, readEverything} = await import('./everything');
  // Session Z-Cloud Part 5 (A7): an account whose cloud copy was deleted is locked, and its records stay here; the
  // export still copies them, read-only, and says so.
  let storage: Storage, kept = false; const now = new Date();
  try { storage = getAppStorage(); } catch (locked) { const records = deletedAccountRecords(); if (!records) throw locked; storage = records; kept = true; }
  const {texts, localSimulation} = await readEverything(storage);
  // Session AH Part 3 (DS6, N-042): the Showcase's Portfolio is drawn from its fixture until it is changed, so the
  // export copies what the Portfolio page shows, as Portfolio does (components/portfolio/use-portfolios.ts).
  if (!kept && isShowcase() && texts[PORTFOLIO_KEY] == null) texts[PORTFOLIO_KEY] = JSON.stringify(showcasePortfolios(showcaseDay() ?? localDate(now)));
  // ZIGi's conversations (ADR-012) ride along; its provider keys live in a key store the export never opens.
  // The chat store (IndexedDB, or the Showcase tab's storage) is imported only for the export itself; the page never ships it.
  const aiChats = kept ? undefined : await import('../ai/scope').then(({currentChatStore, exportChats}) => exportChats(currentChatStore())).catch(() => undefined);
  const collected = collectEverything(texts, {now, version: process.env.NEXT_PUBLIC_APP_VERSION ?? '', commit: process.env.NEXT_PUBLIC_APP_COMMIT ?? '', localSimulation, aiChats});
  // Session AA-Cloud: the goals' vision photos this device keeps (none in the Showcase, which keeps no photos).
  const images = kept || isShowcase() ? [] : await import('../vision/store').then(async ({listImages}) => Promise.all((await listImages(getAccountScope() ?? 'local')).map(async i => ({id: i.id, type: i.type, bytes: new Uint8Array(await i.blob.arrayBuffer())})))).catch(() => []);
  const progressPhotos = await import('../health-aa/photos').then(m => m.exportPhotoEntries(now)).catch(() => []); // Session AA-Local: the progress photos as files (device-only; B7)
  // Session AK (4.2): the meal photos the person chose to keep, as files beside them.
  const mealPhotos = await Promise.all([import('../health-aa/photos'), import('../meal-estimates/photos')]).then(([a, m]) => m.exportMealPhotoEntries(a.photoScope(), now)).catch(() => []);
  // Owner follow-up 2 (B1): the notes' photos as files (device-only), named by the photo id each note points at.
  const notePhotos = kept ? [] : await Promise.all([import('../health-aa/photos'), import('../notes/photos'), import('../notes/schema'), import('../device-record')]).then(async ([a, n, sch, dr]) => {
    const ids = dr.readDeviceRecord(storage, sch.NOTES).data.notes.flatMap(note => note.photoId ? [note.photoId] : []);
    return [...(await n.notePhotosForExport(a.photoScope(), ids))].map(([id, p]) => ({name: `notes/photos/${id.replace(/[^A-Za-z0-9_-]/g, '')}.${p.type === 'image/webp' ? 'webp' : 'jpg'}`, data: p.data, modified: now}));
  }).catch(() => []);
  // Owner follow-up 2 (G1 #10): receipt photos as files, named by their entry's date and id (device-only).
  const moneyPhotos = kept ? [] : await Promise.all([import('../health-aa/photos'), import('../money-photos/store'), import('../money-log/schema'), import('../device-record')]).then(([a, m, sch, dr]) =>
    m.exportMoneyPhotoEntries(a.photoScope(), new Map(dr.readDeviceRecord(storage, sch.MONEY_LOG).data.entries.map(e => [e.id, e.date] as const)), now)).catch(() => []);
  // Session AV lane 2 (LEDGER #8): photos and voice notes on tasks, beside their task's title.
  const taskFiles = kept ? [] : await Promise.all([import('../health-aa/photos'), import('../tasks/attachments'), import('../tasks/schema'), import('../device-record')]).then(([a, t, sch, dr]) => t.exportTaskAttachmentEntries(a.photoScope(), new Map(dr.readDeviceRecord(storage, sch.TASKS).data.tasks.map(x => [x.id, x.title] as const)), now)).catch(() => []);
  // Session AV lane 2, batch 2: documents kept with the net-worth sheet (#221) and front-of-pack food photos (#103).
  const wealthDocs = kept ? [] : await Promise.all([import('../health-aa/photos'), import('../wealth-sheet/docs')]).then(([a, w]) => w.exportWealthDocEntries(a.photoScope(), now)).catch(() => []);
  const foodPhotos = kept ? [] : await Promise.all([import('../health-aa/photos'), import('../food-plus/photos')]).then(([a, f]) => f.exportFoodPhotoEntries(a.photoScope(), now)).catch(() => []);
  const photos = [...progressPhotos, ...mealPhotos, ...notePhotos, ...moneyPhotos, ...taskFiles, ...wealthDocs, ...foodPhotos];
  const {name, bytes} = buildEverythingZip(collected, {date: localDate(now), showcase: isShowcase(), now, images}, photos);
  const url = URL.createObjectURL(new Blob([new Uint8Array(bytes)], {type: 'application/zip'}));
  const link = document.createElement('a'); link.href = url; link.download = name; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  const lines = [...(kept ? [DELETED_EXPORT_NOTE] : []), ...collected.warnings];
  if (collected.unreadable.length) lines.push(`Some records on this device could not be read and were left out: ${collected.unreadable.join(', ')}. They were not changed.`);
  return {notes: lines};
}
