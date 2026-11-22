import {bookOf} from './books';
import type {Journal, JournalEntry} from './schema';
import {safeFileBase} from '../notes/markdown';

/**
 * Session AV lane 2 (journal; LEDGER #44, Day One's export and import): the journal as a file to keep or to take to
 * another app — `journal.json` in Day One's export shape (entries with `creationDate`, `modifiedDate`, `text`, `tags`,
 * `photos` and `audios` naming the files beside it), plus each entry's own day, journal and template under `zigoals`, so
 * Journal → Import reads it back exactly; the photos and voice notes in `photos/` and `audios/`; and `README.txt`.
 * Everything private: the file is made on this device and saved where the person chooses. Pure (the caller reads the
 * media and writes the ZIP).
 */
export const PHOTO_EXT: Record<string, string> = {'image/webp': 'webp', 'image/jpeg': 'jpeg'};
export const AUDIO_EXT: Record<string, string> = {'audio/webm': 'webm', 'audio/mp4': 'm4a', 'audio/ogg': 'ogg'};
export type MediaFile = {data: Uint8Array; type: string};
export const journalExportName = (day: string, showcase: boolean) => `zigoals-${showcase ? 'example-' : ''}journal-${day}.zip`;
export function journalExportFiles(journal: Journal, media: ReadonlyMap<string, MediaFile>, {now = new Date()}: {now?: Date} = {}): {name: string; data: Uint8Array | string; modified: Date}[] {
  const files: {name: string; data: Uint8Array | string; modified: Date}[] = [];
  const entries = journal.entries.map(e => {
    // Session AV lane 2 (r4-mind; LEDGER #317): photos five to twelve follow the first four (Day One keeps one list).
    const photos = [...(e.photos ?? []), ...(e.morePhotos ?? [])].flatMap(id => { const m = media.get(id), ext = m ? PHOTO_EXT[m.type] : undefined; if (!m || !ext) return []; files.push({name: `photos/${id}.${ext}`, data: m.data, modified: now}); return [{identifier: id, md5: id, type: ext}]; });
    const audios = (e.audio ?? []).flatMap(a => { const m = media.get(a.id), ext = m ? AUDIO_EXT[m.type] : undefined; if (!m || !ext) return []; files.push({name: `audios/${a.id}.${ext}`, data: m.data, modified: now}); return [{identifier: a.id, md5: a.id, format: ext, duration: a.seconds}]; });
    const book = bookOf(journal, e);
    return {uuid: e.id, creationDate: e.createdAt, ...(e.updatedAt ? {modifiedDate: e.updatedAt} : {}), text: e.text, ...(e.tags?.length ? {tags: e.tags} : {}), ...(e.star ? {starred: true} : {}), ...(photos.length ? {photos} : {}), ...(audios.length ? {audios} : {}),
      zigoals: {date: e.date, ...(book ? {journal: book.name} : {}), ...(e.template ? {template: e.template} : {}), ...(e.followUp ? {question: e.followUp.question, ...(e.followUp.answer ? {answer: e.followUp.answer} : {})} : {}), ...(e.period ? {period: e.period} : {}), ...(e.night ? {night: e.night} : {}), ...(e.opensOn ? {opensOn: e.opensOn} : {})}};
  });
  // Session AV lane 2 (r3-notes; LEDGER #272, Grid Diary's Markdown export): one .md file per entry in Markdown/, for
  // Obsidian and other apps — its day, journal, tags and the rest in front matter, its words as written, its photos named
  // beside it (../photos/). ZIGoals' Import reads journal.json from this ZIP and leaves these out, so nothing doubles.
  const used = new Set<string>();
  for (const e of journal.entries) {
    const base = `${e.date} ${safeFileBase(e.text.replace(/\s*\(SHOWCASE DATA\)\s*$/, '').split('\n').map(l => l.replace(/^#+\s*/, '').trim()).find(Boolean)?.slice(0, 40) ?? 'Entry')}`;
    let name = `Markdown/${base}.md`, n = 2;
    while (used.has(name.toLowerCase())) name = `Markdown/${base} ${n++}.md`;
    used.add(name.toLowerCase());
    files.push({name, data: entryMarkdown(journal, e, new Set(files.map(f => f.name))), modified: now});
  }
  const json = JSON.stringify({metadata: {version: '1.0', app: 'ZIGoals', exported: now.toISOString()}, entries}, null, 2);
  const photosLeft = journal.entries.reduce((n, e) => n + (e.photos?.length ?? 0) + (e.morePhotos?.length ?? 0) + (e.audio?.length ?? 0), 0) - files.filter(f => /^(?:photos|audios)\//.test(f.name)).length;
  const readme = [
    'Your ZIGoals journal, exported on this device.',
    '',
    'journal.json holds every entry in Day One\'s export shape (creationDate, text, tags, photos, audios), with each entry\'s',
    'own day and journal under "zigoals". Journal → Import in ZIGoals reads this ZIP back; Day One can import the JSON.',
    'photos/ and audios/ hold the photos and voice notes the entries name.',
    'Markdown/ holds each entry as its own .md file (its day, journal and tags at the top), for Obsidian and other apps.',
    ...(photosLeft > 0 ? ['', `${photosLeft} photo${photosLeft === 1 ? '' : 's'} or voice note${photosLeft === 1 ? '' : 's'} were not in this browser (they stay on the device where they were added).`] : []),
    '',
    'This file contains personal writing: keep it private.',
  ].join('\n');
  return [{name: 'journal.json', data: json, modified: now}, {name: 'README.txt', data: readme, modified: now}, ...files];
}
/** Session AV lane 2 (r3-notes; LEDGER #272): one entry as Markdown with YAML front matter (strings written as JSON, valid YAML). */
export function entryMarkdown(journal: Pick<Journal, 'journals'>, e: JournalEntry, present: ReadonlySet<string> = new Set()): string {
  const q = (v: string) => JSON.stringify(v), book = bookOf(journal, e);
  const lines = ['---', `date: ${e.date}`, `created: ${e.createdAt}`, ...(e.updatedAt ? [`updated: ${e.updatedAt}`] : []), `journal: ${q(book?.name ?? 'Journal')}`,
    ...(e.tags?.length ? [`tags: [${e.tags.map(q).join(', ')}]`] : []), ...(e.template ? [`template: ${e.template}`] : []), ...(e.period ? [`period: ${q(e.period)}`] : []),
    ...(e.night ? [`night: ${e.night}`] : []), ...(e.opensOn ? [`opens-on: ${e.opensOn}`] : []), ...(e.star ? ['starred: true'] : []), `zigoals-id: ${q(e.id)}`, 'app: ZIGoals', '---', ''];
  const media = [...(e.photos ?? []), ...(e.morePhotos ?? [])].flatMap(id => { const f = [...present].find(n => n.startsWith(`photos/${id}.`)); return f ? [`![Photo](../${f})`] : []; });
  const answer = e.followUp ? `\n\n> ${e.followUp.question}${e.followUp.answer ? `\n>\n> ${e.followUp.answer}` : ''}` : '';
  return `${lines.join('\n')}${e.text.replace(/\r\n?/g, '\n')}${answer}${media.length ? `\n\n${media.join('\n')}` : ''}\n`;
}
