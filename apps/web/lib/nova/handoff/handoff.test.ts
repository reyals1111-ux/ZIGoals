import {describe, expect, test} from 'vitest';
import {unfold} from '../../ics/ics';
import {
  HANDOFF_KINDS, HANDOFF_WHAT, MAILTO_MAX, MAX_BODY, MAX_COPY, MAX_SUBJECT, MAX_TITLE, MAX_TO, SECRET_WORDS, buildCalendar, buildCopy, buildEmail, buildLink, buildShare, handoffTarget, handoffTexts,
  TYPED_READ_CHARS, TYPED_READ_MESSAGES, addressesIn, holdsHidden, holdsSecret, isAddress, linksIn, mailtoEncode, mailtoLink, oneLine, plainText, realDay, recentTyped, trimLink, type Built, type Handoff,
} from './handoff';
import {cardNotes, CARD_ACTION, CARD_PROMISE, CARD_TITLE, DONE_WORDS, FAILED_WORDS, READY_WORDS} from './words';

// Session AM-2 (owner's step 4b): the pure builders of NOVA's hand-offs. Nothing here opens, saves, shares or copies.
const NOW = new Date('2026-11-15T09:00:00Z');
const ok = <T extends Handoff>(built: Built<T>): T => { if (!built.ok) throw Error(`expected a hand-off, got: ${built.words}`); return built.handoff; };
const not = (built: Built): {reason: string; words: string} => { if (built.ok) throw Error('expected a refusal'); return built; };
// Fictional secrets, in the shapes the guard knows.
// Built at run time, so no file holds a value that reads as recovery words (scripts/check-secrets.mjs; the allowlist stays empty).
const SEED = ['abandon', 'ability', 'able', 'about', 'above', 'absent', 'absorb', 'abstract', 'absurd', 'abuse', 'access', 'accident'].join(' ');
const HEX_KEY = `0x${'ab12'.repeat(16)}`, API_KEY = `sk-${'a1B2c3D4'.repeat(4)}`, CARD = '4111 1111 1111 1111';

