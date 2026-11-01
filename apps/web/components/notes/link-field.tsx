'use client';
import {useId, useRef, useState, type KeyboardEvent} from 'react';
import {completeLink, linkQueryAt, suggestLinks, type LinkIndex, type LinkTarget} from '../../lib/notes/links';
import {SecretGuard} from '../secret-guard/secret-guard';

/**
 * Session AK (B3): a note's text field with [[link]] autocomplete. Typing `[[` lists notes, goals and habits whose names
 * fit the words after it; ↑ ↓ move, Enter or Tab puts the whole `[[Name]]` in, Escape closes the list. The list is a real
 * listbox the field points to (aria-activedescendant), and each option can be tapped. The secret guard watches the words.
 */
const KIND = {note: 'Note', goal: 'Goal', habit: 'Habit'} as const;
export function LinkField({label, value, onChange, index, exclude, rows = 8, maxLength, onSubmit, autoFocus, placeholder}: {
  label: string; value: string; onChange: (text: string) => void; index: LinkIndex; exclude?: Pick<LinkTarget, 'kind' | 'id'>;
  rows?: number; maxLength: number; onSubmit?: () => void; autoFocus?: boolean; /** Session AK G2 (R2-18): where `[[` is explained. */ placeholder?: string;
}) {
  const field = useRef<HTMLTextAreaElement>(null), id = useId();
  const [query, setQuery] = useState<{query: string; start: number} | null>(null), [active, setActive] = useState(0), [closed, setClosed] = useState(false);
  const options = query && !closed ? suggestLinks(index, query.query, 8, exclude) : [];
  const open = options.length > 0, current = Math.min(active, Math.max(0, options.length - 1));
  // Session AK lane EXF (EX-15): `[[` that finds nothing says so, instead of an empty list.
  const none = !!query && !closed && !open ? (query.query.trim() ? `Nothing to link matches “${query.query.trim().slice(0, 40)}”.` : 'Nothing to link yet: notes, goals and habits appear here once you have some.') : '';
  const look = (text: string, caret: number) => { const q = linkQueryAt(text, caret); setQuery(q); if (!q) setClosed(false); setActive(0); };
  const choose = (t: LinkTarget) => {
    const el = field.current; if (!el || !query) return;
    const next = completeLink(value, query.start, el.selectionStart ?? value.length, t.name);
    onChange(next.text.slice(0, maxLength)); setQuery(null);
    requestAnimationFrame(() => { el.focus(); el.setSelectionRange(next.caret, next.caret); });
  };
  const keys = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter' && onSubmit) { e.preventDefault(); onSubmit(); return; }
    if (!open) return;
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); setActive((current + (e.key === 'ArrowDown' ? 1 : options.length - 1)) % options.length); }
    else if (e.key === 'Enter' || e.key === 'Tab') { e.preventDefault(); choose(options[current]!); }
    else if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); setClosed(true); }
  };
  return <div className="note-field">
    {/* Named by its own label word (aria-labelledby): wrapped bare, the label's text also took the words typed in the box
        (lane NV; as the Notes page's capture box). */}
    <label className="field"><span id={`${id}-label`}>{label}</span>
      <textarea ref={field} rows={rows} maxLength={maxLength} value={value} autoFocus={autoFocus} placeholder={placeholder} aria-labelledby={`${id}-label`}
        aria-autocomplete="list" aria-controls={`${id}-list`} aria-activedescendant={open ? `${id}-opt-${current}` : undefined} aria-describedby={`${id}-hint`}
        onChange={e => { onChange(e.target.value); look(e.target.value, e.target.selectionStart ?? e.target.value.length); }}
        onKeyDown={keys} onKeyUp={e => { if (!['ArrowDown', 'ArrowUp', 'Enter', 'Tab', 'Escape'].includes(e.key) || !open) look(e.currentTarget.value, e.currentTarget.selectionStart ?? 0); }}
        onClick={e => look(e.currentTarget.value, e.currentTarget.selectionStart ?? 0)} onBlur={() => window.setTimeout(() => setQuery(null), 150)}/>
    </label>
    <p className="fine" id={`${id}-hint`}>Type <kbd>[[</kbd> to link a note, a goal or a habit.{onSubmit ? ' Ctrl or ⌘ + Enter saves.' : ''}</p>
    <ul id={`${id}-list`} role="listbox" aria-label="Link to" className="note-suggest" hidden={!open}>
      {options.map((t, i) => <li key={`${t.kind}:${t.id}`} id={`${id}-opt-${i}`} role="option" aria-selected={i === current} className={`is-${t.kind}`} onPointerDown={e => { e.preventDefault(); choose(t); }} onPointerMove={() => setActive(i)}>
        <span className="note-suggest-name">{t.name}</span><span className="note-suggest-kind">{KIND[t.kind]}</span>
      </li>)}
    </ul>
    {none && <p className="fine note-suggest-none">{none}</p>}
    <p className="sr-only" role="status">{open ? `${options.length} ${options.length === 1 ? 'match' : 'matches'} to link. Up and down to choose, Enter to link.` : none}</p>
    <SecretGuard text={value} onRemove={() => onChange('')}/>
  </div>;
}
