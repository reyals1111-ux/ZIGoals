import {describe, expect, test} from 'vitest';
import {bearTags, bearWanted, enexTime, enmlToMarkdown, foreignFiles, namePhotos, readBear, readEnex} from './import-enex';
import {planImport} from './markdown';
import {emptyNotes} from './schema';
import {noteTags} from './tags';

/**
 * Session AV lane 2 (r4-notes; LEDGER #321, Bear's imports): Evernote's .enex and Bear's TextBundle, read on this device
 * into the notes' own Markdown import (plan first, Undo after). Fictional files made here.
 */
const PNG = 'iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAIAAABLbSncAAAAEUlEQVR4nGNYUPEfK2IYWhIAKxSFwScT0+MAAAAASUVORK5CYII=';
const enml = (inner: string) => `<?xml version="1.0" encoding="UTF-8"?><!DOCTYPE en-note SYSTEM "http://xml.evernote.com/pub/enml2.dtd"><en-note>${inner}</en-note>`;
const ENEX = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE en-export SYSTEM "http://xml.evernote.com/pub/evernote-export4.dtd">
<en-export export-date="20261120T090000Z" application="Evernote" version="10">
  <note><title>Fictional trip &amp; plans</title>
    <created>20261101T083000Z</created><tag>travel</tag><tag>japan</tag>
    <content><![CDATA[${enml('<h1>Kyoto</h1><div>Temples&nbsp;and <b>tea</b>, see <a href="https://example.com/kyoto">the guide</a>.</div><div><en-todo checked="true"/>book the train</div><div><en-todo/>pack</div><ul><li>shoes</li><li>rain <i>coat</i></li></ul><en-media type="image/png" hash="abc"/><table><tr><td>Day</td><td>Place</td></tr><tr><td>Mon</td><td>Nara</td></tr></table><div><a href="javascript:alert(1)">bad</a></div>')}]]></content>
    <resource><data encoding="base64">${PNG}</data><mime>image/png</mime></resource>
  </note>
  <note><title>Fictional second</title><content><![CDATA[${enml('<p>Just words.</p><en-crypt>xyz</en-crypt>')}]]></content></note>
</en-export>`;

describe('Evernote (.enex)', () => {
  test('titles, days, tags, the words as Markdown and the first image as a photo', () => {
    const {notes, skipped} = readEnex(ENEX, 'Fictional.enex');
    expect(skipped).toEqual([]);
    expect(notes.map(n => [n.name, n.title, n.created, n.tags])).toEqual([
      ['Evernote/Fictional trip & plans.md', 'Fictional trip & plans', '2026-11-01T08:30:00.000Z', ['travel', 'japan']],
      ['Evernote/Fictional second.md', 'Fictional second', undefined, []]]);
    expect(notes[0]!.body).toBe(['# Kyoto', '', 'Temples and **tea**, see [the guide](https://example.com/kyoto).', '- [x] book the train', '- [ ] pack', '- shoes', '- rain *coat*', '', '![photo](imp-1)', '', '| Day | Place |', '| --- | --- |', '| Mon | Nara |', '', 'bad'].join('\n'));
    expect(notes[0]!.images).toEqual([{key: 'imp-1', data: expect.any(Uint8Array), type: 'image/png'}]);
    expect(notes[1]!.body).toBe('Just words.\n\n(encrypted text from Evernote, left out)');
  });
  test('refused: entities declared in the file, and what is not an export', () => {
    expect(readEnex('<!DOCTYPE x [<!ENTITY a "b">]><en-export/>').skipped[0]!.reason).toMatch(/entities/);
    expect(readEnex('<html><body/></html>').skipped[0]!.reason).toMatch(/not an Evernote export/);
    expect(readEnex('not xml at all <').skipped[0]!.reason).toMatch(/not an Evernote export ZIGoals can read/);
    expect(enexTime('20261301T000000Z')).toBeUndefined();
  });
  test('ENML that is not well-formed still gives its words', () => {
    expect(enmlToMarkdown('<en-note><div>One<br>two</div></en-note>')).toBe('One\ntwo');
  });
  test('the plan imports them with their tags; the photo is named once kept, the first under the words', () => {
    const {notes} = readEnex(ENEX);
    const {files, images} = foreignFiles(notes);
    const plan = planImport(emptyNotes(), files, '2026-11-22T09:00:00.000Z', '2026-11-22');
    expect(plan.add.map(n => [n.title, n.tags, n.createdAt])).toEqual([['Fictional trip & plans', ['travel', 'japan'], '2026-11-01T08:30:00.000Z'], ['Fictional second', undefined, '2026-11-22T09:00:00.000Z']]);
    expect(plan.from).toEqual(['Evernote/Fictional trip & plans.md', 'Evernote/Fictional second.md']);
    expect(images.get(plan.from![0]!)).toHaveLength(1);
    const named = namePhotos(plan.add[0]!.body, new Map([['imp-1', 'n-photo1']]));
    expect(named.photoId).toBe('n-photo1'); expect(named.photos).toEqual([]); expect(named.body).not.toContain('imp-1');
    expect(namePhotos('a\n\n![photo](imp-1)\n\nb\n\n![photo](imp-2)', new Map([['imp-1', 'p1'], ['imp-2', 'p2']]))).toEqual({body: 'a\n\nb\n\n![photo](p2)', photoId: 'p1', photos: ['p2']});
    expect(namePhotos('a\n\n![photo](imp-1)\n\nb', new Map())).toEqual({body: 'a\n\nb', photos: []});
  });
});
describe('Bear (TextBundle)', () => {
  const enc = (s: string) => new TextEncoder().encode(s);
  const files = [
    {name: 'Bear/Fictional garden.textbundle/text.md', data: enc('# Fictional garden\n\nRoses for #home and #garden/roses, and a #big plan#.\n\n![](assets/rose.png)\n\nMore.')},
    {name: 'Bear/Fictional garden.textbundle/info.json', data: enc(JSON.stringify({'net.shinyfrog.bear': {creationDate: '2026-10-01T10:00:00Z'}}))},
    {name: 'Bear/Fictional garden.textbundle/assets/rose.png', data: new Uint8Array([1, 2, 3])},
    {name: 'Bear/Empty.textbundle/info.json', data: enc('{}')}];
  test('which entries are read', () => {
    expect(files.map(f => bearWanted(f.name))).toEqual([true, true, true, true]);
    expect(bearWanted('Bear/notes.txt')).toBe(false);
  });
  test('the title from the first heading, tags in the text (nested and multi-word), the photo, the day', () => {
    const {notes, skipped} = readBear(files);
    expect(skipped).toEqual([{name: 'Bear/Empty.textbundle', reason: 'it has no text.md'}]);
    expect(notes).toHaveLength(1);
    expect(notes[0]).toMatchObject({name: 'Bear/Fictional garden.md', title: 'Fictional garden', created: '2026-10-01T10:00:00.000Z', images: [{key: 'imp-1', type: 'image/png'}]});
    expect(notes[0]!.body).toBe('Roses for #home and #garden/roses, and a #big-plan.\n\n![photo](imp-1)\n\nMore.');
    expect(noteTags({body: notes[0]!.body})).toEqual(['home', 'garden/roses', 'big-plan']);
    expect(bearTags('#one# and #two words#')).toBe('#one# and #two-words');
  });
});
