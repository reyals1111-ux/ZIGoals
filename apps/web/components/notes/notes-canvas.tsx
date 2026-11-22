'use client';
import {snippetOf} from '../../lib/notes/lock';
import Link from 'next/link';
import {useEffect, useId, useRef, useState, type CSSProperties, type KeyboardEvent, type PointerEvent, type RefObject} from 'react';
import {CANVAS_COLOURS, MAX_CANVASES, noteName, type CanvasNode, type NoteCanvas, type Notes} from '../../lib/notes/schema';
import {COLOUR_NAMES, NUDGE, NUDGE_FAR, addCanvas, addCard, bounds, canvasOf, canvasesOf, cardWords, connect, editCard, fromJsonCanvas, groupsOf, moveCard, putCanvasBack, relabel, removeCanvas, removeCard, removeLine, renameCanvas, resizeCard, toJsonCanvas, withCanvas} from '../../lib/notes/canvas';
import {exportPaths} from '../../lib/notes/markdown';
import {noteHref} from '../../lib/notes/links';
import {getNotePhoto} from '../../lib/notes/photos';
import {keepCapturePhoto} from '../../lib/notes/capture';
import {photoScope} from '../../lib/health-aa/photos';
import {buildStoredZip} from '../../lib/export/zip';
import {isShowcase} from '../../lib/showcase-storage';
import {SecretGuard} from '../secret-guard/secret-guard';
import {ConfirmInline} from '../ui/confirm-inline';
import {showUndo} from '../ui/undo-toast';
import type {Change} from './note-editor';
import './notes-canvas.css';

/**
 * Session AV lane 2 (r3-notes; LEDGER #273, Obsidian's Canvas): Notes → Canvas — boards where note cards, text cards and
 * photos are placed by hand, gathered in named groups and joined by labelled lines. Drawn as HTML cards over an SVG of
 * the lines (no library). Touch and mouse drag a card by its handle; the keyboard moves the focused card with the arrow
 * keys (Shift: further), and every action also has a button. A screen reader gets each card's name, its group and its
 * lines, and a list of every line. Kept in the notes record on this device; exported and imported as a .canvas file in
 * the open JSON Canvas format (a ZIP with the photos when the board has any). No motion. Loaded when Canvas is opened.
 */
