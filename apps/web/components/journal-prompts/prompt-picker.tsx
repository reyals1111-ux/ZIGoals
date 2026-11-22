'use client';
import {Suspense, lazy, useId, useRef, useState} from 'react';
import {mutedNow} from '../../lib/muted/rule';
// Session AV lane 2 (LEDGER #56): what the person hid, in one list; loaded when its fold opens.
const MutedPanel = lazy(() => import('../muted/muted-panel'));
import {JOURNAL_TEMPLATES, type JournalTemplate, type PromptLang} from '../../lib/journal-prompts/templates';
import {asJournalTemplate, newOwnTemplateId, ownTemplateIssue, readHeadings} from '../../lib/journal-prompts/own';
import {OWN_TITLE_MAX, emptyJournal, type OwnTemplate} from '../../lib/journal/schema';
import {showUndo} from '../ui/undo-toast';
import './prompt-picker.css';

/**
 * Session AK (BUILD list 2 #13, lane G1a): "Start from a prompt" in the Journal's Write box — eight templates in English
 * or Dutch, free. Picking one fills the entry with its headings (the compose keeps the person's own words above them);
 * the entry then remembers which template it began from. Loaded when its fold opens; stores nothing itself.
 */
export default function PromptPicker({onPick, own = [], onAddOwn, onRemoveOwn, onEditOwn, startLang = 'en'}: {onPick: (t: JournalTemplate, lang: PromptLang) => void;
  /** Session AV (1c, q4 #45): the picker starts in the language today's question is asked in. */ startLang?: PromptLang;
  /** Session AV (1c, q4 #45; Day One): an own template edited in place. */ onEditOwn?: (id: string, title: string, headingsText: string) => void;
  /** Session AV (owner follow-up 1, F-OWN-TEMPLATES): the person's own templates, kept in the journal record. */
  own?: readonly OwnTemplate[]; onAddOwn?: (title: string, headingsText: string, id: string) => void; onRemoveOwn?: (id: string) => void}) {
  const id = useId(), [lang, setLang] = useState<PromptLang>(startLang), [hiddenOpen, setHiddenOpen] = useState(false), [, again] = useState(0);
  const [making, setMaking] = useState(false), [title, setTitle] = useState(''), [headings, setHeadings] = useState(''), [problem, setProblem] = useState('');
  // Session AV (1c, q4 #45): the template being edited (null: a new one); focus goes back to its Edit button after.
  const [editing, setEditing] = useState<string | null>(null), list = useRef<HTMLUListElement>(null);
  const backTo = (ownId: string | null) => requestAnimationFrame(() => (ownId ? list.current?.querySelector<HTMLButtonElement>(`[data-edit="${CSS.escape(ownId)}"]`) : document.querySelector<HTMLButtonElement>('.prompt-picker-make'))?.focus());
  const startEdit = (t: OwnTemplate) => { setEditing(t.id); setTitle(t.title); setHeadings(t.headings.join('\n')); setProblem(''); setMaking(true); };
  const cancel = () => { const was = editing; setMaking(false); setEditing(null); setTitle(''); setHeadings(''); setProblem(''); backTo(was); };
  // Inside the journal's own form (no nested form): a group with a plain button, Enter in the name field adds nothing.
  const make = () => {
    const issue = ownTemplateIssue(title, headings, {...emptyJournal(), templates: [...own]}, {editing: !!editing});
    if (issue) { setProblem(issue); return; }
    try { if (editing) onEditOwn?.(editing, title.trim(), headings); else onAddOwn?.(title.trim(), headings, newOwnTemplateId()); } catch (cause) { setProblem(cause instanceof Error ? cause.message : 'This could not be kept on this device.'); return; }
    const was = editing; setTitle(''); setHeadings(''); setProblem(''); setMaking(false); setEditing(null); backTo(was);
  };
  return <div className="prompt-picker">
    <div className="prompt-picker-lang" role="group" aria-labelledby={`${id}-lang`}><span id={`${id}-lang`} className="fine">Language</span>
      {(['en', 'nl'] as const).map(l => <button key={l} type="button" className="secondary" aria-pressed={lang === l} onClick={() => setLang(l)}>{l === 'en' ? 'English' : 'Nederlands'}</button>)}
    </div>
    {own.length > 0 && <ul ref={list} className="prompt-picker-list" aria-label="Your own templates">{own.map(t => <li key={t.id} className="prompt-picker-own">
      <button type="button" className="prompt-picker-card" onClick={() => onPick(asJournalTemplate(t), lang)}><strong dir="auto">{t.title}</strong><span className="fine" dir="auto">{t.headings.join(' · ')}</span></button>
      {onEditOwn && <button type="button" className="text-link" data-edit={t.id} aria-label={`Edit your template “${t.title}”`} aria-expanded={editing === t.id} onClick={() => startEdit(t)}>Edit</button>}
      {onRemoveOwn && <button type="button" className="text-link" aria-label={`Remove your template “${t.title}”`} onClick={() => { onRemoveOwn(t.id); showUndo({message: `Your template “${t.title}” removed.`, undone: `“${t.title}” is back.`, restore: () => onAddOwn?.(t.title, t.headings.join('\n'), t.id)}); }}>Remove</button>}
    </li>)}</ul>}
    {onAddOwn && (!making ? <button type="button" className="secondary prompt-picker-make" onClick={() => setMaking(true)}>Make your own template</button>
      : <div className="prompt-picker-form" role="group" aria-label={editing ? 'Edit your template' : 'Make your own template'} onKeyDown={e => { if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); cancel(); } }}>
        <label className="field"><span>Name</span><input autoFocus={!!editing} value={title} maxLength={OWN_TITLE_MAX} placeholder="Run diary" onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); make(); } }} onChange={e => { setTitle(e.target.value); setProblem(''); }}/></label>
        <label className="field"><span>Headings, one per line (up to six)</span><textarea rows={4} value={headings} placeholder={'How it went:\nWhat I noticed:'} onChange={e => { setHeadings(e.target.value); setProblem(''); }}/></label>
        <p className="fine">{readHeadings(headings).length} of 6 headings. Kept in your journal on this device.</p>
        <div className="prompt-picker-form-actions"><button type="button" className="secondary" onClick={make}>{editing ? 'Save the template' : 'Keep this template'}</button><button type="button" className="quiet" onClick={cancel}>Cancel</button></div>
        {problem && <p className="field-error" role="alert">{problem}</p>}
      </div>)}
    <ul className="prompt-picker-list" aria-label="Prompts">{JOURNAL_TEMPLATES.filter(t => !mutedNow().templates.has(t.id)).map(t => <li key={t.id}>
      <button type="button" className="prompt-picker-card" lang={lang} onClick={() => onPick(t, lang)}>
        <strong>{t.title[lang]}</strong>
        <span className="fine">{t.headings[lang].join(' · ')}</span>
        {t.note && <span className="fine prompt-picker-note">{t.note[lang]}</span>}
      </button>
    </li>)}</ul>
    {/* Session AV lane 2 (LEDGER #56): hidden questions, templates and breathing patterns, brought back here. */}
    <details className="muted-fold" onToggle={e => { setHiddenOpen((e.currentTarget as HTMLDetailsElement).open); again(n => n + 1); }}><summary>Hidden prompts and exercises</summary>{hiddenOpen && <Suspense fallback={null}><MutedPanel lang={lang} /></Suspense>}</details>
  </div>;
}