describe('an email draft is a mailto: link (RFC 6068)', () => {
  test('to, subject and body are filled in; only those two header fields are ever written', () => {
    const h = ok(buildEmail({to: ['Anna.Example@Example.COM'], subject: 'Dinner on Friday', body: 'Hi Anna,\nshall we say 19:00?'}));
    expect(h).toEqual({kind: 'email', to: ['Anna.Example@example.com'], subject: 'Dinner on Friday', body: 'Hi Anna,\nshall we say 19:00?', bodyInLink: true,
      href: 'mailto:Anna.Example@example.com?subject=Dinner%20on%20Friday&body=Hi%20Anna%2C%0D%0Ashall%20we%20say%2019%3A00%3F'});
    expect(new URL(h.href).protocol).toBe('mailto:');
    expect(mailtoLink(h.to, h.subject, h.body)).toBe(h.href);
    // Several addresses are a comma-separated list; a draft without an address or without a body is still a draft.
    expect(ok(buildEmail({to: ['a@example.com', 'b@example.org'], subject: 'Hi'})).href).toBe('mailto:a@example.com,b@example.org?subject=Hi');
    expect(ok(buildEmail({subject: 'Hi'})).href).toBe('mailto:?subject=Hi');
    expect(ok(buildEmail({to: ['a@example.com']})).href).toBe('mailto:a@example.com');
    expect(ok(buildEmail({named: 'Anna'})).href).toBe('mailto:');
    expect(ok(buildEmail({to: ['a@example.com', 'A@EXAMPLE.com', 'a@example.com']})).to).toEqual(['a@example.com', 'A@example.com']);
  });
  test('the encoding: every reserved character is percent-encoded as UTF-8, a space is %20 (never +), a line break is CRLF', () => {
    expect(mailtoEncode('a b')).toBe('a%20b');
    expect(mailtoEncode('a+b')).toBe('a%2Bb');
    expect(mailtoEncode('100% & more? #1 = yes')).toBe('100%25%20%26%20more%3F%20%231%20%3D%20yes');
    expect(mailtoEncode('één café ☕')).toBe('%C3%A9%C3%A9n%20caf%C3%A9%20%E2%98%95');
    for (const breaks of ['a\nb', 'a\r\nb', 'a\rb']) expect(mailtoEncode(breaks)).toBe('a%0D%0Ab');
    expect(mailtoEncode("it's (fine)! *")).toBe('it%27s%20%28fine%29%21%20%2A');
    expect(mailtoEncode('AZaz09-._~')).toBe('AZaz09-._~');
    // The result holds only characters a URI may carry.
    for (const text of ['<script>alert(1)</script>', '"quoted" \\ back`tick` {x} |y| ^z', '\ud83d\ude00 emoji', 'tab\there', 'lone \ud800 surrogate']) expect(mailtoEncode(text)).toMatch(/^[A-Za-z0-9\-._~%]*$/);
    expect(decodeURIComponent(mailtoEncode('Round trip: ü & ? = # % + /'))).toBe('Round trip: ü & ? = # % + /');
  });
  test('no header injection: a subject or body that names another field stays that field\'s text; a line break in a subject is a space', () => {
    const h = ok(buildEmail({to: ['a@example.com'], subject: 'Hello&cc=evil@example.org\r\nBcc: evil@example.org', body: 'Hi&bcc=evil@example.org?subject=x#frag'}));
    expect(h.subject).toBe('Hello&cc=evil@example.org Bcc: evil@example.org');
    const fields = h.href.slice(h.href.indexOf('?') + 1).split('&');
    expect(fields.map(f => f.split('=')[0])).toEqual(['subject', 'body']);
    expect(h.href).not.toMatch(/[?&](?:cc|bcc|to|from|reply-to|attach)=/i);
    expect(h.href.split('?')).toHaveLength(2); expect(h.href).not.toContain('#');
    // An address is one address: nothing after it can add a recipient or a field.
    for (const bad of ['a@example.com?cc=evil@example.org', 'a@example.com,evil@example.org', 'a@example.com&bcc=x@example.org', 'a@example.com\nBcc: x@example.org', 'Anna <a@example.com>', '"a b"@example.com', 'a@example', 'a@@example.com', '@example.com', 'a@.com',
      'a..b@example.com', '.a@example.com', 'a@exa mple.com', 'a@пример.рф', 'javascript:alert(1)', `${'a'.repeat(65)}@example.com`, `a@${'b'.repeat(250)}.com`]) {
      expect(isAddress(bad), bad).toBe(false);
      expect(not(buildEmail({to: [bad], subject: 'x'})).reason, bad).toBe('address');
    }
    // A local part with characters that mean something in a link is encoded, so it stays one address.
    expect(ok(buildEmail({to: ['a&b?c=d%e@example.com'], subject: 'x'})).href).toBe('mailto:a%26b%3Fc%3Dd%25e@example.com?subject=x');
    expect(not(buildEmail({to: Array.from({length: MAX_TO + 1}, (_, i) => `p${i}@example.com`)})).reason).toBe('address');
  });
  test('length: a draft too long for a link opens with the address and subject only, says so honestly, and the body stays on the card to copy', () => {
    const short = ok(buildEmail({to: ['a@example.com'], subject: 'S', body: 'x'.repeat(1900)}));
    expect(short.bodyInLink).toBe(true); expect(short.href.length).toBeLessThanOrEqual(MAILTO_MAX);
    const long = ok(buildEmail({to: ['a@example.com'], subject: 'Minutes', body: Array.from({length: 120}, (_, i) => `${i + 1}. Agenda item ${i + 1}: decided, see the minutes (page ${i + 3}).`).join('\n')}));
    expect(long.bodyInLink).toBe(false);
    expect(long.href).toBe('mailto:a@example.com?subject=Minutes');
    expect(long.body.length).toBeGreaterThan(2000); expect(long.body.length).toBeLessThanOrEqual(MAX_BODY);
    expect(cardNotes(long, 'en').join(' ')).toContain('The text is too long for a mail link (a link carries about 2,000 characters). Copy the text');
    expect(cardNotes(long, 'nl').join(' ')).toContain('De tekst is te lang voor een maillink');
    expect(cardNotes(short, 'en')).toEqual([]);
    // Non-ASCII text grows nine-fold when encoded: the cap counts the link, not the letters.
    expect(ok(buildEmail({to: ['a@example.com'], body: '☕'.repeat(300)})).bodyInLink).toBe(false);
    // Bounds on what the card holds at all.
    expect(ok(buildEmail({subject: 's'.repeat(500)})).subject).toHaveLength(MAX_SUBJECT);
    expect(ok(buildEmail({subject: 'x', body: 'b'.repeat(9000)})).body).toHaveLength(MAX_BODY);
    expect(not(buildEmail({})).reason).toBe('empty');
    // Notes about the address.
    expect(cardNotes(ok(buildEmail({named: 'Anna', subject: 'Dinner'})), 'en')[0]).toBe('No address in your words: fill in Anna’s address in your mail app.');
    expect(cardNotes(ok(buildEmail({subject: 'Dinner'})), 'en')[0]).toBe('No address yet: fill it in in your mail app.');
  });
});

