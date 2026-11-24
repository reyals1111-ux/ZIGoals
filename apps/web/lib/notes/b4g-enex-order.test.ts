import {describe, expect, test} from 'vitest';
import {readEnex} from './import-enex';

/**
 * Session AV lane 2 (review b4g B4G-9; LEDGER #321): Evernote's images are matched to their places whatever order the
 * resources come in — each place takes the first unused image of its type, else the first unused one.
 */
const PNG = 'iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAIAAABLbSncAAAAEUlEQVR4nGNYUPEfK2IYWhIAKxSFwScT0+MAAAAASUVORK5CYII=', JPG = '/9j/4AAQ';
const note = (media: string, resources: string) => `<?xml version="1.0"?><en-export><note><title>Fictional</title><content><![CDATA[<en-note>${media}</en-note>]]></content>${resources}</note></en-export>`;
const res = (mime: string, data: string) => `<resource><data encoding="base64">${data}</data><mime>${mime}</mime></resource>`;
describe('Evernote images in another order', () => {
  test('png then jpeg in the note, jpeg then png in the resources: both kept, each by its type', () => {
    const {notes} = readEnex(note('<en-media type="image/png" hash="a"/><div>between</div><en-media type="image/jpeg" hash="b"/>', res('image/jpeg', JPG) + res('image/png', PNG)));
    expect(notes[0]!.images.map(i => i.type)).toEqual(['image/png', 'image/jpeg']);
    expect(notes[0]!.body).toBe('![photo](imp-1)\n\nbetween\n\n![photo](imp-2)');
    expect(notes[0]!.body).not.toContain('left out');
  });
  test('a place whose type has no resource takes the first unused one; none left says so', () => {
    const {notes} = readEnex(note('<en-media type="image/gif" hash="a"/><en-media type="image/png" hash="b"/>', res('image/png', PNG)));
    expect(notes[0]!.images).toHaveLength(1);
    expect(notes[0]!.body).toContain('(an image from Evernote, left out)');
  });
});
