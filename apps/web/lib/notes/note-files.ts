import {buildStoredZip, type ZipEntry} from '../export/zip';
import {parseBlocks, plainText, type HighlightColour, type NoteBlock, type NoteInline} from '../ai/safe-render';
import {noteName, notePhotoIdsOf, type Note} from './schema';
import {noteTags} from './tags';
import {placedPhotoIds} from './note-photos';
import {safeFileBase} from './markdown';

/**
 * Session AV lane 2 (r4-notes; LEDGER #319, Bear's exports, and #320's shared writers): one note saved as an HTML page
 * (its photos inside), as plain text, or as a Word file — Office Open XML (WordprocessingML) written by hand into a ZIP
 * through the repository's own stored-ZIP writer (lib/export/zip.ts), no package. The same XHTML and Word writers make
 * the journal's e-book and Word file (lib/journal/ebook.ts). Every word is escaped; links are https only (the safe
 * parser's rule); a photo is only ever one of the person's own, passed in as bytes. Pure: the caller reads the photos.
 */

/* ---- Escaping ------------------------------------------------------------------------------------------------------ */
/** Text safe inside XML and XHTML: no control characters XML refuses, no lone surrogates, the five specials escaped. */
export function xml(text: string): string {
  return text.replace(/[\0-\x08\x0b\x0c\x0e-\x1f￾￿]/g, '').replace(/[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/g, '�')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}
const words = (nodes: readonly NoteInline[]) => plainText([{type: 'paragraph', children: [...nodes]}]);
const SHOWCASE = /\n*\(SHOWCASE DATA\)\s*$/;
/** A note's words as the reading view parses them (the Showcase label said in words). */
export const noteBlocks = (note: Pick<Note, 'body'>): NoteBlock[] => parseBlocks(note.body.replace(SHOWCASE, '\n\n(Showcase example)'), {notes: true});

/* ---- XHTML (the HTML page and the e-book's chapters) -------------------------------------------------------------- */
export type PhotoSrc = (id: string) => {src: string; alt: string} | null;
function inlineHtml(nodes: readonly NoteInline[]): string {
  return nodes.map(n => {
    switch (n.type) {
      case 'text': return xml(n.text);
      case 'code': return `<code>${xml(n.text)}</code>`;
      case 'strong': return `<strong>${inlineHtml(n.children)}</strong>`;
      case 'em': return `<em>${inlineHtml(n.children)}</em>`;
      case 'link': return `<a href="${xml(n.href)}">${inlineHtml(n.children)}</a>`;
      case 'mark': return `<mark class="hl-${n.colour}">${inlineHtml(n.children)}</mark>`;
    }
  }).join('');
}
/** The blocks as XHTML (valid as HTML too): headings start at `top` (h2 under a page's h1). */
export function blocksHtml(blocks: readonly NoteBlock[], photo: PhotoSrc, top = 2): string {
  const h = (level: number) => `h${Math.min(6, top + level - 1)}`;
  return blocks.map(b => {
    switch (b.type) {
      case 'paragraph': return `<p>${inlineHtml(b.children)}</p>`;
      case 'heading': return `<${h(b.level)}>${inlineHtml(b.children)}</${h(b.level)}>`;
      case 'quote': return `<blockquote><p>${inlineHtml(b.children)}</p></blockquote>`;
      case 'code': return `<pre><code>${xml(b.text)}</code></pre>`;
      case 'list': { const tag = b.ordered ? 'ol' : 'ul'; return `<${tag}>${b.items.map((it, i) => { const t = b.ticks?.[i]; return `<li>${t === true ? '☑ ' : t === false ? '☐ ' : ''}${inlineHtml(it)}</li>`; }).join('')}</${tag}>`; }
      case 'table': return `<table><thead><tr>${b.head.map(c => `<th>${inlineHtml(c)}</th>`).join('')}</tr></thead><tbody>${b.rows.map(r => `<tr>${r.map(c => `<td>${inlineHtml(c)}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
      case 'photo': { const p = photo(b.id); return p ? `<figure><img src="${xml(p.src)}" alt="${xml(b.alt && b.alt !== 'photo' ? b.alt : p.alt)}"/></figure>` : ''; }
      case 'callout': return `<aside class="callout callout-${b.kind}"><p><strong>${xml(b.word)}</strong>${b.title?.length ? `: ${inlineHtml(b.title)}` : ''}</p>${b.paragraphs.map(p => `<p>${inlineHtml(p)}</p>`).join('')}</aside>`;
    }
  }).filter(Boolean).join('\n');
}
export const PAGE_CSS = 'body{font:17px/1.6 system-ui,-apple-system,"Segoe UI",sans-serif;max-width:42rem;margin:2rem auto;padding:0 1rem;color:#1d2133;background:#fff}h1{line-height:1.25}img{max-width:100%;height:auto;border-radius:8px}figure{margin:1rem 0}blockquote{margin:1rem 0;padding:.2rem 1rem;border-left:4px solid #8a8fb0;color:#3b3f56}pre{white-space:pre-wrap;background:#f3f4f8;padding:.8rem;border-radius:8px}table{border-collapse:collapse}th,td{border:1px solid #c5c8d8;padding:.3rem .6rem;text-align:left}mark{background:#fbe7a6}mark.hl-green{background:#cdeccf}mark.hl-blue{background:#cfe3f8}mark.hl-purple{background:#e3d6f6}mark.hl-red{background:#f6d2d2}mark.hl-orange{background:#f8dcc0}.callout{margin:1rem 0;padding:.4rem 1rem;border-left:4px solid #5b7bd5;background:#f2f5fc}.callout-tip{border-color:#3e9a5a}.callout-important{border-color:#7b5bd5}.callout-warning{border-color:#b98a1e}.callout-caution{border-color:#c0504d}.meta{color:#555a73;font-size:15px}';

/* ---- One note: HTML and plain text ------------------------------------------------------------------------------- */
export type NotePhotoBytes = {data: Uint8Array; type: string};
const base64 = (bytes: Uint8Array) => { let s = ''; for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000)); return btoa(s); };
const day = (iso: string) => iso.slice(0, 10);
const metaLine = (note: Note) => [note.kind === 'daily' && note.day ? note.day : `Made ${day(note.createdAt)}`, ...(note.updatedAt ? [`changed ${day(note.updatedAt)}`] : []), ...(noteTags(note).length ? [noteTags(note).map(t => `#${t}`).join(' ')] : [])].join(' · ');
export const noteTitle = (note: Note) => note.kind === 'daily' && note.day ? note.day : noteName(note);
/** The note as one HTML page: its title, day and tags, its words, and its photos inside (as data). */
export function noteHtml(note: Note, photos: ReadonlyMap<string, NotePhotoBytes>): string {
  const src = (id: string) => { const p = photos.get(id); return p ? {src: `data:${p.type};base64,${base64(p.data)}`, alt: `A photo in “${noteTitle(note)}”`} : null; };
  const placed = new Set(placedPhotoIds(note.body)), under = notePhotoIdsOf(note).filter(id => !placed.has(id)).map(src).filter(Boolean) as {src: string; alt: string}[];
  return `<!DOCTYPE html>\n<html lang="en"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1"/><title>${xml(noteTitle(note))}</title><style>${PAGE_CSS}</style></head><body><article>\n<h1>${xml(noteTitle(note))}</h1>\n<p class="meta">${xml(metaLine(note))}</p>\n${blocksHtml(noteBlocks(note), src)}\n${under.map(p => `<figure><img src="${xml(p.src)}" alt="${xml(p.alt)}"/></figure>`).join('\n')}\n</article></body></html>\n`;
}
/** The note as plain text: its title, day and tags, then its words as they read (marks gone, tick boxes ☐ and ☑). */
export function noteText(note: Note): string {
  const body = noteBlocks(note).map(b => b.type === 'list' ? b.items.map((it, i) => { const t = b.ticks?.[i]; return `${b.ordered ? `${i + 1}.` : '•'} ${t === true ? '☑ ' : t === false ? '☐ ' : ''}${words(it)}`; }).join('\n') : plainText([b])).join('\n\n');
  return `${noteTitle(note)}\n${metaLine(note)}\n\n${body}\n`.replace(/\r?\n/g, '\r\n');
}
export const noteFileName = (note: Note, ext: string) => `${safeFileBase(noteTitle(note))}.${ext}`;

/* ---- Word (.docx) ---------------------------------------------------------------------------------------------------- */
export type DocImage = {data: Uint8Array; type: 'image/jpeg' | 'image/png'; width: number; height: number; alt: string};
export type DocRun = {text: string; bold?: boolean; italic?: boolean; code?: boolean; highlight?: HighlightColour; href?: string};
export type DocBlock = {kind: 'title' | 'subtitle'; text: string} | {kind: 'heading'; level: 1 | 2 | 3; runs: DocRun[]} | {kind: 'para' | 'quote'; runs: DocRun[]}
  | {kind: 'list'; ordered: boolean; items: DocRun[][]} | {kind: 'code'; text: string} | {kind: 'image'; image: DocImage} | {kind: 'table'; rows: DocRun[][][]} | {kind: 'pagebreak'};
const runsOf = (nodes: readonly NoteInline[], style: Omit<DocRun, 'text'> = {}): DocRun[] => nodes.flatMap(n => {
  switch (n.type) {
    case 'text': return n.text ? [{...style, text: n.text}] : [];
    case 'code': return [{...style, code: true, text: n.text}];
    case 'strong': return runsOf(n.children, {...style, bold: true});
    case 'em': return runsOf(n.children, {...style, italic: true});
    case 'link': return runsOf(n.children, {...style, href: n.href});
    case 'mark': return runsOf(n.children, {...style, highlight: n.colour});
  }
});
/** Parsed blocks as Word blocks; a photo line becomes its image when given (`image(id)`), else it is left out. */
export function docBlocks(blocks: readonly NoteBlock[], image: (id: string) => DocImage | null, top: 1 | 2 | 3 = 1): DocBlock[] {
  return blocks.flatMap((b): DocBlock[] => {
    switch (b.type) {
      case 'paragraph': return [{kind: 'para', runs: runsOf(b.children)}];
      case 'heading': return [{kind: 'heading', level: Math.min(3, b.level + top - 1) as 1 | 2 | 3, runs: runsOf(b.children)}];
      case 'quote': return [{kind: 'quote', runs: runsOf(b.children)}];
      case 'code': return [{kind: 'code', text: b.text}];
      case 'list': return [{kind: 'list', ordered: b.ordered, items: b.items.map((it, i) => { const t = b.ticks?.[i]; return [...(t === true ? [{text: '☑ '}] : t === false ? [{text: '☐ '}] : []), ...runsOf(it)]; })}];
      case 'table': return [{kind: 'table', rows: [b.head, ...b.rows].map(r => r.map(c => runsOf(c, {})))}];
      case 'photo': { const img = image(b.id); return img ? [{kind: 'image', image: img}] : []; }
      case 'callout': return [{kind: 'quote', runs: [{text: b.word, bold: true}, ...(b.title?.length ? [{text: ': '}, ...runsOf(b.title)] : [])]}, ...b.paragraphs.map(p => ({kind: 'quote' as const, runs: runsOf(p)}))];
    }
  });
}
const W = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main', R = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';
const HL: Record<HighlightColour, string> = {yellow: 'yellow', green: 'green', blue: 'cyan', purple: 'magenta', red: 'red', orange: 'darkYellow'};
const MAX_EMU = 5_486_400; // six inches
/** A Word document from blocks: title, headings, paragraphs, lists (bullets, numbers), quotes, code, tables, photos and links. */
export function buildDocx(doc: {title: string; blocks: readonly DocBlock[]; now?: Date; language?: string}): Uint8Array {
  const rels: string[] = [], media: ZipEntry[] = [], now = doc.now ?? new Date(), numbers: number[] = [];
  let rel = 10, pic = 1;
  const link = (href: string) => { const id = `rId${rel++}`; rels.push(`<Relationship Id="${id}" Type="${R}/hyperlink" Target="${xml(href)}" TargetMode="External"/>`); return id; };
  const t = (text: string) => text.split('\n').map((line, i) => `${i ? '<w:br/>' : ''}<w:t xml:space="preserve">${xml(line)}</w:t>`).join('');
  const run = (r: DocRun) => {
    const pr = [r.bold ? '<w:b/>' : '', r.italic ? '<w:i/>' : '', r.code ? '<w:rStyle w:val="CodeChar"/>' : r.href ? '<w:rStyle w:val="Hyperlink"/>' : '', r.highlight ? `<w:highlight w:val="${HL[r.highlight]}"/>` : ''].join('');
    const body = `<w:r>${pr ? `<w:rPr>${pr}</w:rPr>` : ''}${t(r.text)}</w:r>`;
    return r.href ? `<w:hyperlink r:id="${link(r.href)}">${body}</w:hyperlink>` : body;
  };
  const para = (runs: readonly DocRun[], style?: string, extra = '') => `<w:p>${style || extra ? `<w:pPr>${style ? `<w:pStyle w:val="${style}"/>` : ''}${extra}</w:pPr>` : ''}${runs.map(run).join('')}</w:p>`;
  const image = (img: DocImage) => {
    const id = `rId${rel++}`, n = pic++, ext = img.type === 'image/png' ? 'png' : 'jpeg', file = `image${n}.${ext}`;
    rels.push(`<Relationship Id="${id}" Type="${R}/image" Target="media/${file}"/>`); media.push({name: `word/media/${file}`, data: img.data, modified: now});
    const w = Math.max(1, img.width), h = Math.max(1, img.height), cx = Math.min(MAX_EMU, w * 9525), cy = Math.round(cx * h / w);
    return `<w:p><w:r><w:drawing><wp:inline distT="0" distB="0" distL="0" distR="0"><wp:extent cx="${cx}" cy="${cy}"/><wp:docPr id="${n}" name="Photo ${n}" descr="${xml(img.alt)}"/><wp:cNvGraphicFramePr><a:graphicFrameLocks xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" noChangeAspect="1"/></wp:cNvGraphicFramePr><a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:nvPicPr><pic:cNvPr id="${n}" name="${file}" descr="${xml(img.alt)}"/><pic:cNvPicPr/></pic:nvPicPr><pic:blipFill><a:blip r:embed="${id}"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill><pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${cx}" cy="${cy}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing></w:r></w:p>`;
  };
  const body = doc.blocks.map(b => {
    switch (b.kind) {
      case 'title': return para([{text: b.text}], 'Title');
      case 'subtitle': return para([{text: b.text}], 'Subtitle');
      case 'heading': return para(b.runs, `Heading${b.level}`);
      case 'para': return para(b.runs);
      case 'quote': return para(b.runs, 'Quote');
      case 'code': return para([{text: b.text}], 'Code');
      case 'pagebreak': return '<w:p><w:r><w:br w:type="page"/></w:r></w:p>';
      case 'image': return image(b.image);
      case 'list': { const num = b.ordered ? (numbers.push(numbers.length + 3), numbers.at(-1)!) : 1; return b.items.map(it => para(it, 'ListParagraph', `<w:numPr><w:ilvl w:val="0"/><w:numId w:val="${num}"/></w:numPr>`)).join(''); }
      case 'table': { const cols = Math.max(1, ...b.rows.map(r => r.length)), w = Math.floor(9000 / cols);
        return `<w:tbl><w:tblPr><w:tblW w:w="0" w:type="auto"/><w:tblBorders>${['top', 'left', 'bottom', 'right', 'insideH', 'insideV'].map(s => `<w:${s} w:val="single" w:sz="4" w:space="0" w:color="A0A4B8"/>`).join('')}</w:tblBorders></w:tblPr><w:tblGrid>${Array.from({length: cols}, () => `<w:gridCol w:w="${w}"/>`).join('')}</w:tblGrid>${b.rows.map((r, i) => `<w:tr>${Array.from({length: cols}, (_, c) => `<w:tc><w:tcPr><w:tcW w:w="${w}" w:type="dxa"/></w:tcPr>${para(i === 0 ? (r[c] ?? []).map(x => ({...x, bold: true})) : r[c] ?? [])}</w:tc>`).join('')}</w:tr>`).join('')}</w:tbl>${para([])}`; }
    }
  }).join('');
  const lang = xml(doc.language ?? 'en-US');
  const document = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<w:document xmlns:w="${W}" xmlns:r="${R}" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing"><w:body>${body}<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440" w:header="708" w:footer="708" w:gutter="0"/></w:sectPr></w:body></w:document>`;
  const style = (id: string, name: string, pPr: string, rPr: string, type = 'paragraph') => `<w:style w:type="${type}" w:styleId="${id}"><w:name w:val="${name}"/>${type === 'paragraph' && id !== 'Normal' ? '<w:basedOn w:val="Normal"/><w:next w:val="Normal"/>' : ''}<w:qFormat/>${pPr ? `<w:pPr>${pPr}</w:pPr>` : ''}${rPr ? `<w:rPr>${rPr}</w:rPr>` : ''}</w:style>`;
  const styles = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<w:styles xmlns:w="${W}"><w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri" w:cs="Calibri" w:eastAsia="Calibri"/><w:sz w:val="24"/><w:lang w:val="${lang}"/></w:rPr></w:rPrDefault><w:pPrDefault><w:pPr><w:spacing w:after="160" w:line="300" w:lineRule="auto"/></w:pPr></w:pPrDefault></w:docDefaults>${[
    style('Normal', 'Normal', '', ''),
    style('Title', 'Title', '<w:spacing w:after="120"/>', '<w:b/><w:sz w:val="48"/>'),
    style('Subtitle', 'Subtitle', '', '<w:color w:val="555A73"/><w:sz w:val="22"/>'),
    style('Heading1', 'heading 1', '<w:keepNext/><w:spacing w:before="360" w:after="120"/><w:outlineLvl w:val="0"/>', '<w:b/><w:sz w:val="36"/>'),
    style('Heading2', 'heading 2', '<w:keepNext/><w:spacing w:before="240" w:after="80"/><w:outlineLvl w:val="1"/>', '<w:b/><w:sz w:val="30"/>'),
    style('Heading3', 'heading 3', '<w:keepNext/><w:spacing w:before="200" w:after="60"/><w:outlineLvl w:val="2"/>', '<w:b/><w:sz w:val="26"/>'),
    style('Quote', 'Quote', '<w:ind w:left="567"/><w:pBdr><w:left w:val="single" w:sz="18" w:space="8" w:color="8A8FB0"/></w:pBdr>', '<w:color w:val="3B3F56"/>'),
    style('Code', 'Code', '<w:shd w:val="clear" w:color="auto" w:fill="F3F4F8"/><w:spacing w:after="160" w:line="240" w:lineRule="auto"/>', '<w:rFonts w:ascii="Consolas" w:hAnsi="Consolas" w:cs="Consolas"/><w:sz w:val="20"/>'),
    style('ListParagraph', 'List Paragraph', '<w:spacing w:after="60"/><w:ind w:left="720"/>', ''),
    style('CodeChar', 'Code Char', '', '<w:rFonts w:ascii="Consolas" w:hAnsi="Consolas" w:cs="Consolas"/><w:shd w:val="clear" w:color="auto" w:fill="F3F4F8"/>', 'character'),
    style('Hyperlink', 'Hyperlink', '', '<w:color w:val="1F5BB8"/><w:u w:val="single"/>', 'character'),
  ].join('')}</w:styles>`;
  const level = (fmt: string, text: string) => `<w:lvl w:ilvl="0"><w:start w:val="1"/><w:numFmt w:val="${fmt}"/><w:lvlText w:val="${text}"/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="720" w:hanging="360"/></w:pPr></w:lvl>`;
  const numbering = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<w:numbering xmlns:w="${W}"><w:abstractNum w:abstractNumId="0">${level('bullet', '•')}</w:abstractNum><w:abstractNum w:abstractNumId="1">${level('decimal', '%1.')}</w:abstractNum><w:num w:numId="1"><w:abstractNumId w:val="0"/></w:num><w:num w:numId="2"><w:abstractNumId w:val="1"/></w:num>${numbers.map(n => `<w:num w:numId="${n}"><w:abstractNumId w:val="1"/><w:lvlOverride w:ilvl="0"><w:startOverride w:val="1"/></w:lvlOverride></w:num>`).join('')}</w:numbering>`;
  const types = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Default Extension="jpeg" ContentType="image/jpeg"/><Default Extension="png" ContentType="image/png"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/><Override PartName="/word/numbering.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.numbering+xml"/><Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/></Types>`;
  const rootRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="${R}/officeDocument" Target="word/document.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/></Relationships>`;
  const docRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="${R}/styles" Target="styles.xml"/><Relationship Id="rId2" Type="${R}/numbering" Target="numbering.xml"/>${rels.join('')}</Relationships>`;
  const stamp = now.toISOString().replace(/\.\d+Z$/, 'Z');
  const core = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"><dc:title>${xml(doc.title)}</dc:title><dc:creator>ZIGoals</dc:creator><dcterms:created xsi:type="dcterms:W3CDTF">${stamp}</dcterms:created><dcterms:modified xsi:type="dcterms:W3CDTF">${stamp}</dcterms:modified></cp:coreProperties>`;
  return buildStoredZip([
    {name: '[Content_Types].xml', data: types, modified: now}, {name: '_rels/.rels', data: rootRels, modified: now},
    {name: 'word/document.xml', data: document, modified: now}, {name: 'word/styles.xml', data: styles, modified: now}, {name: 'word/numbering.xml', data: numbering, modified: now},
    {name: 'word/_rels/document.xml.rels', data: docRels, modified: now}, {name: 'docProps/core.xml', data: core, modified: now}, ...media,
  ]);
}
/** One note as a Word file: its title, day and tags, its words, and its photos (as JPEG or PNG, passed in). */
export function noteDocx(note: Note, images: ReadonlyMap<string, DocImage>, now = new Date()): Uint8Array {
  const placed = new Set(placedPhotoIds(note.body)), under = notePhotoIdsOf(note).filter(id => !placed.has(id)).flatMap(id => images.get(id) ? [{kind: 'image' as const, image: images.get(id)!}] : []);
  return buildDocx({title: noteTitle(note), now, blocks: [{kind: 'title', text: noteTitle(note)}, {kind: 'subtitle', text: metaLine(note)}, ...docBlocks(noteBlocks(note), id => images.get(id) ?? null), ...under]});
}
export const DOCX_TYPE = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