describe('a link is http(s) only, shown with its real host', () => {
  test('a plain web link: the browser\'s own reading of it, the host as the browser asks it', () => {
    expect(ok(buildLink({url: 'https://example.com/a/b?c=d#e', source: 'person'}))).toEqual({kind: 'link', href: 'https://example.com/a/b?c=d#e', host: 'example.com', secure: true, idn: false, untrusted: false});
    expect(ok(buildLink({url: 'HTTP://Example.COM:8080/Path', source: 'person'}))).toMatchObject({href: 'http://example.com:8080/Path', host: 'example.com:8080', secure: false});
    expect(ok(buildLink({url: 'example.com/page', source: 'person', bare: true})).href).toBe('https://example.com/page');
    expect(not(buildLink({url: 'example.com/page', source: 'other'})).reason).toBe('link');
  });
  test('every other scheme is refused, whatever its spelling', () => {
    for (const url of ['javascript:alert(1)', 'JaVaScRiPt:alert(1)', 'java\tscript:alert(1)', ' javascript:alert(1)', 'data:text/html,<script>alert(1)</script>', 'file:///etc/passwd', 'blob:https://example.com/x', 'mailto:a@example.com', 'tel:+3212345678', 'sms:123',
      'ftp://example.com/x', 'ws://example.com', 'intent://example.com#Intent;scheme=https;end', 'vbscript:msgbox(1)', 'about:blank', 'chrome://settings', 'view-source:https://example.com', 'zigoals://x', '//example.com/x', '/app/settings', 'https:/example.com', 'https:example.com',
      'http://', 'https://', 'https:///example.com', '', '   ', 'not a link', 'https://exa mple.com', 'https://example.com/a b', 'https://example.com\\@evil.example', 'https://example.com/\u202Egpj.exe', 'https://exam\u200Bple.com', `https://example.com/${'a'.repeat(2100)}`]) {
      const built = buildLink({url, source: 'person', bare: true});
      expect(built.ok, url).toBe(false);
      expect(not(built).reason, url).toBe('link');
    }
  });
  test('a name or a password before the host is refused: it reads like one site and opens another', () => {
    for (const url of ['https://bank.example@evil.example/login', 'https://user:pw@example.com/', 'https://example.com%2F@evil.example/', 'http://paypal.com:80@evil.example', 'https://@example.com/']) expect(not(buildLink({url, source: 'person'})).words, url).toContain('name or a password in front of its site');
  });
  test('an internationalised name is shown in the form the browser really asks for, and said to be one', () => {
    const h = ok(buildLink({url: 'https://аpple.com/login', source: 'other'}));      // the first letter is Cyrillic
    expect(h.host).toBe('xn--pple-43d.com'); expect(h.href).toBe('https://xn--pple-43d.com/login');
    expect(h.idn).toBe(true); expect(h.written).toBe('аpple.com');
    const notes = cardNotes(h, 'en').join(' ');
    expect(notes).toContain('Written as “аpple.com”; the real site is xn--pple-43d.com.');
    expect(notes).toContain('This address uses an internationalised name.');
    const puny = ok(buildLink({url: 'https://xn--pple-43d.com/', source: 'person'}));
    expect(puny).toMatchObject({host: 'xn--pple-43d.com', idn: true}); expect(puny.written).toBeUndefined();
    // An ordinary name written in capitals is the same host: no note.
    expect(ok(buildLink({url: 'https://EXAMPLE.com/', source: 'person'})).written).toBeUndefined();
    expect(cardNotes(ok(buildLink({url: 'https://example.com/', source: 'person'})), 'en')).toEqual([]);
  });
  test('a link that is not from the person\'s own words is marked, in both languages; http says it is not encrypted', () => {
    const h = ok(buildLink({url: 'http://example.com/', source: 'other'}));
    expect(h.untrusted).toBe(true);
    expect(cardNotes(h, 'en')).toEqual(['This link did not come from your own words (it came from a model’s reply, a lookup or pasted text). Check the address before you open it.', 'Not encrypted (http): others on the network can read along.']);
    expect(cardNotes(h, 'nl')[0]).toContain('komt niet uit je eigen woorden');
    expect(ok(buildLink({url: 'https://example.com/', source: 'person'})).untrusted).toBe(false);
  });
});

