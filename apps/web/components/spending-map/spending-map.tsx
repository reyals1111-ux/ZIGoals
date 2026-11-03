'use client';
import {useEffect, useId, useMemo, useRef, useState, type KeyboardEvent} from 'react';
import type {MoneyEntry} from '../../lib/money-log/schema';
import {entryParts} from '../../lib/money-split/parts';
import {labelled, spendingMaps, squarify} from '../../lib/spending-map/layout';
import {formatDate, formatNumber} from '../../lib/visual-format';
import './spending-map.css';

/**
 * Session AK (BUILD list 2 #18): Wealth → Spending → "Map". This month's spending as a treemap, one per currency (never
 * mixed), drawn by hand in SVG from lib/spending-map/layout.ts. Each rectangle is a real button (Tab, Enter or Space)
 * that shows that category's entries below; the table beside it always lists every category (a label too small for its
 * rectangle is only in the table), so the map is never the only way to read it. No motion. Loaded on "Map" only.
 */
const money = (cents: number, currency: string) => { try { return new Intl.NumberFormat('en-GB', {style: 'currency', currency}).format(cents / 100); } catch { return `${(cents / 100).toFixed(2)} ${currency}`; } };
const TONES = ['violet', 'cyan', 'pink'] as const;
export default function SpendingMap({entries, from, to}: {entries: readonly MoneyEntry[]; from: string; to: string}) {
  const id = useId(), box = useRef<HTMLDivElement>(null), [width, setWidth] = useState(600);
  const [chosen, setChosen] = useState<{currency: string; category: string} | null>(null);
  const maps = useMemo(() => spendingMaps(entries, from, to), [entries, from, to]);
  useEffect(() => {
    const el = box.current; if (!el || typeof ResizeObserver === 'undefined') return;
    const watch = new ResizeObserver(([e]) => { const w = Math.round(e?.contentRect.width ?? 0); if (w > 0) setWidth(w); });
    watch.observe(el); return () => watch.disconnect();
  }, []);
  const height = Math.round(Math.max(220, Math.min(420, width * 0.62)));
  const picked = chosen ? entries.filter(e => e.kind === 'expense' && e.currency === chosen.currency && e.date >= from && e.date <= to).flatMap(e => entryParts(e).filter(p => p.category === chosen.category).map((p, i) => ({key: `${e.id}-${i}`, entry: e, cents: p.cents}))).sort((a, b) => b.entry.date.localeCompare(a.entry.date) || b.cents - a.cents) : [];
  const choose = (currency: string, category: string) => setChosen(c => c && c.currency === currency && c.category === category ? null : {currency, category});
  const keys = (event: KeyboardEvent, currency: string, category: string) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); choose(currency, category); } };
  if (!maps.length) return <p className="fine">No spending logged this month, so there is nothing to map yet. Log an expense above and it appears here.</p>;
  return <div className="spending-map" ref={box}>
    {maps.map(m => {
      const rects = squarify(m.rows.map(r => ({id: r.category, value: r.total})), {x: 0, y: 0, w: width, h: height});
      return <section key={m.currency} className="spending-map-currency" aria-labelledby={`${id}-${m.currency}`}>
        <h4 id={`${id}-${m.currency}`}>{m.currency} · {money(m.total, m.currency)} this month</h4>
        <svg className="spending-map-svg" width={width} height={height} viewBox={`0 0 ${width} ${height}`} role="group" aria-label={`Map of this month's ${m.currency} spending by category; the table below lists the same`}>
          {rects.map((r, i) => {
            const row = m.rows.find(x => x.category === r.id)!, active = chosen?.currency === m.currency && chosen.category === r.id;
            return <g key={r.id} className={`spending-map-cell tone-${TONES[i % TONES.length]}${active ? ' is-chosen' : ''}`} role="button" tabIndex={0} aria-pressed={active}
              aria-label={`${r.id}: ${money(row.total, m.currency)}, ${formatNumber(Math.round(row.share * 100))}% of this month's ${m.currency} spending. Show its entries`}
              onClick={() => choose(m.currency, r.id)} onKeyDown={e => keys(e, m.currency, r.id)}>
              <rect x={r.x + 1} y={r.y + 1} width={Math.max(0, r.w - 2)} height={Math.max(0, r.h - 2)} rx={8}/>
              {labelled(r) && <text x={r.x + 10} y={r.y + 22} aria-hidden="true"><tspan className="spending-map-name">{r.id.length > Math.floor(r.w / 9) ? `${r.id.slice(0, Math.max(3, Math.floor(r.w / 9) - 1))}…` : r.id}</tspan><tspan x={r.x + 10} dy={20}>{formatNumber(Math.round(row.share * 100))}%</tspan></text>}
            </g>;
          })}
        </svg>
        <table className="spending-map-table">
          <caption>{m.currency} spending this month by category</caption>
          <thead><tr><th scope="col">Category</th><th scope="col">Spent</th><th scope="col">Share</th><th scope="col">Entries</th></tr></thead>
          <tbody>{m.rows.map(r => <tr key={r.category}>
            <th scope="row"><button type="button" className="text-link" aria-pressed={chosen?.currency === m.currency && chosen.category === r.category} onClick={() => choose(m.currency, r.category)}>{r.category}</button></th>
            <td>{money(r.total, m.currency)}</td><td>{formatNumber(Math.round(r.share * 100))}%</td><td>{r.count}</td>
          </tr>)}</tbody>
        </table>
      </section>;
    })}
    {chosen && <section className="spending-map-entries" aria-labelledby={`${id}-entries`} aria-live="polite">
      <h4 id={`${id}-entries`}>{chosen.category} · {chosen.currency} this month</h4>
      <ul className="spending-entries">{picked.map(p => <li key={p.key}>
        <span className="spending-entry-what"><strong>{p.entry.note || p.entry.category}</strong><span className="fine"> · {formatDate(p.entry.date)}</span></span>
        <span className="spending-amount">−{money(p.cents, chosen.currency)}</span><span/>
      </li>)}</ul>
      <button type="button" className="quiet" onClick={() => setChosen(null)}>Show all categories</button>
    </section>}
    <p className="fine">Each rectangle&rsquo;s size is its share of this month&rsquo;s spending in that currency. Currencies are never mixed or converted.</p>
  </div>;
}