function Photo({id}: {id: string}) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let made: string | null = null, live = true;
    void getNotePhoto(photoScope(), id).then(p => { if (live && p) { made = URL.createObjectURL(p.blob); setUrl(made); } }, () => undefined);
    return () => { live = false; if (made) URL.revokeObjectURL(made); };
  }, [id]);
  // eslint-disable-next-line @next/next/no-img-element -- a local blob of the person's own photo
  return url ? <img className="canvas-photo" src={url} alt="Your photo on this board" draggable={false}/> : <p className="fine">The photo is not in this browser.</p>;
}
const download = (data: Uint8Array | string, name: string, type: string) => {
  const url = URL.createObjectURL(new Blob([data as BlobPart], {type})), a = document.createElement('a');
  a.href = url; a.download = name; document.body.append(a); a.click(); a.remove(); window.setTimeout(() => URL.revokeObjectURL(url), 30_000);
};
const fileBase = (s: string) => s.replace(/[\\/:*?"<>|#^[\]\0-\x1f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 60) || 'Board';

export default function NotesCanvas({record, change}: {record: Notes; change: Change}) {
  const id = useId(), boards = canvasesOf(record);
  const [boardId, setBoardId] = useState<string | null>(boards[0]?.id ?? null);
  const board = canvasOf(record, boardId) ?? boards[0] ?? null;
  const [selected, setSelected] = useState<string | null>(null), [said, setSaid] = useState(''), [newName, setNewName] = useState(''), [confirmDelete, setConfirmDelete] = useState(false), [renaming, setRenaming] = useState(false);
  const [text, setText] = useState(''), [noteId, setNoteId] = useState(''), [groupName, setGroupName] = useState(''), [to, setTo] = useState(''), [label, setLabel] = useState('');
  const [drag, setDrag] = useState<{id: string; dx: number; dy: number; x0: number; y0: number} | null>(null);
  const surface = useRef<HTMLDivElement>(null), photoInput = useRef<HTMLInputElement>(null), fileInput = useRef<HTMLInputElement>(null);
  const now = () => new Date().toISOString();
  const focusCard = (cardId: string) => requestAnimationFrame(() => surface.current?.querySelector<HTMLElement>(`[data-card="${cardId}"]`)?.focus());
  const notes = record.notes, card = board?.nodes.find(n => n.id === selected) ?? null;
  const box = board ? bounds(board) : null;
  const lines = board ? board.edges.flatMap(e => { const a = board.nodes.find(n => n.id === e.from), b = board.nodes.find(n => n.id === e.to); return a && b ? [{e, a, b}] : []; }) : [];
  const shift = (n: CanvasNode) => drag && drag.id === n.id ? {x: n.x + drag.dx, y: n.y + drag.dy} : {x: n.x, y: n.y};
  const offerUndo = (message: string, before: NoteCanvas) => showUndo({message, undone: 'The board is back as it was.', restore: () => { change(r => putCanvasBack(r, before), ''); }});
  if (!board) return <div className="notes-canvas">
    <p className="fine">A board where you place cards by hand — your notes, a few words, a photo — gather them in named groups and join them with labelled lines. Everything stays on this device; Export makes a .canvas file Obsidian opens.</p>
    <form className="canvas-row" onSubmit={e => { e.preventDefault(); let made = ''; if (change(r => { const out = addCanvas(r, newName || 'My board', now()); made = out.canvas.id; return out.record; }, `Board “${(newName || 'My board').trim()}” made.`)) { setBoardId(made); setNewName(''); } }}>
      <label className="field"><span>A name for your first board</span><input value={newName} maxLength={60} onChange={e => setNewName(e.target.value)} placeholder="Trip plan"/></label>
      <button type="submit" className="primary">Make a board</button>
      <SecretGuard text={newName} onRemove={() => setNewName('')}/>
    </form>
    <ImportCanvas record={record} change={change} onMade={setBoardId} input={fileInput}/>
  </div>;
  const B = board, before = () => canvasOf(record, B.id)!;
  const add = (c: Parameters<typeof addCard>[2], words: string) => { let made = ''; if (change(r => { const out = addCard(r, B.id, c, now()); made = out.node.id; return out.record; }, words)) { setSelected(made); focusCard(made); } };
  const nudge = (n: CanvasNode, dx: number, dy: number) => { change(r => moveCard(r, B.id, n.id, dx, dy, now()), ''); setSaid(`${cardWords(n, notes)} moved.`); };
  const keys = (n: CanvasNode) => (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.target !== e.currentTarget) return;
    const step = e.shiftKey ? NUDGE_FAR : NUDGE, map: Record<string, [number, number]> = {ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step]};
    if (map[e.key]) { e.preventDefault(); nudge(n, ...map[e.key]!); }
    else if (e.key === 'Delete' || e.key === 'Backspace') { e.preventDefault(); removeOne(n); }
  };
  const removeOne = (n: CanvasNode) => { const prev = before(); if (change(r => removeCard(r, B.id, n.id, now()), '')) { offerUndo(`${cardWords(n, notes)} removed from the board.`, prev); setSelected(null); requestAnimationFrame(() => document.getElementById(`${id}-cards`)?.focus()); } };
  const down = (n: CanvasNode) => (e: PointerEvent<HTMLElement>) => { if (e.button !== 0) return; e.preventDefault(); (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId); setSelected(n.id); setDrag({id: n.id, dx: 0, dy: 0, x0: e.clientX, y0: e.clientY}); };
  const move = (e: PointerEvent<HTMLElement>) => { if (drag) setDrag({...drag, dx: e.clientX - drag.x0, dy: e.clientY - drag.y0}); };
  const up = (n: CanvasNode) => () => { if (!drag) return; const d = drag; setDrag(null); if (Math.abs(d.dx) + Math.abs(d.dy) > 2) nudge(n, d.dx, d.dy); };
  const exportBoard = async () => {
    const json = JSON.stringify(toJsonCanvas(B, exportPaths(notes)), null, 2), base = `${isShowcase() ? 'example-' : ''}${fileBase(B.name)}`, photos = B.nodes.filter(n => n.type === 'photo' && n.photo);
    if (!photos.length) { download(json, `${base}.canvas`, 'application/json'); setSaid(`Saved as ${base}.canvas.`); return; }
    const files: {name: string; data: Uint8Array | string; modified: Date}[] = [{name: `${base}.canvas`, data: json, modified: new Date()}];
    for (const p of photos) { try { const got = await getNotePhoto(photoScope(), p.photo!); if (got) files.push({name: `attachments/${p.photo}.webp`, data: new Uint8Array(await got.blob.arrayBuffer()), modified: new Date()}); } catch { /* left out */ } }
    download(buildStoredZip(files), `${base}.zip`, 'application/zip'); setSaid(`Saved as ${base}.zip: the .canvas file and its photos in attachments/.`);
  };
  const colour = (n: CanvasNode) => n.color ? {'--card-colour': `var(--canvas-${n.color})`} as CSSProperties : undefined;
  return <div className="notes-canvas">
    <div className="canvas-row" role="group" aria-label="Boards">
      <label className="field"><span>Board</span><select value={B.id} onChange={e => { setBoardId(e.target.value); setSelected(null); }}>{boards.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}</select></label>
      {boards.length < MAX_CANVASES && <form className="canvas-row" onSubmit={e => { e.preventDefault(); let made = ''; if (change(r => { const out = addCanvas(r, newName || 'New board', now()); made = out.canvas.id; return out.record; }, `Board “${(newName || 'New board').trim()}” made.`)) { setBoardId(made); setNewName(''); setSelected(null); } }}>
        <label className="field"><span>New board</span><input value={newName} maxLength={60} onChange={e => setNewName(e.target.value)} placeholder="A name"/></label><button type="submit" className="secondary">Make</button>
        <SecretGuard text={newName} onRemove={() => setNewName('')}/>
      </form>}
      <button type="button" className="quiet" aria-expanded={renaming} onClick={() => setRenaming(v => !v)}>Rename</button>
      <button type="button" className="quiet" onClick={() => void exportBoard()}>Export .canvas</button>
      <button type="button" className="quiet" aria-expanded={confirmDelete} onClick={() => setConfirmDelete(v => !v)}>Delete board…</button>
    </div>
    {renaming && <CardText key={`name-${B.id}`} value={B.name} label="The board’s name" single onKeep={v => { if (v.trim() && change(r => renameCanvas(r, B.id, v, now()), `The board is called “${v.trim()}” now.`)) setRenaming(false); }}/>}
    {confirmDelete && <ConfirmInline title={`Delete the board “${B.name}”?`} confirmLabel="Delete board" onConfirm={() => { const out = (() => { try { return removeCanvas(record, B.id); } catch { return null; } })(); if (out && change(() => out.record, '')) { showUndo({message: `Board “${B.name}” deleted.`, undone: 'The board is back.', restore: () => { change(r => putCanvasBack(r, out.removed, out.at), ''); }}); setConfirmDelete(false); setBoardId(null); } }} onCancel={() => setConfirmDelete(false)}><p>Its cards and lines go; the notes and photos they show stay. Undo brings it back.</p></ConfirmInline>}
    <ImportCanvas record={record} change={change} onMade={b => { setBoardId(b); setSelected(null); }} input={fileInput}/>

    <div className="canvas-tools" role="group" aria-label="Add to the board">
      <form className="canvas-row" onSubmit={e => { e.preventDefault(); if (text.trim()) { add({type: 'text', text}, 'A text card is on the board.'); setText(''); } }}>
        <label className="field"><span>Text card</span><textarea rows={2} value={text} maxLength={2000} onChange={e => setText(e.target.value)}/></label><button type="submit" className="secondary" disabled={!text.trim()}>Add the text</button>
        <SecretGuard text={text} onRemove={() => setText('')}/>
      </form>
      <div className="canvas-row">
        <label className="field"><span>Note card</span><select value={noteId} onChange={e => setNoteId(e.target.value)}><option value="">Choose a note</option>{notes.filter(n => n.kind !== 'inbox').map(n => <option key={n.id} value={n.id}>{n.kind === 'daily' && n.day ? n.day : noteName(n)}</option>)}</select></label>
        <button type="button" className="secondary" disabled={!noteId} onClick={() => { add({type: 'note', note: noteId}, 'A note card is on the board.'); setNoteId(''); }}>Add the note</button>
      </div>
      <form className="canvas-row" onSubmit={e => { e.preventDefault(); add({type: 'group', label: groupName || 'Group'}, `Group “${(groupName || 'Group').trim()}” is on the board. Move cards into it.`); setGroupName(''); }}>
        <label className="field"><span>Group</span><input value={groupName} maxLength={60} onChange={e => setGroupName(e.target.value)} placeholder="A name"/></label><button type="submit" className="secondary">Add a group</button>
        <SecretGuard text={groupName} onRemove={() => setGroupName('')}/>
      </form>
      <input ref={photoInput} type="file" accept="image/*" hidden tabIndex={-1} aria-hidden="true" onChange={e => { const f = e.target.files?.[0]; e.target.value = ''; if (!f) return; setSaid('Preparing the photo on this device…'); void keepCapturePhoto(f).then(pid => add({type: 'photo', photo: pid}, 'The photo is on the board, kept on this device.'), err => setSaid(err instanceof Error ? err.message : 'The photo was not kept.')); }}/>
      <button type="button" className="secondary" onClick={() => photoInput.current?.click()}>Add a photo</button>
    </div>

    <p className="fine" id={`${id}-how`}>Drag a card by its handle, or focus it and use the arrow keys (Shift for bigger steps). Delete removes it, with Undo.</p>
    <div className="canvas-surface" ref={surface} role="region" aria-label={`Board “${B.name}”`} tabIndex={-1}>
      <div className="canvas-plane" id={`${id}-cards`} tabIndex={-1} aria-label={`${B.nodes.length === 1 ? '1 card' : `${B.nodes.length} cards`} on the board`} role="group" style={{width: box!.width, height: box!.height}}>
        <svg className="canvas-lines" width={box!.width} height={box!.height} aria-hidden="true">
          <defs><marker id={`${id}-arrow`} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z"/></marker></defs>
          {lines.map(({e, a, b}) => { const pa = shift(a), pb = shift(b), x1 = pa.x + a.w / 2 - box!.minX, y1 = pa.y + a.h / 2 - box!.minY, x2 = pb.x + b.w / 2 - box!.minX, y2 = pb.y + b.h / 2 - box!.minY; return <g key={e.id}>
            <line x1={x1} y1={y1} x2={x2} y2={y2} markerEnd={`url(#${id}-arrow)`}/>
            {e.label && <text x={(x1 + x2) / 2} y={(y1 + y2) / 2 - 6} textAnchor="middle">{e.label}</text>}
          </g>; })}
        </svg>
        {B.nodes.map(n => { const p = shift(n), groups = n.type === 'group' ? [] : groupsOf(B, n), mine = lines.filter(l => l.a.id === n.id || l.b.id === n.id);
          const name = `${cardWords(n, notes)}${groups.length ? `, in ${groups.map(g => `“${g.label || 'Group'}”`).join(', ')}` : ''}${mine.length ? `, ${mine.length === 1 ? '1 line' : `${mine.length} lines`}` : ''}`;
          return <div key={n.id} data-card={n.id} className={`canvas-card is-${n.type}${selected === n.id ? ' is-selected' : ''}`} style={{left: p.x - box!.minX, top: p.y - box!.minY, width: n.w, height: n.h, ...colour(n)}} role="group" aria-label={name} aria-describedby={`${id}-how`} tabIndex={0} onKeyDown={keys(n)} onFocus={() => setSelected(n.id)}>
            <span className="canvas-handle" aria-hidden="true" onPointerDown={down(n)} onPointerMove={move} onPointerUp={up(n)} onPointerCancel={() => setDrag(null)} title="Drag to move">⠿</span>
            {n.type === 'group' ? <strong className="canvas-group-label">{n.label || 'Group'}</strong>
              : n.type === 'note' ? (() => { const note = notes.find(x => x.id === n.note); return note ? <><Link className="text-link" href={noteHref(note.id)}>{note.kind === 'daily' && note.day ? note.day : noteName(note)}</Link><p className="canvas-card-text">{snippetOf({...note, body: note.body.replace(/\(SHOWCASE DATA\)/g, '').trim()}, 160)}</p></> : <p className="fine">This note is no longer on this device.</p>; })()
              : n.type === 'photo' ? <Photo id={n.photo ?? ''}/> : <p className="canvas-card-text">{n.text}</p>}
          </div>; })}
      </div>
    </div>
    {!B.nodes.length && <p className="fine">This board is empty. Add a text card, a note or a photo above; then join two cards with a line, or gather them in a group.</p>}

    {card && <section className="canvas-panel" aria-labelledby={`${id}-sel`}>
      <h3 id={`${id}-sel`}>{cardWords(card, notes)}</h3>
      <div className="canvas-row" role="group" aria-label="Move">
        {([['Left', -NUDGE_FAR, 0], ['Right', NUDGE_FAR, 0], ['Up', 0, -NUDGE_FAR], ['Down', 0, NUDGE_FAR]] as const).map(([w, dx, dy]) => <button key={w} type="button" className="quiet" onClick={() => nudge(card, dx, dy)}>{w}</button>)}
        <button type="button" className="quiet" onClick={() => change(r => resizeCard(r, B.id, card.id, 40, 20, now()), 'Bigger.')}>Bigger</button>
        <button type="button" className="quiet" onClick={() => change(r => resizeCard(r, B.id, card.id, -40, -20, now()), 'Smaller.')}>Smaller</button>
      </div>
      {card.type === 'text' && <CardText key={card.id} value={card.text ?? ''} onKeep={v => change(r => editCard(r, B.id, card.id, {text: v}, now()), 'The card’s words are kept.')}/>}
      {card.type === 'group' && <CardText key={card.id} value={card.label ?? ''} label="Group name" single onKeep={v => change(r => editCard(r, B.id, card.id, {label: v}, now()), 'The group’s name is kept.')}/>}
      <label className="field"><span>Colour</span><select value={card.color ?? ''} onChange={e => change(r => editCard(r, B.id, card.id, {color: (e.target.value || null) as CanvasNode['color'] | null}, now()), e.target.value ? `${COLOUR_NAMES[e.target.value as keyof typeof COLOUR_NAMES]}.` : 'No colour.')}><option value="">No colour</option>{CANVAS_COLOURS.map(c => <option key={c} value={c}>{COLOUR_NAMES[c]}</option>)}</select></label>
      {B.nodes.length > 1 && <form className="canvas-row" onSubmit={e => { e.preventDefault(); if (to && change(r => connect(r, B.id, card.id, to, label, now()), `Joined to ${cardWords(B.nodes.find(n => n.id === to)!, notes)}.`)) { setTo(''); setLabel(''); } }} aria-label="Join to another card">
        <label className="field"><span>Join to</span><select value={to} onChange={e => setTo(e.target.value)}><option value="">Choose a card</option>{B.nodes.filter(n => n.id !== card.id).map(n => <option key={n.id} value={n.id}>{cardWords(n, notes)}</option>)}</select></label>
        <label className="field"><span>Line label — optional</span><input value={label} maxLength={60} onChange={e => setLabel(e.target.value)} placeholder="leads to"/></label>
        <button type="submit" className="secondary" disabled={!to}>Join</button>
        <SecretGuard text={label} onRemove={() => setLabel('')}/>
      </form>}
      <button type="button" className="quiet" onClick={() => removeOne(card)}>Remove from the board</button>
    </section>}

    <section className="canvas-lines-list" aria-labelledby={`${id}-lines`}>
      <h3 id={`${id}-lines`} tabIndex={-1}>Lines on this board <span className="fine">· {lines.length || 'none yet'}</span></h3>
      {lines.length ? <ul>{lines.map(({e, a, b}) => <li key={e.id}>
        <span>{cardWords(a, notes)} → {cardWords(b, notes)}{e.label ? `: ${e.label}` : ''}</span>
        <details className="canvas-line-label"><summary>Label</summary><CardText value={e.label ?? ''} label="The line’s label (empty for none)" single onKeep={v => change(r => relabel(r, B.id, e.id, v, now()), 'The line’s label is kept.')}/></details>
        <button type="button" className="text-link" onClick={() => { const prev = before(); if (change(r => removeLine(r, B.id, e.id, now()), '')) { offerUndo('The line is removed.', prev); requestAnimationFrame(() => document.getElementById(`${id}-lines`)?.focus()); } }}>Remove</button>
      </li>)}</ul> : <p className="fine">Choose a card, then Join to, to draw a line between two cards.</p>}
    </section>
    <p className="sr-only" role="status" aria-live="polite">{said}</p>
  </div>;
}
function CardText({value, onKeep, label = 'The card’s words', single = false}: {value: string; onKeep: (v: string) => void; label?: string; single?: boolean}) {
  const [draft, setDraft] = useState(value);
  return <form className="canvas-row" onSubmit={e => { e.preventDefault(); if (draft !== value) onKeep(draft); }}>
    <label className="field"><span>{label}</span>{single ? <input type="text" value={draft} maxLength={60} onChange={e => setDraft(e.target.value)}/> : <textarea rows={3} value={draft} maxLength={2000} onChange={e => setDraft(e.target.value)}/>}</label>
    <button type="submit" className="secondary" disabled={draft === value}>Keep</button>
    <SecretGuard text={draft} onRemove={() => setDraft(value)}/>
  </form>;
}
function ImportCanvas({record, change, onMade, input}: {record: Notes; change: Change; onMade: (id: string) => void; input: RefObject<HTMLInputElement | null>}) {
  const [said, setSaid] = useState('');
  const pick = async (f: File | undefined) => {
    if (!f) return;
    if (f.size > 2 * 1024 * 1024) { setSaid('That file is over 2 MB.'); return; }
    try {
      const out = fromJsonCanvas(await f.text(), record.notes, f.name.replace(/\.canvas$/i, '') || 'Imported board', new Date().toISOString());
      if (change(r => withCanvas(r, out.canvas), `Board “${out.canvas.name}” imported: ${out.canvas.nodes.length} cards, ${out.canvas.edges.length} lines${out.skipped ? `; ${out.skipped} left out` : ''}.`)) onMade(out.canvas.id);
    } catch (e) { setSaid(e instanceof Error ? e.message : 'This file could not be read.'); }
  };
  return <div className="canvas-row">
    <input ref={input} type="file" accept=".canvas,application/json" hidden tabIndex={-1} aria-hidden="true" onChange={e => { void pick(e.target.files?.[0]); e.target.value = ''; }}/>
    {canvasesOf(record).length < MAX_CANVASES && <button type="button" className="quiet" onClick={() => input.current?.click()}>Import a .canvas file</button>}
    {said && <p className="field-error" role="alert">{said}</p>}
  </div>;
}