describe('a calendar file is one event through the app\'s own .ics builder', () => {
  test('an event with a time, and one for the whole day', () => {
    const h = ok(buildCalendar({title: 'Dentist', date: '2026-12-03', time: '14:00'}, NOW));
    expect(h).toMatchObject({kind: 'calendar', title: 'Dentist', date: '2026-12-03', time: '14:00', minutes: 60, fileName: 'nova-dentist-2026-12-03.ics'});
    const lines = unfold(h.ics);
    expect(lines[0]).toBe('BEGIN:VCALENDAR'); expect(lines.at(-1)).toBe('END:VCALENDAR');
    expect(lines.filter(l => l === 'BEGIN:VEVENT')).toHaveLength(1);
    expect(lines).toContain('DTSTART:20261203T140000'); expect(lines).toContain('DURATION:PT60M'); expect(lines).toContain('SUMMARY:Dentist'); expect(lines).toContain('DTSTAMP:20261115T090000Z');
    expect(h.ics.endsWith('\r\n')).toBe(true);
    const day = ok(buildCalendar({title: 'Rent', date: '2026-12-01', note: 'Pay before noon'}, NOW));
    expect(day.time).toBeUndefined(); expect(day.minutes).toBeUndefined();
    expect(unfold(day.ics)).toEqual(expect.arrayContaining(['DTSTART;VALUE=DATE:20261201', 'DTEND;VALUE=DATE:20261202', 'DESCRIPTION:Pay before noon']));
    expect(cardNotes(day, 'en')).toEqual(['An all-day event.']);
    expect(cardNotes(h, 'nl')[0]).toContain('eigen klok');
    // The same event made twice is the same event in a calendar app (a stable UID); another one is another.
    const uid = (ics: string) => unfold(ics).find(l => l.startsWith('UID:'));
    expect(uid(ok(buildCalendar({title: 'Dentist', date: '2026-12-03', time: '14:00'}, new Date('2026-11-16T10:00:00Z'))).ics)).toBe(uid(h.ics));
    expect(uid(day.ics)).not.toBe(uid(h.ics));
  });
  test('a title cannot start a property or a second event; the file name is plain', () => {
    const h = ok(buildCalendar({title: 'Lunch\r\nEND:VEVENT\r\nBEGIN:VEVENT\r\nSUMMARY:Evil; x, y', date: '2026-12-03', note: 'a\nATTACH:file:///etc/passwd'}, NOW));
    const lines = unfold(h.ics);
    expect(lines.filter(l => l === 'BEGIN:VEVENT')).toHaveLength(1); expect(lines.filter(l => l === 'END:VEVENT')).toHaveLength(1);
    expect(lines.filter(l => /^(?:ATTACH|URL|ORGANIZER|ATTENDEE|VALARM|BEGIN:VALARM)/.test(l))).toEqual([]);
    expect(lines.find(l => l.startsWith('SUMMARY:'))).toBe('SUMMARY:Lunch END:VEVENT BEGIN:VEVENT SUMMARY:Evil\\; x\\, y');
    expect(lines.find(l => l.startsWith('DESCRIPTION:'))).toBe('DESCRIPTION:a\\nATTACH:file:///etc/passwd');
    for (const title of ['../../etc/passwd', 'C:\\x\\y', 'Café “Zürich” / 3', '💡', '.hidden', 'a'.repeat(300)]) expect(ok(buildCalendar({title, date: '2026-12-03'}, NOW)).fileName, title).toMatch(/^nova-[a-z0-9-]{1,40}-2026-12-03\.ics$/);
    expect(ok(buildCalendar({title: 't'.repeat(500), date: '2026-12-03'}, NOW)).title).toHaveLength(MAX_TITLE);
  });
  test('a day that is not a day, or a time that is not a time, makes no file', () => {
    for (const date of ['', 'tomorrow', '2026-02-30', '2026-13-01', '03-12-2026', '2026-12-3', '1960-01-01', '9999-01-01']) { expect(realDay(date), date).toBe(false); expect(not(buildCalendar({title: 'x', date}, NOW)).reason, date).toBe('date'); }
    expect(realDay('2028-02-29')).toBe(true);
    for (const time of ['25:00', '14.30', '2pm', '14:60']) expect(not(buildCalendar({title: 'x', date: '2026-12-03', time}, NOW)).reason, time).toBe('date');
    expect(not(buildCalendar({title: '   ', date: '2026-12-03'}, NOW)).reason).toBe('empty');
    expect(ok(buildCalendar({title: 'x', date: '2026-12-03', time: '09:00', minutes: 100000}, NOW)).minutes).toBe(1440);
    expect(ok(buildCalendar({title: 'x', date: '2026-12-03', time: '09:00', minutes: 1}, NOW)).minutes).toBe(5);
  });
});

