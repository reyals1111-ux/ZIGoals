/**
 * Session AJ (item 27): a small, strict XML reader for GPX and TCX files. The app's Content Security Policy enforces
 * Trusted Types with only a script-URL policy, so the browser's DOMParser refuses plain strings, and widening the policy
 * would weaken it everywhere. This reader builds a plain element tree and offers exactly the DOM calls the importer uses
 * (documentElement, children, localName, getAttribute, textContent, getElementsByTagName(NS)). It knows elements,
 * attributes, text, CDATA, comments, processing instructions and the five standard entities plus character references;
 * a document type is skipped (entity declarations are refused before this runs), and anything else is refused.
 */
export class XmlReadError extends Error {}
export class MiniElement {
  readonly children: MiniElement[] = [];
  private readonly parts: (string | MiniElement)[] = [];
  constructor(readonly nodeName: string, private readonly attrs: Map<string, string>) {}
  get localName(): string { const i = this.nodeName.indexOf(':'); return i < 0 ? this.nodeName : this.nodeName.slice(i + 1); }
  get tagName(): string { return this.nodeName; }
  getAttribute(name: string): string | null {
    if (this.attrs.has(name)) return this.attrs.get(name)!;
    for (const [k, v] of this.attrs) if (k.slice(k.indexOf(':') + 1) === name && !k.startsWith('xmlns')) return v;
    return null;
  }
  get textContent(): string { return this.parts.map(p => typeof p === 'string' ? p : p.textContent).join(''); }
  getElementsByTagNameNS(_ns: string, name: string): MiniElement[] { const out: MiniElement[] = []; const walk = (e: MiniElement) => { for (const c of e.children) { if (name === '*' || c.localName === name) out.push(c); walk(c); } }; walk(this); return out; }
  getElementsByTagName(name: string): MiniElement[] { const out: MiniElement[] = []; const walk = (e: MiniElement) => { for (const c of e.children) { if (name === '*' || c.nodeName === name) out.push(c); walk(c); } }; walk(this); return out; }
  append(part: string | MiniElement) { this.parts.push(part); if (typeof part !== 'string') this.children.push(part); }
}
export class MiniDocument {
  constructor(readonly documentElement: MiniElement) {}
  getElementsByTagName(name: string): MiniElement[] { return name === 'parsererror' ? [] : [...(this.documentElement.nodeName === name ? [this.documentElement] : []), ...this.documentElement.getElementsByTagName(name)]; }
  getElementsByTagNameNS(ns: string, name: string): MiniElement[] { return [...(this.documentElement.localName === name ? [this.documentElement] : []), ...this.documentElement.getElementsByTagNameNS(ns, name)]; }
}

const NAME = /^[A-Za-z_][\w.:-]*$/;
const ENTITIES: Record<string, string> = {lt: '<', gt: '>', amp: '&', quot: '"', apos: "'"};
function decode(text: string): string {
  return text.replace(/&([^;\s&]{1,12});/g, (_, e: string) => {
    if (e in ENTITIES) return ENTITIES[e]!;
    const code = e.startsWith('#x') ? parseInt(e.slice(2), 16) : e.startsWith('#') ? parseInt(e.slice(1), 10) : NaN;
    if (!Number.isInteger(code) || code < 1 || code > 0x10ffff || (code >= 0xd800 && code <= 0xdfff)) throw new XmlReadError(`Unknown entity &${e};`);
    return String.fromCodePoint(code);
  });
}
function attributes(source: string): Map<string, string> {
  const map = new Map<string, string>(), re = /\s*([^\s=/>]+)\s*=\s*("([^"]*)"|'([^']*)')/y;
  let at = 0;
  while (at < source.length) {
    if (/^\s*$/.test(source.slice(at))) break;
    re.lastIndex = at; const m = re.exec(source);
    if (!m || !NAME.test(m[1]!) || map.has(m[1]!) || /</.test(m[3] ?? m[4] ?? '')) throw new XmlReadError('A tag could not be read.');
    map.set(m[1]!, decode(m[3] ?? m[4] ?? '')); at = re.lastIndex;
  }
  return map;
}
/** Parses the text into a tree, or throws XmlReadError. */
export function parseXml(text: string): MiniDocument {
  let i = 0, root: MiniElement | null = null;
  const stack: MiniElement[] = [];
  const top = () => stack[stack.length - 1];
  while (i < text.length) {
    const lt = text.indexOf('<', i);
    const chunk = text.slice(i, lt < 0 ? text.length : lt);
    if (chunk) { if (top()) top()!.append(decode(chunk)); else if (chunk.trim() && chunk.trim() !== '﻿') throw new XmlReadError('Text outside the document.'); }
    if (lt < 0) break;
    if (text.startsWith('<?', lt)) { const end = text.indexOf('?>', lt); if (end < 0) throw new XmlReadError('Unclosed instruction.'); i = end + 2; continue; }
    if (text.startsWith('<!--', lt)) { const end = text.indexOf('-->', lt); if (end < 0) throw new XmlReadError('Unclosed comment.'); i = end + 3; continue; }
    if (text.startsWith('<![CDATA[', lt)) { const end = text.indexOf(']]>', lt); if (end < 0 || !top()) throw new XmlReadError('Unclosed CDATA.'); top()!.append(text.slice(lt + 9, end)); i = end + 3; continue; }
    if (text.startsWith('<!DOCTYPE', lt)) { if (root || stack.length) throw new XmlReadError('A late document type.'); const end = text.indexOf('>', lt); if (end < 0 || text.slice(lt, end).includes('[')) throw new XmlReadError('A document type ZIGoals does not read.'); i = end + 1; continue; }
    const end = text.indexOf('>', lt);
    if (end < 0) throw new XmlReadError('Unclosed tag.');
    const body = text.slice(lt + 1, end);
    if (body.startsWith('/')) {
      const name = body.slice(1).trim(), open = stack.pop();
      if (!open || open.nodeName !== name) throw new XmlReadError('Tags do not match.');
      i = end + 1; continue;
    }
    const selfClosing = body.endsWith('/'), inner = selfClosing ? body.slice(0, -1) : body;
    const m = /^([^\s/>]+)([\s\S]*)$/.exec(inner);
    if (!m || !NAME.test(m[1]!)) throw new XmlReadError('A tag could not be read.');
    const el = new MiniElement(m[1]!, attributes(m[2]!));
    if (top()) top()!.append(el); else if (root) throw new XmlReadError('Two documents in one file.'); else root = el;
    if (!selfClosing) stack.push(el);
    i = end + 1;
  }
  if (!root || stack.length) throw new XmlReadError(root ? 'The document is not closed.' : 'No document.');
  return new MiniDocument(root);
}
/** The importer's parser: `parseFromString` as DOMParser has it, typed as a Document for the importer's few calls. */
export const miniXmlParser = {parseFromString(text: string, _type: 'application/xml'): Document { void _type; return parseXml(text) as unknown as Document; }};
