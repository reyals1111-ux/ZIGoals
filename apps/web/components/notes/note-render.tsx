'use client';
import Link from 'next/link';
import {Fragment, useEffect, useId, useMemo, useState, type ReactNode} from 'react';
import {parseBlocks, plainText, type NoteBlock, type NoteInline} from '../../lib/ai/safe-render';
import {parseLinks, resolveLink, type LinkIndex} from '../../lib/notes/links';
import {splitTags} from '../../lib/notes/tags';
import {getNotePhoto} from '../../lib/notes/photos';
import {foldable, foldsHiding, hiddenBlocks, sectionSize} from '../../lib/notes/fold';
import {photoScope} from '../../lib/health-aa/photos';

/**
 * Session AK (B3): a note on screen — React elements from the same safe Markdown parser ZIGi's replies use (headings,
 * lists, quotes, code, bold, italics, https links; never HTML, never a script), with every [[link]] made a link to the
 * note, goal or habit it names. A link that reaches nothing yet is a button that makes that note (`onCreate`).
 * Session AV lane 2 (r3-notes; LEDGER #264, #267): the parser's notes-only marks are on here (never in ZIGi's replies):
 * ==highlights== in six named colours, and "- [ ]" tick boxes that tick in the reading view (`onTick`, with the line).
 */
