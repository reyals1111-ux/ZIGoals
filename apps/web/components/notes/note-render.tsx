'use client';
import Link from 'next/link';
import {Fragment, useMemo, type ReactNode} from 'react';
import {parseBlocks, type Block, type Inline} from '../../lib/ai/safe-render';
import {parseLinks, resolveLink, type LinkIndex} from '../../lib/notes/links';

/**
 * Session AK (B3): a note on screen — React elements from the same safe Markdown parser ZIGi's replies use (headings,
 * lists, quotes, code, bold, italics, https links; never HTML, never a script), with every [[link]] made a link to the
 * note, goal or habit it names. A link that reaches nothing yet is a button that makes that note (`onCreate`).
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
function inline(nodes: readonly Inline[], index: LinkIndex, onCreate?: (name: string) => void): ReactNode[] {
  return nodes.map((node, i) => {
    switch (node.type) {
      case 'text': return <Fragment key={i}>{linkify(node.text, index, onCreate)}</Fragment>;
      case 'code': return <code key={i}>{node.text}</code>;
      case 'strong': return <strong key={i}>{inline(node.children, index, onCreate)}</strong>;
      case 'em': return <em key={i}>{inline(node.children, index, onCreate)}</em>;
      case 'link': return <a key={i} href={node.href} target="_blank" rel="noopener noreferrer">{inline(node.children, index, onCreate)}</a>;
    }
  });
}
function block(b: Block, i: number, index: LinkIndex, onCreate?: (name: string) => void): ReactNode {
  const r = (n: readonly Inline[]) => inline(n, index, onCreate);
  switch (b.type) {
    case 'paragraph': return <p key={i}>{r(b.children)}</p>;
    case 'heading': return b.level === 1 ? <h3 key={i}>{r(b.children)}</h3> : b.level === 2 ? <h4 key={i}>{r(b.children)}</h4> : <h5 key={i}>{r(b.children)}</h5>;
    case 'quote': return <blockquote key={i}><p>{r(b.children)}</p></blockquote>;
    case 'code': return <pre key={i}><code>{b.text}</code></pre>;
    case 'list': return b.ordered ? <ol key={i}>{b.items.map((it, j) => <li key={j}>{r(it)}</li>)}</ol> : <ul key={i}>{b.items.map((it, j) => <li key={j}>{r(it)}</li>)}</ul>;
    case 'table': return <div key={i} className="note-table-wrap" role="region" aria-label="Table" tabIndex={0}><table><thead><tr>{b.head.map((c, k) => <th key={k} scope="col">{r(c)}</th>)}</tr></thead><tbody>{b.rows.map((row, k) => <tr key={k}>{row.map((c, m) => <td key={m}>{r(c)}</td>)}</tr>)}</tbody></table></div>;
  }
}
export function NoteRender({text, index, onCreate}: {text: string; index: LinkIndex; onCreate?: (name: string) => void}) {
  const blocks = useMemo(() => parseBlocks(text), [text]);
  return <div className="note-render">{blocks.map((b, i) => block(b, i, index, onCreate))}</div>;
}
