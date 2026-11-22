import {describe, expect, test} from 'vitest';
import {notesSchema} from './schema';
import {buildDocx, noteDocx, noteHtml, noteText, noteFileName, xml} from './note-files';
import {readZip} from './zip-read';
import {parseXml} from '../workouts/mini-xml';

/**
 * Session AV lane 2 (r4-notes; LEDGER #319, Bear's exports): one note as an HTML page, plain text and a Word file written
 * by hand (Office Open XML in the repository's stored ZIP). Every XML part must be well-formed; words are escaped.
 */
const AT = '2026-11-20T09:00:00.000Z';
const body = ['# Fictional <plan> & more', 'Pack **light** and *early*, see https://example.com/a?b=1&c=2.', '', '- [ ] passport', '- [x] tickets', '', '1. first', '2. second', '', '> [!TIP] Go early', '> The train fills up.', '', '| Day | Place |', '| --- | --- |', '| Mon | Kyoto |', '', '![photo](p-2)', '', '```', 'code <here>', '```'].join('\n');
const note = notesSchema.parse({version: 1, notes: [{id: 'n1', kind: 'topic', title: 'Fictional trip', body, tags: ['travel'], photoId: 'p-1', photos: ['p-2'], createdAt: AT, updatedAt: '2026-11-21T09:00:00.000Z'}]}).notes[0]!;
const files = async (bytes: Uint8Array) => new Map((await readZip(bytes, () => true)).files.map(f => [f.name, new TextDecoder().decode(f.data)]));

describe('escaping', () => {
  test('the five XML specials, control characters and lone surrogates', () => {
    expect(xml('a<b>&"\'')).toBe('a&lt;b&gt;&amp;&quot;&apos;');
    expect(xml('x\u0001y\ud800z')).toBe('xy�z');
  });
});
describe('an HTML page and plain text', () => {
  test('the page holds the words escaped, the tick boxes, the callout, the table and the photos inside', () => {
    const html = noteHtml(note, new Map([['p-1', {data: new Uint8Array([1, 2, 3]), type: 'image/webp'}], ['p-2', {data: new Uint8Array([4]), type: 'image/jpeg'}]]));
    expect(html).toMatch(/^<!DOCTYPE html>/);
    expect(html).toContain('<title>Fictional trip</title>');
    expect(html).toContain('<h2>Fictional &lt;plan&gt; &amp; more</h2>');
    expect(html).toContain('<a href="https://example.com/a?b=1&amp;c=2">');
    expect(html).toContain('<li>☐ passport</li><li>☑ tickets</li>');
    expect(html).toContain('<aside class="callout callout-tip"><p><strong>Tip</strong>: Go early</p><p>The train fills up.</p></aside>');
    expect(html).toContain('<td>Kyoto</td>');
    expect(html).toContain('src="data:image/jpeg;base64,BA=="');
    expect(html).toContain('src="data:image/webp;base64,AQID"');
    expect(html).toContain('<pre><code>code &lt;here&gt;</code></pre>');
    expect(html).not.toMatch(/<script|<plan>/);
  });
  test('plain text reads as words', () => {
    const text = noteText(note);
    expect(text.split('\r\n').slice(0, 3)).toEqual(['Fictional trip', 'Made 2026-11-20 · changed 2026-11-21 · #travel', '']);
    expect(text).toContain('• ☐ passport\r\n• ☑ tickets');
    expect(text).toContain('Tip: Go early\r\nThe train fills up.');
    expect(text).not.toContain('**');
    expect(noteFileName(note, 'docx')).toBe('Fictional trip.docx');
  });
});
describe('a Word file', () => {
  test('its parts are there and every XML part is well-formed', async () => {
    const img = {data: new Uint8Array([0xff, 0xd8, 0xff]), type: 'image/jpeg' as const, width: 800, height: 600, alt: 'A <photo>'};
    const bytes = noteDocx(note, new Map([['p-1', img], ['p-2', img]]), new Date(AT)), parts = await files(bytes);
    // The careful reader leaves hidden names out, so the package's own _rels/.rels is checked in the stored bytes.
    const raw = new TextDecoder().decode(bytes);
    expect(raw).toContain('_rels/.rels'); expect(raw).toContain('Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"');
    expect([...parts.keys()]).toEqual(['[Content_Types].xml', 'word/document.xml', 'word/styles.xml', 'word/numbering.xml', 'word/_rels/document.xml.rels', 'docProps/core.xml', 'word/media/image1.jpeg', 'word/media/image2.jpeg']);
    for (const [name, text] of parts) if (name.endsWith('.xml') || name.endsWith('.rels')) expect(() => parseXml(text), name).not.toThrow();
    const doc = parts.get('word/document.xml')!;
    expect(doc).toContain('<w:pStyle w:val="Title"/></w:pPr><w:r><w:t xml:space="preserve">Fictional trip</w:t>');
    expect(doc).toContain('<w:pStyle w:val="Heading1"/></w:pPr><w:r><w:t xml:space="preserve">Fictional &lt;plan&gt; &amp; more</w:t>');
    expect(doc).toContain('<w:b/></w:rPr><w:t xml:space="preserve">light</w:t>');
    expect(doc).toContain('<w:t xml:space="preserve">☐ </w:t></w:r><w:r><w:t xml:space="preserve">passport</w:t>');
    expect(doc).toMatch(/<w:numId w:val="3"\/>/);
    expect(doc).toContain('<w:hyperlink r:id="rId10">');
    expect(doc.match(/<wp:inline/g)).toHaveLength(2);
    expect(doc).toContain('<wp:extent cx="5486400" cy="4114800"/>');
    expect(parts.get('word/_rels/document.xml.rels')).toContain('Target="https://example.com/a?b=1&amp;c=2" TargetMode="External"');
    expect(parts.get('docProps/core.xml')).toContain('<dc:title>Fictional trip</dc:title>');
  });
  test('an empty document is still a Word file', async () => {
    const parts = await files(buildDocx({title: 'Empty', blocks: [], now: new Date(AT)}));
    expect(parts.get('word/document.xml')).toContain('<w:body><w:sectPr>');
  });
});
