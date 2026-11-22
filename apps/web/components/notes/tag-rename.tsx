'use client';
import {useId, useMemo, useState} from 'react';
import {SecretGuard} from '../secret-guard/secret-guard';
import type {Notes} from '../../lib/notes/schema';
import {tagTree} from '../../lib/notes/tags';
import {taggableNotes} from '../../lib/notes/focus';
import {newTagName, renameTag, tagRenamePreview, tagTooLongWords, tooLongTag} from '../../lib/notes/tag-rename';
import {MAX_TAG} from '../../lib/notes/schema';
import type {Change} from './note-editor';

/**
 * Session AV lane 2 (r6-notes; LEDGER #399, Capacities): "Rename or merge a tag" under the Tags list (lazy, loaded when
 * its fold opens). Choose a tag; give it a new name (Rename tag), or choose another tag to join it with (Merge into …).
 * Every note's #tag — in its words and its Tags field, with the tags nested under it — changes in one step, the earlier
 * words kept under Earlier versions, and one Undo in the message puts every note back. A locked note changes too and is
 * only counted, never named.
 */
const many = (n: number) => n === 1 ? '1 note' : `${n} notes`;
export default function TagRename({record, change}: {record: Notes; change: Change}) {
  const tree = useMemo(() => tagTree(taggableNotes(record)), [record]), id = useId();
  const [from, setFrom] = useState(''), [name, setName] = useState(''), [into, setInto] = useState(''), [said, setSaid] = useState('');
  const tag = tree.some(t => t.tag === from) ? from : tree[0]?.tag ?? '';
  const others = tree.filter(t => t.tag.toLowerCase() !== tag.toLowerCase() && !t.tag.toLowerCase().startsWith(`${tag.toLowerCase()}/`));
  const target = others.some(t => t.tag === into) ? into : others[0]?.tag ?? '';
  const typed = newTagName(name), preview = tag && typed ? tagRenamePreview(record, tag, typed) : null;
  // Review b6n B6N-6: a name that would make a tag longer than 32 characters is refused in words, never cut.
  const long = !name.trim() ? null : name.trim().replace(/^#+/, '').replace(/\s+/g, '-').length > MAX_TAG ? name.trim().replace(/^#+/, '').replace(/\s+/g, '-') : typed && tag ? tooLongTag(record, tag, typed) : null;
  if (!tree.length) return <p className="fine">No tags yet. Once a note has a #tag, you can rename it here or merge it into another tag.</p>;
  const run = (to: string, merging: boolean) => {
    let out = {changed: 0, locked: 0, templateKept: false, unversioned: 0};
    const words = (n: number) => merging ? `#${tag} merged into #${to} on ${many(n)}.` : `#${tag} is #${to} now, on ${many(n)}.`;
    const ok = change(r => { const res = renameTag(r, tag, to, new Date().toISOString()); out = res; return {record: res.record, undo: res.undo}; }, words(tagRenamePreview(record, tag, to).notes));
    if (ok) {
      setSaid([out.locked ? `${out.locked === 1 ? '1 of them is locked' : `${out.locked} of them are locked`}: changed, not shown.` : '', out.templateKept ? `#${to} has its own template, so the template of #${tag} stays as it was.` : '', out.unversioned ? `Earlier versions is full, so the earlier words of ${many(out.unversioned)} were not kept as a version (no other note’s versions were pushed out); Undo in the message still puts them back.` : 'The earlier words are under each note’s Earlier versions.'].filter(Boolean).join(' '));
      setName(''); setFrom(to);
    }
  };
  return <div className="note-tag-rename">
    <label className="field"><span>Tag</span><select value={tag} onChange={e => { setFrom(e.target.value); setSaid(''); }}>{tree.map(t => <option key={t.tag} value={t.tag}>#{t.tag} ({many(t.count)})</option>)}</select></label>
    <form className="note-tag-rename-row" onSubmit={e => { e.preventDefault(); if (typed && preview && !preview.merge) run(typed, false); }} aria-label={`Rename #${tag}`}>
      <label className="field"><span>New name</span><input value={name} maxLength={40} onChange={e => setName(e.target.value)} placeholder="trips" aria-describedby={`${id}-rename`}/></label>
      <SecretGuard text={name} onRemove={() => setName('')}/>
      <p className="fine" id={`${id}-rename`} role="status">{!name.trim() ? `Every #${tag} (and the tags under it) gets the new name, in the words and the Tags field.` : long ? tagTooLongWords(long) : !typed ? 'A tag needs a letter: for example trips or work/meetings.' : typed.toLowerCase() === tag.toLowerCase() ? `It is called #${tag} already.` : preview!.merge ? `#${typed} is a tag already: choose it under Merge into to join them.` : `#${tag} becomes #${typed} in ${many(preview!.notes)}${preview!.locked ? ` (${preview!.locked} locked, changed but not shown)` : ''}.`}</p>
      <button type="submit" className="secondary" disabled={!typed || !!long || !preview || preview.merge || typed.toLowerCase() === tag.toLowerCase() || !preview.notes}>Rename tag</button>
    </form>
    {others.length > 0 && <form className="note-tag-rename-row" onSubmit={e => { e.preventDefault(); if (target) run(target, true); }} aria-label={`Merge #${tag} into another tag`}>
      <label className="field"><span>Merge into</span><select value={target} onChange={e => setInto(e.target.value)}>{others.map(t => <option key={t.tag} value={t.tag}>#{t.tag}</option>)}</select></label>
      <p className="fine">The notes with #{tag} get #{target} instead; a note with both keeps one.</p>
      <button type="submit" className="secondary">Merge into #{target}</button>
    </form>}
    {said && <p className="fine" role="status">{said}</p>}
  </div>;
}
