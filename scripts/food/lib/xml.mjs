// Session AK Part 1c: the few XML rules the generic-food build needs, written for the files it reads (CIQUAL's XML tables,
// an XLSX workbook's parts). Not a general XML parser: no DTD, no entity declarations, no external anything. A document
// that declares a DTD or uses an entity other than the five predefined ones and numeric character references is refused,
// so nothing can expand. Every text is length-checked by the caller before it reaches these functions.

/** Refuses a DTD, an entity declaration or a processing instruction other than the XML declaration. @param {string} text @param {string} name */
export function assertPlainXml(text, name) {
  if (/<!DOCTYPE|<!ENTITY|<!\[CDATA\[/i.test(text)) throw Error(`${name}: a DTD, entity declaration or CDATA section is not accepted.`);
  const pis = text.match(/<\?[^?]*\?>/g) ?? [];
  if (pis.some((pi, i) => i > 0 || !/^<\?xml\s/.test(pi))) throw Error(`${name}: only the XML declaration is accepted as a processing instruction.`);
}
const NAMED = {amp: '&', lt: '<', gt: '>', quot: '"', apos: "'"};
/** Decodes the five predefined entities and numeric character references; anything else is refused. @param {string} s */
export function decodeXml(s) {
  if (/&(?![^;\s&]{1,10};)/.test(s)) throw Error('A bare & in XML text.');
  return s.replace(/&([^;\s&]{1,10});/g, (_, ref) => {
    if (Object.hasOwn(NAMED, ref)) return NAMED[ref];
    const code = /^#x([0-9a-f]{1,6})$/i.test(ref) ? parseInt(ref.slice(2), 16) : /^#(\d{1,7})$/.test(ref) ? Number(ref.slice(1)) : NaN;
    if (!Number.isInteger(code) || code < 1 || code > 0x10FFFF || (code >= 0xD800 && code <= 0xDFFF)) throw Error(`Unsupported XML entity &${ref};`);
    return String.fromCodePoint(code);
  });
}
/** The value of attribute `name` in a start tag's attribute text, decoded, or undefined. @param {string} attrs @param {string} name */
export function attr(attrs, name) {
  const m = new RegExp(`(?:^|\\s)${name.replace(':', '\\:')}\\s*=\\s*(?:"([^"]*)"|'([^']*)')`).exec(attrs);
  return m ? decodeXml(m[1] ?? m[2] ?? '') : undefined;
}
/** Strips a UTF-8 byte order mark. @param {string} s */
export const noBom = s => s.charCodeAt(0) === 0xFEFF ? s.slice(1) : s;
/** Strict UTF-8 decoding: invalid bytes throw. @param {Uint8Array} bytes */
export const utf8 = bytes => noBom(new TextDecoder('utf-8', {fatal: true}).decode(bytes));