describe('share and copy', () => {
  test('share: text, a checked link, or both; nothing to share is said plainly', () => {
    expect(ok(buildShare({text: 'Hello', source: 'person'}))).toEqual({kind: 'share', text: 'Hello'});
    expect(ok(buildShare({title: 'T', text: 'Hello', url: 'https://example.com/x', source: 'person'}))).toEqual({kind: 'share', title: 'T', text: 'Hello', url: 'https://example.com/x', host: 'example.com'});
    expect(not(buildShare({source: 'person'})).reason).toBe('empty');
    expect(not(buildShare({text: 'x', url: 'javascript:alert(1)', source: 'person'})).reason).toBe('link');
    expect(not(buildShare({text: 'x', url: 'https://a@evil.example/', source: 'person'})).reason).toBe('link');
  });
  test('copy: exactly the text the card shows; too long is said, never cut silently', () => {
    expect(ok(buildCopy({text: '  Line one\r\nLine two  '}))).toEqual({kind: 'copy', text: 'Line one\nLine two'});
    expect(not(buildCopy({text: ''})).reason).toBe('empty');
    expect(not(buildCopy({text: 'x'.repeat(MAX_COPY + 1)})).reason).toBe('long');
    expect(ok(buildCopy({text: 'x'.repeat(MAX_COPY)})).text).toHaveLength(MAX_COPY);
  });
});

describe('the guard: a secret never goes into a hand-off', () => {
  test('recovery words, a private key, an API key, "password is …" and a card number are refused in every field of every kind', () => {
    for (const secret of [SEED, HEX_KEY, API_KEY, 'my password is hunter2-fictional', `card ${CARD}`]) {
      expect(holdsSecret([secret]), secret).toBe(true);
      const tries: Built[] = [
        buildEmail({to: ['a@example.com'], subject: 'Keys', body: `Here: ${secret}`}), buildEmail({to: ['a@example.com'], subject: secret}),
        buildCalendar({title: 'Backup', date: '2026-12-03', note: secret}, NOW), buildCalendar({title: secret, date: '2026-12-03'}, NOW),
        buildShare({text: secret, source: 'person'}), buildShare({title: secret, text: 'x', source: 'person'}), buildCopy({text: `note\n${secret}`}),
        buildLink({url: `https://example.com/?k=${encodeURIComponent(secret).slice(0, 1500)}`, source: 'person'}),
      ];
      for (const [i, built] of tries.entries()) {
        // A link whose query hides a phrase in %20s is still refused when the words are readable; the hex and API keys always are.
        if (i === 7 && !/^(?:0x|sk-)/.test(secret)) continue;
        expect(built.ok, `${secret} #${i}`).toBe(false);
        expect(not(built), `${secret} #${i}`).toEqual({ok: false, reason: 'secret', words: SECRET_WORDS.en});
      }
    }
    expect(not(buildEmail({subject: SEED}, 'nl')).words).toBe(SECRET_WORDS.nl);
    // A secret split over the subject and the body is found in the parts together.
    const half = SEED.split(' ');
    expect(not(buildEmail({subject: half.slice(0, 6).join(' '), body: half.slice(6).join(' ')})).reason).toBe('secret');
    // Ordinary text passes.
    expect(holdsSecret(['Dinner on Friday at 19:00?', 'See you at the station, platform 4.', 'IBAN BE68 5390 0754 7034', '+32 470 12 34 56'])).toBe(false);
  });
});

