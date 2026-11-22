import type {ZipEntry} from '../export/zip';
import {buildStoredZip} from '../export/zip';
import {parseBlocks} from '../ai/safe-render';
import {bookOf, inBook, type BookChoice} from './books';
import {isSealed} from './letters';
import type {Journal, JournalEntry} from './schema';
import {PAGE_CSS, blocksHtml, buildDocx, docBlocks, xml, type DocBlock, type DocImage} from '../notes/note-files';

/**
 * Session AV lane 2 (r4-notes; LEDGER #320, Journey's e-book and Word export): a chosen journal (or all of them) between
 * two days, as an e-book (EPUB 3, with an EPUB 2 contents file for older readers) and as a Word file — both written by
 * hand into a ZIP through the repository's stored-ZIP writer (the EPUB's `mimetype` first and stored, as the format
 * asks), no package. One chapter per month (XHTML), each entry under its day, with its photos inside; a contents page
 * lists the months and their entries. A letter that has not opened yet (LEDGER #279) stays out, so its words wait for
 * their day. Pure: the caller reads the photos (and, for Word, makes them JPEG).
 */
export type EbookPick = {book: BookChoice; from: string; to: string; today: string};
export type EbookPhoto = {data: Uint8Array; type: string};
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
export const monthName = (ym: string) => `${MONTHS[Number(ym.slice(5, 7)) - 1]} ${ym.slice(0, 4)}`;
export const longDay = (d: string) => `${WEEKDAYS[new Date(`${d}T12:00:00Z`).getUTCDay()]}, ${MONTHS[Number(d.slice(5, 7)) - 1]} ${Number(d.slice(8, 10))}, ${d.slice(0, 4)}`;
const SHOWCASE = /\s*\(SHOWCASE DATA\)\s*$/;
/** The entries a pick holds, oldest first, and how many letters wait unopened. */
export function ebookEntries(journal: Journal, pick: EbookPick): {entries: JournalEntry[]; sealed: number} {
  const within = journal.entries.filter(e => e.date >= pick.from && e.date <= pick.to && inBook(journal, e, pick.book));
  const entries = within.filter(e => !isSealed(e, pick.today)).sort((a, b) => a.date.localeCompare(b.date) || a.createdAt.localeCompare(b.createdAt));
  return {entries, sealed: within.length - entries.length};
}
/** The journal's name for a pick ("Journal", a journal's own name, or "All journals"). */
export function pickName(journal: Journal, book: BookChoice): string {
  if (book === 'all') return 'All journals';
  if (book === 'main') return 'Journal';
  return (journal.journals ?? []).find(j => j.id === book)?.name ?? 'Journal';
}
const byMonth = (entries: readonly JournalEntry[]) => { const m = new Map<string, JournalEntry[]>(); for (const e of entries) { const k = e.date.slice(0, 7); m.set(k, [...(m.get(k) ?? []), e]); } return m; };
const entryTitle = (e: JournalEntry) => { const first = e.text.replace(SHOWCASE, '').split('\n').map(l => l.replace(/^#+\s*/, '').trim()).find(Boolean) ?? ''; return first.length > 60 ? `${first.slice(0, 59)}…` : first; };
const entryBlocks = (e: JournalEntry) => parseBlocks(`${e.text.replace(SHOWCASE, '\n\n(Showcase example)')}${e.followUp ? `\n\n> ${e.followUp.question}${e.followUp.answer ? ` ${e.followUp.answer}` : ''}` : ''}`, {notes: true});
const PHOTO_EXT: Record<string, string> = {'image/jpeg': 'jpg', 'image/webp': 'webp', 'image/png': 'png'};
const xhtml = (title: string, body: string, lang: string) => `<?xml version="1.0" encoding="utf-8"?>\n<!DOCTYPE html>\n<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" xml:lang="${lang}" lang="${lang}"><head><meta charset="utf-8"/><title>${xml(title)}</title><link rel="stylesheet" type="text/css" href="style.css"/></head><body>${body}</body></html>\n`;
/** The e-book's files (mimetype first); `id` names the book (a UUID made by the caller). */
export function journalEpubEntries(journal: Journal, pick: EbookPick, photos: ReadonlyMap<string, EbookPhoto>, {id, now = new Date(), lang = 'en'}: {id: string; now?: Date; lang?: string}): ZipEntry[] {
  const {entries} = ebookEntries(journal, pick), months = byMonth(entries), title = `${pickName(journal, pick.book)} · ${longDay(pick.from)} to ${longDay(pick.to)}`;
  const files: ZipEntry[] = [], manifest: string[] = [], spine: string[] = [], toc: {file: string; month: string; entries: {anchor: string; label: string}[]}[] = [];
  const add = (name: string, data: Uint8Array | string) => files.push({name: `OEBPS/${name}`, data, modified: now});
  let chapter = 0;
  for (const [ym, list] of months) {
    const file = `month-${ym}.xhtml`, item = `m${++chapter}`, sections: string[] = [], listed: {anchor: string; label: string}[] = [];
    for (const [k, e] of list.entries()) {
      const anchor = `e${k + 1}`, book = bookOf(journal, e);
      const kept = (e.photos ?? []).flatMap(pid => { const p = photos.get(pid), ext = p ? PHOTO_EXT[p.type] : undefined; return p && ext ? [{pid, ext, p}] : []; });
      for (const {pid, ext, p} of kept) if (!files.some(f => f.name === `OEBPS/images/${pid}.${ext}`)) { add(`images/${pid}.${ext}`, p.data); manifest.push(`<item id="img-${xml(pid)}" href="images/${xml(pid)}.${ext}" media-type="${p.type}"/>`); }
      const head = `${longDay(e.date)}${entryTitle(e) ? ` · ${entryTitle(e)}` : ''}`;
      listed.push({anchor, label: head});
      sections.push(`<section id="${anchor}"><h2>${xml(longDay(e.date))}</h2>${pick.book === 'all' && book ? `<p class="meta">${xml(book.name)}</p>` : ''}${e.tags?.length ? `<p class="meta">${xml(e.tags.map(t => `#${t}`).join(' '))}</p>` : ''}${blocksHtml(entryBlocks(e), () => null, 3)}${kept.map(({pid, ext}) => `<figure><img src="images/${xml(pid)}.${ext}" alt="${xml(`A photo from ${longDay(e.date)}`)}"/></figure>`).join('')}</section>`);
    }
    add(file, xhtml(monthName(ym), `<h1>${xml(monthName(ym))}</h1>${sections.join('\n')}`, lang));
    manifest.push(`<item id="${item}" href="${file}" media-type="application/xhtml+xml"/>`); spine.push(`<itemref idref="${item}"/>`);
    toc.push({file, month: monthName(ym), entries: listed});
  }
  const navList = toc.map(t => `<li><a href="${t.file}">${xml(t.month)}</a><ol>${t.entries.map(e => `<li><a href="${t.file}#${e.anchor}">${xml(e.label)}</a></li>`).join('')}</ol></li>`).join('');
  add('nav.xhtml', xhtml('Contents', `<h1>${xml(title)}</h1><nav epub:type="toc" id="toc"><h2>Contents</h2><ol>${navList || '<li><a href="nav.xhtml">No entries</a></li>'}</ol></nav><p class="meta">${entries.length === 1 ? '1 entry' : `${entries.length} entries`}, made with ZIGoals on this device. This book holds personal writing: keep it private.</p>`, lang));
  add('style.css', `${PAGE_CSS}nav ol{padding-left:1.2rem}section{margin-bottom:2rem}`);
  let order = 0;
  const points = toc.map(t => `<navPoint id="n${++order}" playOrder="${order}"><navLabel><text>${xml(t.month)}</text></navLabel><content src="${t.file}"/>${t.entries.map(e => `<navPoint id="n${++order}" playOrder="${order}"><navLabel><text>${xml(e.label)}</text></navLabel><content src="${t.file}#${e.anchor}"/></navPoint>`).join('')}</navPoint>`).join('');
  add('toc.ncx', `<?xml version="1.0" encoding="utf-8"?>\n<ncx xmlns="http://www.daisy.org/z3986/2005/ncx/" version="2005-1"><head><meta name="dtb:uid" content="urn:uuid:${xml(id)}"/></head><docTitle><text>${xml(title)}</text></docTitle><navMap>${points}</navMap></ncx>\n`);
  const modified = now.toISOString().replace(/\.\d+Z$/, 'Z');
  add('content.opf', `<?xml version="1.0" encoding="utf-8"?>\n<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="uid" xml:lang="${lang}"><metadata xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:identifier id="uid">urn:uuid:${xml(id)}</dc:identifier><dc:title>${xml(title)}</dc:title><dc:language>${lang}</dc:language><dc:creator>ZIGoals</dc:creator><meta property="dcterms:modified">${modified}</meta></metadata><manifest><item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/><item id="ncx" href="toc.ncx" media-type="application/x-dtbncx+xml"/><item id="css" href="style.css" media-type="text/css"/>${manifest.join('')}</manifest><spine toc="ncx"><itemref idref="nav"/>${spine.join('')}</spine></package>\n`);
  return [
    {name: 'mimetype', data: 'application/epub+zip', modified: now},
    {name: 'META-INF/container.xml', data: '<?xml version="1.0" encoding="utf-8"?>\n<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container"><rootfiles><rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/></rootfiles></container>\n', modified: now},
    ...files,
  ];
}
export const journalEpub = (...args: Parameters<typeof journalEpubEntries>) => buildStoredZip(journalEpubEntries(...args));
/** The same pick as a Word file: a title, then each month as a heading with its entries under their days, photos inside. */
export function journalDocx(journal: Journal, pick: EbookPick, images: ReadonlyMap<string, DocImage>, now = new Date()): Uint8Array {
  const {entries} = ebookEntries(journal, pick), blocks: DocBlock[] = [{kind: 'title', text: pickName(journal, pick.book)}, {kind: 'subtitle', text: `${longDay(pick.from)} to ${longDay(pick.to)} · ${entries.length === 1 ? '1 entry' : `${entries.length} entries`}`}];
  for (const [ym, list] of byMonth(entries)) {
    blocks.push({kind: 'heading', level: 1, runs: [{text: monthName(ym)}]});
    for (const e of list) {
      const book = bookOf(journal, e);
      blocks.push({kind: 'heading', level: 2, runs: [{text: longDay(e.date)}]});
      if ((pick.book === 'all' && book) || e.tags?.length) blocks.push({kind: 'para', runs: [{text: [pick.book === 'all' && book ? book.name : '', e.tags?.map(t => `#${t}`).join(' ') ?? ''].filter(Boolean).join(' · '), italic: true}]});
      blocks.push(...docBlocks(entryBlocks(e), () => null, 3));
      for (const pid of e.photos ?? []) { const img = images.get(pid); if (img) blocks.push({kind: 'image', image: img}); }
    }
  }
  return buildDocx({title: pickName(journal, pick.book), blocks, now});
}
export const ebookFileName = (journal: Journal, pick: EbookPick, ext: 'epub' | 'docx', showcase: boolean) => `zigoals-${showcase ? 'example-' : ''}${pickName(journal, pick.book).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'journal'}-${pick.from}-to-${pick.to}.${ext}`;
