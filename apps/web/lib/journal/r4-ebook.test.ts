import {describe, expect, test} from 'vitest';
import {journalSchema, type Journal} from './schema';
import {ebookEntries, ebookFileName, journalDocx, journalEpub, longDay, pickName} from './ebook';
import {readZip} from '../notes/zip-read';
import {parseXml} from '../workouts/mini-xml';

/**
 * Session AV lane 2 (r4-notes; LEDGER #320, Journey's e-book and Word export): a chosen journal and date range as an
 * EPUB (mimetype first and stored, chapters by month, a contents page, photos inside) and as a Word file; a letter not
 * yet opened stays out. Every XML part well-formed.
 */
const AT = '2026-11-20T09:00:00.000Z';
const journal: Journal = journalSchema.parse({version: 1, shareWithAi: false, followUps: true, journals: [{id: 'j-trips01', name: 'Trips', theme: 'cyan'}], entries: [
  {id: 'e1', date: '2026-10-03', text: 'A fictional walk by the sea & a <shell>.', createdAt: AT, photos: ['m-photo0001']},
  {id: 'e2', date: '2026-11-02', text: '# Kyoto\n\nTemples and **tea**.', createdAt: AT, journal: 'j-trips01', tags: ['travel']},
  {id: 'e3', date: '2026-11-05', text: 'Dear future me, fictional secret.', createdAt: AT, opensOn: '2027-11-05'},
  {id: 'e4', date: '2026-12-01', text: 'Out of the range.', createdAt: AT}]});
const all = {book: 'all', from: '2026-10-01', to: '2026-11-30', today: '2026-11-22'} as const;
const files = async (bytes: Uint8Array) => (await readZip(bytes, () => true)).files.map(f => ({name: f.name, text: new TextDecoder().decode(f.data)}));

describe('the pick', () => {
  test('a range and a journal; a sealed letter waits', () => {
    expect(ebookEntries(journal, all)).toMatchObject({entries: [{id: 'e1'}, {id: 'e2'}], sealed: 1});
    expect(ebookEntries(journal, {...all, book: 'j-trips01'}).entries.map(e => e.id)).toEqual(['e2']);
    expect(ebookEntries(journal, {...all, book: 'main'}).entries.map(e => e.id)).toEqual(['e1']);
    expect([pickName(journal, 'all'), pickName(journal, 'main'), pickName(journal, 'j-trips01')]).toEqual(['All journals', 'Journal', 'Trips']);
    expect(longDay('2026-11-02')).toBe('Monday, November 2, 2026');
    expect(ebookFileName(journal, {...all, book: 'j-trips01'}, 'epub', true)).toBe('zigoals-example-trips-2026-10-01-to-2026-11-30.epub');
  });
});
describe('the e-book', () => {
  test('mimetype first and stored, a chapter a month, a contents page, the photo inside; well-formed', async () => {
    const out = await files(journalEpub(journal, all, new Map([['m-photo0001', {data: new Uint8Array([1, 2]), type: 'image/webp'}]]), {id: '0b6e0a5e-0000-4000-8000-000000000001', now: new Date(AT)}));
    expect(out[0]).toEqual({name: 'mimetype', text: 'application/epub+zip'});
    expect(out.map(f => f.name)).toEqual(['mimetype', 'META-INF/container.xml', 'OEBPS/images/m-photo0001.webp', 'OEBPS/month-2026-10.xhtml', 'OEBPS/month-2026-11.xhtml', 'OEBPS/nav.xhtml', 'OEBPS/style.css', 'OEBPS/toc.ncx', 'OEBPS/content.opf']);
    for (const f of out) if (/\.(?:xhtml|ncx|opf|xml)$/.test(f.name)) expect(() => parseXml(f.text.replace(/<!DOCTYPE html>/, '')), f.name).not.toThrow();
    const oct = out.find(f => f.name.endsWith('2026-10.xhtml'))!.text, nov = out.find(f => f.name.endsWith('2026-11.xhtml'))!.text;
    expect(oct).toContain('<h1>October 2026</h1>'); expect(oct).toContain('a &lt;shell&gt;'); expect(oct).toContain('<img src="images/m-photo0001.webp"');
    expect(nov).toContain('<p class="meta">Trips</p>'); expect(nov).toContain('<h3>Kyoto</h3>'); expect(nov).not.toContain('secret');
    const opf = out.find(f => f.name.endsWith('content.opf'))!.text;
    expect(opf).toContain('properties="nav"'); expect(opf).toContain('media-type="image/webp"'); expect(opf).toContain('<itemref idref="m1"/><itemref idref="m2"/>');
    expect(out.find(f => f.name.endsWith('nav.xhtml'))!.text).toContain('<a href="month-2026-10.xhtml#e1">');
  });
});
describe('the Word file', () => {
  test('months as headings, entries under their days; the letter waits', async () => {
    const out = await files(journalDocx(journal, all, new Map(), new Date(AT)));
    const doc = out.find(f => f.name === 'word/document.xml')!.text;
    expect(() => parseXml(doc)).not.toThrow();
    expect(doc).toContain('All journals'); expect(doc).toContain('October 2026'); expect(doc).toContain('Monday, November 2, 2026');
    expect(doc).toContain('Trips · #travel'); expect(doc).not.toContain('secret'); expect(doc).not.toContain('Out of the range');
  });
});