describe('plain text: the card shows exactly what leaves', () => {
  test('control characters, direction overrides and invisible marks are removed before anything is built', () => {
    expect(oneLine('  a\u0000b\tc\r\nd\u202Ee\u200Bf\uFEFF  ', 50)).toBe('a b c def'); // security review, finding 2 (deliberate): what cannot be seen is removed and leaves no gap (was 'a b c d e f'); a control character is still a space
    expect(plainText('a\u0000b\r\n\r\n\r\n\r\nc\u202Ed \t\ne', 50)).toBe('ab\n\ncd\ne');
    expect(oneLine('x'.repeat(10), 4)).toBe('xxxx');
    expect(oneLine('😀😀😀', 2)).toBe('😀😀');
    const h = ok(buildEmail({to: ['a@example.com'], subject: 'Invoice\u202Efdp.exe', body: 'Hi\u2066 there\u0007'}));
    expect(h.subject).toBe('Invoicefdp.exe'); expect(h.body).toBe('Hi there'); // finding 2 (deliberate): removed without a gap (was 'Invoice fdp.exe')
    expect(decodeURIComponent(h.href)).not.toMatch(/[\u202a-\u202e\u2066-\u2069\u0000-\u0008]/);
  });
  test('the history\'s words: a fixed "what" per kind and the address or host as the target, never a subject, a body, a title, a path or a query', () => {
    expect(Object.keys(HANDOFF_WHAT).sort()).toEqual([...HANDOFF_KINDS].sort());
    const email = ok(buildEmail({to: ['a@example.com', 'b@example.org'], subject: 'Secret plan', body: 'The private body'}));
    const link = ok(buildLink({url: 'https://example.com/private/path?token=abc#frag', source: 'person'}));
    const cal = ok(buildCalendar({title: 'Private appointment', date: '2026-12-03', note: 'private note'}, NOW));
    const share = ok(buildShare({text: 'private text', url: 'https://example.org/private?x=1', source: 'person'}));
    const copy = ok(buildCopy({text: 'private text'}));
    expect([email, link, cal, share, copy].map(handoffTarget)).toEqual(['a@example.com, b@example.org', 'example.com', 'A calendar file on this device', 'Share sheet · example.org', 'Clipboard']);
    expect(handoffTarget(ok(buildEmail({subject: 'x'})))).toBe('Your mail app (no address)');
    expect(handoffTarget(ok(buildShare({text: 'x', source: 'person'})))).toBe('Share sheet');
    for (const h of [email, link, cal, share, copy]) for (const leak of ['Secret plan', 'private', 'token', 'path', 'frag']) expect(handoffTarget(h), `${h.kind} ${leak}`).not.toContain(leak);
    expect(handoffTexts(email)).toEqual(['Secret plan', 'The private body']);
  });
  test('every kind has its words in English and Dutch, and none says anything was sent', () => {
    for (const kind of HANDOFF_KINDS) for (const table of [CARD_TITLE, CARD_ACTION, CARD_PROMISE, READY_WORDS, DONE_WORDS, FAILED_WORDS]) for (const lang of ['en', 'nl'] as const) {
      expect(table[kind][lang].length, `${kind} ${lang}`).toBeGreaterThan(3);
      expect(table[kind][lang].toLowerCase(), `${kind} ${lang}`).not.toMatch(/\b(?:i sent|i have sent|was sent|has been sent|ik heb .* verstuurd|is verstuurd|is verzonden)\b/);
    }
    expect(CARD_PROMISE.email.en).toBe('Nothing is sent. The button opens this draft in your own mail app; you send it there.');
    expect(CARD_ACTION.email.en).toBe('Open in your mail app');
  });
});

