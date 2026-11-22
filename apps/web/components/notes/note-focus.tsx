'use client';
import {useCallback, useEffect, useId, useRef} from 'react';
import {SecretGuard} from '../secret-guard/secret-guard';
import './note-focus.css';

/**
 * Session AV lane 2 (r4-notes; LEDGER #316, Bear's typewriter mode): "Write in full screen" — the note alone, in a
 * modal dialog over the whole page (the rest is inert), until Done or Esc, which keep the words in the editor (Save
 * there, or Save here). With Typewriter on (kept on this device), the line being written stays in the middle of the
 * screen: the text is moved, never animated, so reduced motion and Motion Off see the same. Its own chunk.
 */
const STYLE_KEYS = ['boxSizing', 'width', 'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft', 'borderTopWidth', 'borderRightWidth', 'borderBottomWidth', 'borderLeftWidth', 'fontFamily', 'fontSize', 'fontWeight', 'fontStyle', 'letterSpacing', 'lineHeight', 'textTransform', 'wordSpacing', 'tabSize'] as const;
/** The caret's distance from the top of the text (a hidden copy of the field measures where the line wraps). */
function caretTop(el: HTMLTextAreaElement): {top: number; line: number} {
  const doc = el.ownerDocument, copy = doc.createElement('div'), style = doc.defaultView!.getComputedStyle(el);
  for (const k of STYLE_KEYS) copy.style[k] = style[k];
  Object.assign(copy.style, {position: 'absolute', visibility: 'hidden', whiteSpace: 'pre-wrap', overflowWrap: 'break-word', top: '0', left: '-9999px', height: 'auto'});
  copy.textContent = el.value.slice(0, el.selectionStart);
  const mark = doc.createElement('span'); mark.textContent = '​'; copy.append(mark);
  doc.body.append(copy);
  const top = mark.offsetTop, line = mark.offsetHeight || parseFloat(style.lineHeight) || 24;
  copy.remove();
  return {top, line};
}
export default function NoteFocus({title, value, onChange, typewriter, onTypewriter, onDone, onSave, canSave, maxLength}: {
  title: string; value: string; onChange: (next: string) => void; typewriter: boolean; onTypewriter: (on: boolean) => void;
  onDone: () => void; onSave: () => void; canSave: boolean; maxLength: number;
}) {
  const dialog = useRef<HTMLDialogElement>(null), field = useRef<HTMLTextAreaElement>(null), id = useId();
  useEffect(() => {
    const d = dialog.current; if (!d) return;
    if (!d.open) { try { d.showModal(); } catch { d.setAttribute('open', ''); } }
    const el = field.current; if (el) { el.focus({preventScroll: true}); el.setSelectionRange(el.value.length, el.value.length); }
    return () => { if (d.open) d.close(); };
  }, []);
  const centre = useCallback(() => {
    const el = field.current; if (!el || !typewriter) return;
    const {top, line} = caretTop(el);
    el.scrollTop = Math.max(0, top + line / 2 - el.clientHeight / 2);
  }, [typewriter]);
  useEffect(() => { centre(); }, [centre, value]);
  return <dialog ref={dialog} className="note-focus" aria-labelledby={`${id}-t`} data-typewriter={typewriter ? '' : undefined} onCancel={e => { e.preventDefault(); onDone(); }}>
    <div className="note-focus-head">
      <h2 id={`${id}-t`} className="note-focus-title">{title}</h2>
      <div className="note-actions">
        <button type="button" className="quiet" aria-pressed={typewriter} onClick={() => onTypewriter(!typewriter)}>Typewriter</button>
        <button type="button" className="secondary" disabled={!canSave} onClick={onSave}>Save</button>
        <button type="button" className="primary" onClick={onDone}>Done</button>
      </div>
    </div>
    <label className="sr-only" htmlFor={`${id}-f`}>The words of {title}</label>
    <textarea id={`${id}-f`} ref={field} className="note-focus-field" value={value} maxLength={maxLength} spellCheck onChange={e => onChange(e.target.value)} onKeyUp={centre} onClick={centre} onSelect={centre}/>
    <SecretGuard text={value} onRemove={() => onChange('')}/>
    <p className="fine note-focus-foot">{typewriter ? 'Typewriter: the line you write stays in the middle.' : 'Typewriter is off.'} Esc or Done goes back to the note; your words stay there until you save.</p>
  </dialog>;
}
