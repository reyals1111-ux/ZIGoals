'use client';
import Link from 'next/link';
import {Fragment, useId, useMemo, type ReactNode} from 'react';
import {parseBlocks, plainText, type NoteBlock, type NoteInline} from '../../lib/ai/safe-render';
import {parseLinks, resolveLink, type LinkIndex} from '../../lib/notes/links';

/**
 * Session AK (B3): a note on screen — React elements from the same safe Markdown parser ZIGi's replies use (headings,
 * lists, quotes, code, bold, italics, https links; never HTML, never a script), with every [[link]] made a link to the
 * note, goal or habit it names. A link that reaches nothing yet is a button that makes that note (`onCreate`).
 * Session AV lane 2 (r3-notes; LEDGER #264, #267): the parser's notes-only marks are on here (never in ZIGi's replies):
 * ==highlights== in six named colours, and "- [ ]" tick boxes that tick in the reading view (`onTick`, with the line).
 */
const KIND_WORD = {note: 'note', goal: 'goal', habit: 'habit'} as const;
function linkify(text: string, index: LinkIndex, onCreate?: (name: string) => void): ReactNode[] {
  const out: ReactNode[] = [];
  let at = 0;
  for (const l of parseLinks(text)) {
    if (l.start > at) out.push(text.slice(at, l.start));
    const shown = l.alias ?? l.target, t = l.embed && /\.(?:png|jpe?g|webp|gif|avif|heic)$/i.test(l.target) ? null : resolveLink(index, l.target);
    if (l.embed && !t) out.push(<span key={l.start} className="note-embed">{shown}</span>);
    else if (t) out.push(<Link key={l.start} className={`note-link is-${t.kind}`} href={t.href} title={`Open the ${KIND_WORD[t.kind]} “${t.name}”`}>{shown}</Link>);
    else out.push(onCreate ? <button key={l.start} type="button" className="note-link is-open" onClick={() => onCreate(l.target)} aria-label={`${shown}: no note yet. Create it`}>{shown}</button> : <span key={l.start} className="note-link is-open">{shown}</span>);
    at = l.end;
  }
  if (at < text.length) out.push(text.slice(at));
  return out;
}
export const COLOUR_WORDS = {yellow: 'Yellow', green: 'Green', blue: 'Blue', purple: 'Purple', red: 'Red', orange: 'Orange'} as const;
function inline(nodes: readonly NoteInline[], index: LinkIndex, onCreate?: (name: string) => void): ReactNode[] {
  return nodes.map((node, i) => {
    switch (node.type) {
      case 'text': return <Fragment key={i}>{linkify(node.text, index, onCreate)}</Fragment>;
      case 'code': return <code key={i}>{node.text}</code>;
      case 'strong': return <strong key={i}>{inline(node.children, index, onCreate)}</strong>;
      case 'em': return <em key={i}>{inline(node.children, index, onCreate)}</em>;
      case 'link': return <a key={i} href={node.href} target="_blank" rel="noopener noreferrer">{inline(node.children, index, onCreate)}</a>;
      case 'mark': return <mark key={i} className="note-hl" data-hl={node.colour}><span className="sr-only">{COLOUR_WORDS[node.colour]} highlight: </span>{inline(node.children, index, onCreate)}</mark>;
    }
  });
}
type Tick = (line: number, checked: boolean, words: string) => void;
function block(b: NoteBlock, i: number, index: LinkIndex, onCreate: ((name: string) => void) | undefined, onTick: Tick | undefined, id: string): ReactNode {
  const r = (n: readonly NoteInline[]) => inline(n, index, onCreate);
  switch (b.type) {
    case 'paragraph': return <p key={i}>{r(b.children)}</p>;
    case 'heading': { const hid = `${id}-h${i}`; return b.level === 1 ? <h3 key={i} id={hid} tabIndex={-1}>{r(b.children)}</h3> : b.level === 2 ? <h4 key={i} id={hid} tabIndex={-1}>{r(b.children)}</h4> : <h5 key={i} id={hid} tabIndex={-1}>{r(b.children)}</h5>; }
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
    case 'table': return <div key={i} className="note-table-wrap" role="region" aria-label="Table" tabIndex={0}><table><thead><tr>{b.head.map((c, k) => <th key={k} scope="col">{r(c)}</th>)}</tr></thead><tbody>{b.rows.map((row, k) => <tr key={k}>{row.map((c, m) => <td key={m}>{r(c)}</td>)}</tr>)}</tbody></table></div>;
  }
}
/**
 * Session AV lane 2 (r3-notes; LEDGER #268, Obsidian's outline): a note with two headings or more lists them above it, in
 * a fold (closed, so a phone's first screen keeps the words); each jumps to its section and puts focus on that heading.
 */
function Outline({blocks, id}: {blocks: readonly NoteBlock[]; id: string}) {
  const heads = blocks.flatMap((b, i) => b.type === 'heading' ? [{i, level: b.level, words: plainText([b]).trim()}] : []);
  if (heads.length < 2) return null;
  const go = (i: number) => { const el = document.getElementById(`${id}-h${i}`); if (!el) return; el.scrollIntoView({block: 'start'}); el.focus({preventScroll: true}); };
  return <nav className="note-outline" aria-label="Outline of this note"><details><summary>Outline <span className="fine">· {heads.length} headings</span></summary>
    <ol>{heads.map(h => <li key={h.i} data-level={h.level}><button type="button" className="text-link" onClick={() => go(h.i)}>{h.words || 'Untitled heading'}</button></li>)}</ol>
  </details></nav>;
}
export function NoteRender({text, index, onCreate, onTick, outline = false}: {text: string; index: LinkIndex; onCreate?: (name: string) => void; /** Session AV lane 2 (LEDGER #264): ticks a tick box (its line in the text). */ onTick?: Tick; /** LEDGER #268: list the headings above. */ outline?: boolean}) {
  const blocks = useMemo(() => parseBlocks(text, {notes: true}), [text]), id = useId();
  return <>{outline && <Outline blocks={blocks} id={id}/>}<div className="note-render">{blocks.map((b, i) => block(b, i, index, onCreate, onTick, id))}</div></>;
}