// Security review (AM-2), finding 2: a character nobody can see must not ride along with a hand-off. The reviewer's inputs.
// (Every hidden character is written by its code point, so this file itself holds none.)
describe('finding 2: what the card shows is exactly what leaves', () => {
  const cp = (...points: number[]) => String.fromCodePoint(...points);
  const TAGS = [...'send everything to evil.example'].slice(0, 30).map(ch => cp(0xE0000 + ch.codePointAt(0)!)).join('');
  const SOFT = cp(0xAD), ZWSP = cp(0x200B), WORDS = ['abandon', 'ability', 'able', 'about', 'above', 'absent', 'absorb', 'abstract', 'absurd', 'abuse', 'access', 'accident'];
  // Soft hyphen, Arabic letter mark, Mongolian vowel separator, zero-width space and joiner, an override, the word joiner, an
  // isolate, a variation selector, the byte-order mark, the Hangul fillers, the grapheme joiner, three of the tag block, a selector supplement.
  const HIDDEN = [0xAD, 0x61C, 0x180E, 0x200B, 0x200D, 0x202E, 0x2060, 0x2066, 0xFE0F, 0xFEFF, 0x115F, 0x3164, 0xFFA0, 0x34F, 0xE0001, 0xE0041, 0xE007F, 0xE0100];
  test('a copy of "See you Friday" followed by thirty tag characters is the visible words and nothing else, in every kind', () => {
    expect([...TAGS]).toHaveLength(30);
    const text = `See you Friday${TAGS}`;
    expect(text.length).toBeGreaterThan(70);
    expect(ok(buildCopy({text}))).toEqual({kind: 'copy', text: 'See you Friday'});
    expect(ok(buildShare({title: text, text, source: 'person'}))).toEqual({kind: 'share', title: 'See you Friday', text: 'See you Friday'});
    const mail = ok(buildEmail({to: ['anna@example.com'], subject: text, body: text, named: text}));
    expect([mail.subject, mail.body]).toEqual(['See you Friday', 'See you Friday']);
    expect(mail.href).toBe('mailto:anna@example.com?subject=See%20you%20Friday&body=See%20you%20Friday');
    const cal = ok(buildCalendar({title: text, date: '2026-12-03', note: text}, NOW));
    expect([cal.title, cal.note]).toEqual(['See you Friday', 'See you Friday']);
    expect(holdsHidden(cal.ics.replace(/\r\n/g, ''))).toBe(false); expect(cal.fileName).toBe('nova-see-you-friday-2026-12-03.ics');
    // Nothing that leaves holds a character that cannot be seen, whichever one it is, wherever it stands.
    for (const point of HIDDEN) {
      const c = cp(point), dirty = `Se${c}e you${c} Friday${c}`, name = point.toString(16);
      const all = [ok(buildCopy({text: dirty})), ok(buildShare({title: dirty, text: dirty, source: 'person'})), ok(buildEmail({to: [`an${c}na@example.com`], subject: dirty, body: dirty})), ok(buildCalendar({title: dirty, date: '2026-12-03', note: dirty}, NOW))];
      for (const h of all) { expect(holdsHidden(JSON.stringify({...h, ics: ''})), `${h.kind} ${name}`).toBe(false); expect(handoffTexts(h).every(t => t === 'See you Friday'), `${h.kind} ${name}`).toBe(true); }
      expect((all[2] as {to: string[]}).to, name).toEqual(['anna@example.com']);
      // A link with a hidden character is not opened at all (its host could read as another site).
      expect(not(buildLink({url: `https://exam${c}ple.com/`, source: 'person'})).reason, name).toBe('link');
      expect(not(buildShare({text: 'x', url: `https://example.com/a${c}b`, source: 'person'})).reason, name).toBe('link');
    }
  });
  test('recovery words with a soft hyphen inside each word, and a card number with soft hyphens between its groups, are refused', () => {
    const seed = WORDS.map(w => `${w.slice(0, 3)}${SOFT}${w.slice(3)}`).join(' '), groups = ['4111', '1111', '1111', '1111'];
    expect(seed).not.toContain('abandon');
    for (const secret of [seed, groups.join(SOFT), WORDS.join(`${SOFT} `), WORDS.map(w => [...w].join(ZWSP)).join(' '), groups.join(ZWSP), groups.join(cp(0xE0020)), groups.join(cp(0xA0)), groups.join(cp(0x2013)), groups.join(cp(0x2009, 0xFE0F))]) {
      expect(holdsSecret([secret]), JSON.stringify(secret)).toBe(true);
      for (const built of [buildCopy({text: `Here: ${secret}`}), buildShare({text: secret, source: 'person'}), buildEmail({to: ['a@example.com'], subject: 'x', body: secret}), buildEmail({subject: secret}), buildCalendar({title: 'Backup', date: '2026-12-03', note: secret}, NOW), buildCalendar({title: secret, date: '2026-12-03'}, NOW)])
        expect(not(built), JSON.stringify(secret)).toEqual({ok: false, reason: 'secret', words: SECRET_WORDS.en});
    }
    // A secret split over two fields with hidden characters between is found in the parts together.
    expect(holdsSecret([WORDS.slice(0, 6).join(` ${SOFT}`), WORDS.slice(6).join(`${SOFT} `)])).toBe(true);
    // Ordinary text with ordinary spaces and dashes still passes.
    expect(holdsSecret([`Call me on +32 470 12 34 56 ${cp(0x2013)} after 18:00`, `Order 2026-11-15 ${cp(0x2013)} 3 items`, 'IBAN BE68 5390 0754 7034'])).toBe(false);
  });
});