const KIND_WORD = {note: 'note', goal: 'goal', habit: 'habit'} as const;
type Ctx = {index: LinkIndex; onCreate?: (name: string) => void; /** Session AV lane 2 (r4-notes; LEDGER #306): a #tag focuses Notes on it. */ onTag?: (tag: string) => void; /** LEDGER #307: the photo ids this note keeps. */ photos?: readonly string[]; /** LEDGER #313: the section folds of the reading view. */ fold?: Folds};
type Folds = {folded: ReadonlySet<number>; size: (i: number) => number; toggle: (i: number) => void};
const NO_FOLDS: ReadonlySet<number> = new Set();
/** Session AV lane 2 (r4-notes; LEDGER #307): one of the note's own photos, read from this device's photo store. */
function NotePhotoFigure({id, alt, kept}: {id: string; alt: string; kept: boolean}) {
  const [url, setUrl] = useState<string | null | undefined>(kept ? undefined : null);
  useEffect(() => {
    if (!kept) return;
    let made: string | null = null, live = true;
    void getNotePhoto(photoScope(), id).then(p => { if (!live) return; if (p) { made = URL.createObjectURL(p.blob); setUrl(made); } else setUrl(null); }, () => { if (live) setUrl(null); });
    return () => { live = false; if (made) URL.revokeObjectURL(made); };
  }, [id, kept]);
  if (!kept) return <p className="fine note-photo-missing">A photo line for a photo this note does not keep ({alt || 'photo'}).</p>;
  if (url === undefined) return <p className="fine note-photo-missing">Opening the photo…</p>;
  if (url === null) return <p className="fine note-photo-missing">This photo is not in this browser (photos stay on the device where they were added).</p>;
  // eslint-disable-next-line @next/next/no-img-element -- a local blob of the person's own photo: next/image has nothing to optimise
  return <figure className="note-photo-figure"><img className="note-photo" src={url} alt={alt && alt !== 'photo' ? alt : 'Your photo in this note'}/></figure>;
}
/** Session AV lane 2 (r4-notes; LEDGER #306): the #tags in plain words, each a button that focuses Notes on it. */
function tagged(text: string, at: number, onTag?: (tag: string) => void): ReactNode[] {
  return splitTags(text).map((p, i) => typeof p === 'string' ? p : onTag
    ? <button key={`t${at}-${i}`} type="button" className="note-tag" aria-label={`#${p.tag}: show the notes with this tag`} onClick={() => onTag(p.tag)}>#{p.tag}</button>
    : <span key={`t${at}-${i}`} className="note-tag">#{p.tag}</span>);
}
function linkify(text: string, {index, onCreate, onTag}: Ctx): ReactNode[] {
  const out: ReactNode[] = [];
  let at = 0;
  for (const l of parseLinks(text)) {
    if (l.start > at) out.push(...tagged(text.slice(at, l.start), at, onTag));
    const shown = l.alias ?? l.target, t = l.embed && /\.(?:png|jpe?g|webp|gif|avif|heic)$/i.test(l.target) ? null : resolveLink(index, l.target);
    if (l.embed && !t) out.push(<span key={l.start} className="note-embed">{shown}</span>);
    else if (t) out.push(<Link key={l.start} className={`note-link is-${t.kind}`} href={t.href} title={`Open the ${KIND_WORD[t.kind]} “${t.name}”`}>{shown}</Link>);
    else out.push(onCreate ? <button key={l.start} type="button" className="note-link is-open" onClick={() => onCreate(l.target)} aria-label={`${shown}: no note yet. Create it`}>{shown}</button> : <span key={l.start} className="note-link is-open">{shown}</span>);
    at = l.end;
  }
  if (at < text.length) out.push(...tagged(text.slice(at), at, onTag));
  return out;
}
export const COLOUR_WORDS = {yellow: 'Yellow', green: 'Green', blue: 'Blue', purple: 'Purple', red: 'Red', orange: 'Orange'} as const;
function inline(nodes: readonly NoteInline[], ctx: Ctx): ReactNode[] {
  return nodes.map((node, i) => {
    switch (node.type) {
      case 'text': return <Fragment key={i}>{linkify(node.text, ctx)}</Fragment>;
      case 'code': return <code key={i}>{node.text}</code>;
      case 'strong': return <strong key={i}>{inline(node.children, ctx)}</strong>;
      case 'em': return <em key={i}>{inline(node.children, ctx)}</em>;
      case 'link': return <a key={i} href={node.href} target="_blank" rel="noopener noreferrer">{inline(node.children, {index: ctx.index})}</a>;
      case 'mark': return <mark key={i} className="note-hl" data-hl={node.colour}><span className="sr-only">{COLOUR_WORDS[node.colour]} highlight: </span>{inline(node.children, ctx)}</mark>;
    }
  });
}
type Tick = (line: number, checked: boolean, words: string) => void;
/** Session AV lane 2 (r4-notes; LEDGER #314): a calm sign beside each callout's word (decoration; the word says it). */
const CALLOUT_ICON = {note: 'ℹ', tip: '✦', important: '❗', warning: '⚠', caution: '⛔'} as const;
function block(b: NoteBlock, i: number, ctx: Ctx, onTick: Tick | undefined, id: string): ReactNode {
  const r = (n: readonly NoteInline[]) => inline(n, ctx);
  switch (b.type) {
    case 'paragraph': return <p key={i}>{r(b.children)}</p>;
    case 'heading': {
      const hid = `${id}-h${i}`, head = b.level === 1 ? <h3 key={i} id={hid} tabIndex={-1}>{r(b.children)}</h3> : b.level === 2 ? <h4 key={i} id={hid} tabIndex={-1}>{r(b.children)}</h4> : <h5 key={i} id={hid} tabIndex={-1}>{r(b.children)}</h5>;
      // Session AV lane 2 (r4-notes; LEDGER #313, Bear): a heading with words under it folds them, for this visit.
      const f = ctx.fold, n = f ? f.size(i) : 0;
      if (!f || !n) return head;
      const shut = f.folded.has(i), words = plainText([b]).trim() || 'this heading';
      return <div key={i} className="note-fold-head" data-level={b.level}>
        <button type="button" className="note-fold-toggle" aria-expanded={!shut} aria-label={`${shut ? 'Open' : 'Fold'} “${words}”${shut ? ` (${n} ${n === 1 ? 'part' : 'parts'} folded)` : ''}`} onClick={() => f.toggle(i)}><span aria-hidden="true">{shut ? '▸' : '▾'}</span></button>
        {head}{shut && <span className="fine note-folded-count" aria-hidden="true">{n} {n === 1 ? 'part' : 'parts'} folded</span>}
      </div>;
    }
    case 'quote': return <blockquote key={i}><p>{r(b.children)}</p></blockquote>;
    case 'code': return <pre key={i}><code>{b.text}</code></pre>;
    case 'list': {
      const items = b.items.map((it, j) => { const tick = b.ticks?.[j], line = b.lines?.[j];
        if (tick === null || tick === undefined || line === undefined) return <li key={j}>{r(it)}</li>;
        const words = plainText([{type: 'paragraph', children: it}]);
        return <li key={j} className="note-tick" data-ticked={tick ? '' : undefined}><input type="checkbox" className="note-tick-box" checked={tick} disabled={!onTick} aria-labelledby={`${id}-t${line}`} onChange={e => onTick?.(line, e.target.checked, words)}/><span id={`${id}-t${line}`} className="note-tick-words">{r(it)}</span></li>; });
      const ticks = b.ticks?.some(t => t !== null) ? ' note-ticks' : '';
      return b.ordered ? <ol key={i} className={ticks.trim() || undefined}>{items}</ol> : <ul key={i} className={ticks.trim() || undefined}>{items}</ul>;
    }
    case 'callout': return <div key={i} className="note-callout" data-callout={b.kind} role="note" aria-label={b.word}>
      <p className="note-callout-head"><span className="note-callout-icon" aria-hidden="true">{CALLOUT_ICON[b.kind]}</span><strong>{b.word}</strong>{b.title && <>: {r(b.title)}</>}</p>
      {b.paragraphs.map((p, k) => <p key={k}>{r(p)}</p>)}
    </div>;
    case 'photo': return <NotePhotoFigure key={i} id={b.id} alt={b.alt} kept={!!ctx.photos?.includes(b.id)}/>;
    case 'table': return <div key={i} className="note-table-wrap" role="region" aria-label="Table" tabIndex={0}><table><thead><tr>{b.head.map((c, k) => <th key={k} scope="col">{r(c)}</th>)}</tr></thead><tbody>{b.rows.map((row, k) => <tr key={k}>{row.map((c, m) => <td key={m}>{r(c)}</td>)}</tr>)}</tbody></table></div>;
  }
}
/**
 * Session AV lane 2 (r3-notes; LEDGER #268, Obsidian's outline): a note with two headings or more lists them above it, in
 * a fold (closed, so a phone's first screen keeps the words); each jumps to its section and puts focus on that heading.
 */
function Outline({blocks, id, onReveal}: {blocks: readonly NoteBlock[]; id: string; /** LEDGER #313: opens the folds hiding a heading. */ onReveal?: (i: number) => void}) {
  const heads = blocks.flatMap((b, i) => b.type === 'heading' ? [{i, level: b.level, words: plainText([b]).trim()}] : []);
  if (heads.length < 2) return null;
  const go = (i: number) => {
    onReveal?.(i);
    requestAnimationFrame(() => { const el = document.getElementById(`${id}-h${i}`); if (!el) return; el.scrollIntoView({block: 'start'}); el.focus({preventScroll: true}); });
  };
  return <nav className="note-outline" aria-label="Outline of this note"><details><summary>Outline <span className="fine">· {heads.length} headings</span></summary>
    <ol>{heads.map(h => <li key={h.i} data-level={h.level}><button type="button" className="text-link" onClick={() => go(h.i)}>{h.words || 'Untitled heading'}</button></li>)}</ol>
  </details></nav>;
}
export function NoteRender({text, index, onCreate, onTick, onTag, photos, outline = false, fold = false}: {text: string; index: LinkIndex; onCreate?: (name: string) => void; /** Session AV lane 2 (LEDGER #264): ticks a tick box (its line in the text). */ onTick?: Tick; /** LEDGER #306: a #tag pressed. */ onTag?: (tag: string) => void; /** LEDGER #307: the photo ids the note keeps (a photo line draws only these). */ photos?: readonly string[]; /** LEDGER #268: list the headings above. */ outline?: boolean; /** LEDGER #313: headings fold their sections. */ fold?: boolean}) {
  const blocks = useMemo(() => parseBlocks(text, {notes: true}), [text]), id = useId();
  const levels = useMemo(() => blocks.map(b => b.type === 'heading' ? b.level : null), [blocks]);
  // The folds belong to this text: a changed text starts open (its block numbers move).
  const [kept, setKept] = useState<{text: string; folded: ReadonlySet<number>}>(() => ({text, folded: new Set()}));
  const folded = kept.text === text ? kept.folded : NO_FOLDS;
  const setFolded = (next: ReadonlySet<number> | ((f: ReadonlySet<number>) => ReadonlySet<number>)) => setKept(k => ({text, folded: typeof next === 'function' ? next(k.text === text ? k.folded : NO_FOLDS) : next}));
  const hidden = useMemo(() => hiddenBlocks(levels, folded), [levels, folded]), can = useMemo(() => foldable(levels), [levels]);
  const toggle = (i: number) => setFolded(f => { const next = new Set(f); if (next.has(i)) next.delete(i); else next.add(i); return next; });
  const reveal = (i: number) => setFolded(f => { const open = foldsHiding(levels, f, i); return open.length ? new Set([...f].filter(h => !open.includes(h))) : f; });
  const folds: Folds | undefined = fold && can.length ? {folded, size: i => sectionSize(levels, i), toggle} : undefined;
  const ctx: Ctx = {index, onCreate, onTag, photos, fold: folds};
  return <>{outline && <Outline blocks={blocks} id={id} onReveal={folds ? reveal : undefined}/>}
    {folds && <div className="note-fold-all" role="group" aria-label="Fold the sections of this note">
      <button type="button" className="quiet" disabled={can.every(i => folded.has(i))} onClick={() => setFolded(new Set(can))}>Fold all</button>
      <button type="button" className="quiet" disabled={!folded.size} onClick={() => setFolded(new Set())}>Open all</button>
    </div>}
    <div className="note-render">{blocks.map((b, i) => hidden.has(i) ? null : block(b, i, ctx, onTick, id))}</div></>;
}
