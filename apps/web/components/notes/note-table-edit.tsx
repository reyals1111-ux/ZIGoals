'use client';
import {useEffect, useId, useMemo, useRef, useState} from 'react';
import {SecretGuard} from '../secret-guard/secret-guard';
import {addColumn, addRow, findTables, moveRow, removeColumn, removeRow, replaceTable, setCell, sortBy, type NoteTable} from '../../lib/notes/table-edit';

/**
 * Session AV lane 2 (r5-notes; LEDGER #363, Craft's table quick actions): "Change a table" while editing a note (lazy,
 * loaded on the press). The table as a grid of fields (each named by its row and column); Add a row, Add a column, and
 * for a chosen row Move up, Move down and Remove, for a chosen column Sort A to Z, Sort Z to A and Remove. Every change
 * goes back into the note's words as Markdown; Save keeps the earlier words under Earlier versions, as every save does.
 * Esc or Close shuts it, focus back on its button.
 */
export default function NoteTableEdit({value, onChange, onClose}: {value: string; onChange: (text: string) => void; onClose: () => void}) {
  const tables = useMemo(() => findTables(value), [value]), id = useId(), box = useRef<HTMLDivElement>(null);
  const [which, setWhich] = useState(0), [row, setRow] = useState(0), [col, setCol] = useState(0), [name, setName] = useState(''), [said, setSaid] = useState('');
  useEffect(() => { box.current?.querySelector<HTMLElement>('select, input')?.focus(); }, []);
  const t = tables[Math.min(which, tables.length - 1)];
  const apply = (fn: (x: NoteTable) => NoteTable, words: string) => {
    if (!t) return;
    try { onChange(replaceTable(value, t, fn(t))); setSaid(words); } catch (e) { setSaid(e instanceof Error ? e.message : 'That did not change the table.'); }
  };
  const colName = (c: number) => t?.head[c]?.trim() || `Column ${c + 1}`;
  return <div className="note-table-edit" ref={box} role="group" aria-label="Change a table" onKeyDown={e => { if (e.key === 'Escape') { e.preventDefault(); onClose(); } }}>
    {tables.length > 1 && <label className="field"><span>Table</span><select value={which} onChange={e => { setWhich(Number(e.target.value)); setRow(0); setCol(0); }}>{tables.map((x, i) => <option key={i} value={i}>Table {i + 1}: {x.head.slice(0, 3).join(', ')}{x.head.length > 3 ? '…' : ''}</option>)}</select></label>}
    {t?.blocked ? <p className="fine" role="status">{t.blocked}</p> : !t ? <p className="fine">This note has no table yet. Write a header line such as <code>| Item | Price |</code>, then <code>| --- | --- |</code> under it, and each row on its own line.</p> : <>
      <div className="note-table-grid" role="region" aria-label={`Table ${Math.min(which, tables.length - 1) + 1}, ${t.head.length} columns and ${t.rows.length} rows`} tabIndex={0}>
        <table><thead><tr>{t.head.map((h, c) => <th key={c} scope="col"><Cell label={`Heading of column ${c + 1}`} value={h} onChange={w => apply(x => setCell(x, -1, c, w), '')}/></th>)}</tr></thead>
          <tbody>{t.rows.map((r, i) => <tr key={i}>{r.map((v, c) => <td key={c}><Cell label={`Row ${i + 1}, ${colName(c)}`} value={v} onChange={w => apply(x => setCell(x, i, c, w), '')}/></td>)}</tr>)}</tbody></table>
      </div>
      {/* The guard warns beside the table (its headings, then its cells); Remove would clear words the person chose, so it only says it. */}
      <SecretGuard text={t.head.join('\n')}/>
      <SecretGuard text={t.rows.flat().join('\n')}/>
      <div className="note-actions">
        <button type="button" className="secondary" onClick={() => apply(x => addRow(x), 'A row was added at the end.')}>Add a row</button>
        <label className="field note-table-name"><span>New column</span><input value={name} maxLength={60} onChange={e => setName(e.target.value)} placeholder="Notes"/></label>
        <SecretGuard text={name} onRemove={() => setName('')}/>
        <button type="button" className="secondary" onClick={() => { apply(x => addColumn(x, name), `The column “${name.trim() || `Column ${t.head.length + 1}`}” was added.`); setName(''); }}>Add a column</button>
      </div>
      {t.rows.length > 0 && <div className="note-actions">
        <label className="field"><span>Row</span><select value={Math.min(row, t.rows.length - 1)} onChange={e => setRow(Number(e.target.value))}>{t.rows.map((r, i) => <option key={i} value={i}>Row {i + 1}{r[0]?.trim() ? `: ${r[0].slice(0, 30)}` : ''}</option>)}</select></label>
        <button type="button" className="quiet" disabled={row <= 0} onClick={() => { apply(x => moveRow(x, row, -1), `Row ${row + 1} moved up.`); setRow(row - 1); }}>Move up</button>
        <button type="button" className="quiet" disabled={row >= t.rows.length - 1} onClick={() => { apply(x => moveRow(x, row, 1), `Row ${row + 1} moved down.`); setRow(row + 1); }}>Move down</button>
        <button type="button" className="quiet" onClick={() => { apply(x => removeRow(x, Math.min(row, t.rows.length - 1)), `Row ${Math.min(row, t.rows.length - 1) + 1} was removed.`); setRow(Math.max(0, Math.min(row, t.rows.length - 2))); }}>Remove row</button>
      </div>}
      <div className="note-actions">
        <label className="field"><span>Column</span><select value={Math.min(col, t.head.length - 1)} onChange={e => setCol(Number(e.target.value))}>{t.head.map((_, c) => <option key={c} value={c}>{colName(c)}</option>)}</select></label>
        <button type="button" className="quiet" disabled={t.rows.length < 2} onClick={() => apply(x => sortBy(x, col, 'up'), `Sorted by “${colName(col)}”, A to Z (small to large).`)}>Sort A to Z</button>
        <button type="button" className="quiet" disabled={t.rows.length < 2} onClick={() => apply(x => sortBy(x, col, 'down'), `Sorted by “${colName(col)}”, Z to A (large to small).`)}>Sort Z to A</button>
        <button type="button" className="quiet" disabled={t.head.length <= 1} onClick={() => { apply(x => removeColumn(x, Math.min(col, t.head.length - 1)), `The column “${colName(col)}” was removed.`); setCol(0); }}>Remove column</button>
      </div>
      <p className="fine" id={`${id}-help`}>Changes go into the note&rsquo;s words as a Markdown table. Save keeps the earlier words under Earlier versions.</p>
    </>}
    {said && <p className="fine" role="status">{said}</p>}
    <div className="note-actions"><button type="button" className="quiet" onClick={onClose}>Close</button></div>
  </div>;
}

/** One cell: its words as typed while it has focus (the Markdown trims spaces at the ends), the note's otherwise. */
function Cell({label, value, onChange}: {label: string; value: string; onChange: (words: string) => void}) {
  const [draft, setDraft] = useState<string | null>(null);
  return <input aria-label={label} value={draft ?? value} maxLength={500} onFocus={() => setDraft(value)} onBlur={() => setDraft(null)} onChange={e => { setDraft(e.target.value); onChange(e.target.value); }}/>;
}