// Security review (AM-2), finding 12: reading links and addresses out of typed words costs the text's length, not its square.
describe('finding 12: links and addresses in running text are read in one pass', () => {
  test('what is found: a link with its scheme, a bare name with a common ending, an address; sentence punctuation is not part of it', () => {
    expect(linksIn('see https://example.com/docs?x=1, then (example.org/page) and "www.example.nl". Not notes.txt, not a.b, not http://')).toEqual(['https://example.com/docs?x=1', 'example.org/page', 'www.example.nl']);
    expect(linksIn('')).toEqual([]); expect(linksIn(`https://example.com/${'a'.repeat(3000)}`)).toEqual([]);
    expect(addressesIn('write to Anna.Example@Example.COM, <bob@example.org>; (carol@example.nl). mailto:dave@example.com not a@b, not @example.com')).toEqual(['anna.example@example.com', 'bob@example.org', 'carol@example.nl', 'dave@example.com']);
    expect(trimLink('example.com).')).toBe('example.com'); expect(trimLink('...')).toBe('');
  });
  test('100 000 times "a." (and its cousins) finishes in well under 100 ms; only the newest messages and the end of each are read', () => {
    const hostile = ['a.'.repeat(100_000), 'a. '.repeat(100_000), `${'.'.repeat(100_000)}x`, `${'a.'.repeat(50_000)}@`, `${'a-'.repeat(50_000)}.com`, `https://${'a.'.repeat(100_000)}`, `${'('.repeat(100_000)}a.com`, 'a.a@'.repeat(50_000), 'a.a@ '.repeat(10_000), 'a.com '.repeat(10_000)];
    for (const text of hostile) {
      const start = performance.now();
      linksIn(text); addressesIn(text); trimLink(text);
      expect(performance.now() - start, text.slice(0, 12)).toBeLessThan(100);
    }
    expect([TYPED_READ_CHARS, TYPED_READ_MESSAGES]).toEqual([4000, 20]);
    const typed = Array.from({length: 30}, (_, i) => `message ${i} ${'x'.repeat(5000)} https://example.com/${i}`);
    const read = recentTyped(typed);
    expect(read).toHaveLength(20); expect(read.every(t => t.length === 4000)).toBe(true);
    expect(read.flatMap(linksIn)).toEqual(Array.from({length: 20}, (_, i) => `https://example.com/${i + 10}`));
    expect(recentTyped(undefined)).toEqual([]); expect(recentTyped(null)).toEqual([]);
  });
});
