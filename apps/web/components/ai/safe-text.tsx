import {Fragment, useMemo, type ReactNode} from 'react';
import {parseBlocks, type Block, type Inline} from '../../lib/ai/safe-render';
import './safe-text.css';

/**
 * A reply on screen (ADR-012, Part 6): React elements built from the parsed tree, never HTML. Links open in a new tab
 * with rel="noopener noreferrer" and show their full address when the words differ from it. No images, no scripts.
 */
function host(href: string): string { try { return new URL(href).host; } catch { return href; } }
/**
 * `mark` (Session AM-2, NOVA's conversation console): how plain words are shown, for the eye only (NOVA lights the
 * figures in them). The characters stay the same; code and a link's own words are never marked. Without it nothing changes.
 */
type Mark = (text: string) => ReactNode;
function renderInlineWith(nodes: readonly Inline[], mark?: Mark): ReactNode[] {
  return nodes.map((node, i) => {
    switch (node.type) {
      case 'text': return <Fragment key={i}>{mark ? mark(node.text) : node.text}</Fragment>;
      case 'code': return <code key={i}>{node.text}</code>;
      case 'strong': return <strong key={i}>{renderInlineWith(node.children, mark)}</strong>;
      case 'em': return <em key={i}>{renderInlineWith(node.children, mark)}</em>;
      case 'link': {
        const label = node.children.map(c => c.type === 'text' ? c.text : '').join('');
        return <a key={i} href={node.href} target="_blank" rel="noopener noreferrer">{renderInlineWith(node.children)}{label !== node.href && <span className="ai-link-address"> ({host(node.href)})</span>}</a>;
      }
    }
  });
}
function renderBlock(block: Block, i: number, mark?: Mark): ReactNode {
  const renderInline = (nodes: readonly Inline[]) => renderInlineWith(nodes, mark);
  switch (block.type) {
    case 'paragraph': return <p key={i}>{renderInline(block.children)}</p>;
    case 'heading': return block.level === 1 ? <h3 key={i}>{renderInline(block.children)}</h3> : block.level === 2 ? <h4 key={i}>{renderInline(block.children)}</h4> : <h5 key={i}>{renderInline(block.children)}</h5>;
    case 'quote': return <blockquote key={i}><p>{renderInline(block.children)}</p></blockquote>;
    case 'code': return <pre key={i} data-language={block.language ?? undefined}><code>{block.text}</code></pre>;
    case 'list': return block.ordered ? <ol key={i}>{block.items.map((item, j) => <li key={j}>{renderInline(item)}</li>)}</ol> : <ul key={i}>{block.items.map((item, j) => <li key={j}>{renderInline(item)}</li>)}</ul>;
    // Session V Part 10: a table scrolls on its own on a phone; alignment is a class, never a style attribute.
    case 'table': {
      const cls = (c: number) => block.align[c] ? `ai-align-${block.align[c]}` : undefined;
      return <div key={i} className="ai-table-wrap" role="region" aria-label="Table from the reply" tabIndex={0}><table className="ai-table">
        <thead><tr>{block.head.map((cell, c) => <th key={c} scope="col" className={cls(c)}>{renderInline(cell)}</th>)}</tr></thead>
        <tbody>{block.rows.map((row, r) => <tr key={r}>{row.map((cell, c) => <td key={c} className={cls(c)}>{renderInline(cell)}</td>)}</tr>)}</tbody>
      </table>{block.cut > 0 && <p className="ai-note">{block.cut} more rows not shown.</p>}</div>;
    }
  }
}
export function SafeText({text, className, mark}: {text: string; className?: string; mark?: Mark}) {
  const blocks = useMemo(() => parseBlocks(text), [text]);
  return <div className={className}>{blocks.map((block, i) => renderBlock(block, i, mark))}</div>;
}
