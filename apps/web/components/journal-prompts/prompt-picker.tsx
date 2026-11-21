'use client';
import {useId, useState} from 'react';
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
export default function PromptPicker({onPick, own = [], onAddOwn, onRemoveOwn}: {onPick: (t: JournalTemplate, lang: PromptLang) => void;
  /** Session AV (owner follow-up 1, F-OWN-TEMPLATES): the person's own templates, kept in the journal record. */
  own?: readonly OwnTemplate[]; onAddOwn?: (title: string, headingsText: string, id: string) => void; onRemoveOwn?: (id: string) => void}) {
  const id = useId(), [lang, setLang] = useState<PromptLang>('en');
  const [making, setMaking] = useState(false), [title, setTitle] = useState(''), [headings, setHeadings] = useState(''), [problem, setProblem] = useState('');
  // Inside the journal's own form (no nested form): a group with a plain button, Enter in the name field adds nothing.
  const make = () => {
    const issue = ownTemplateIssue(title, headings, {...emptyJournal(), templates: [...own]});
    if (issue) { setProblem(issue); return; }
    try { onAddOwn?.(title.trim(), headings, newOwnTemplateId()); } catch (cause) { setProblem(cause instanceof Error ? cause.message : 'This could not be kept on this device.'); return; }
    setTitle(''); setHeadings(''); setProblem(''); setMaking(false);
  };
  return <div className="prompt-picker">
    <div className="prompt-picker-lang" role="group" aria-labelledby={`${id}-lang`}><span id={`${id}-lang`} className="fine">Language</span>
      {(['en', 'nl'] as const).map(l => <button key={l} type="button" className="secondary" aria-pressed={lang === l} onClick={() => setLang(l)}>{l === 'en' ? 'English' : 'Nederlands'}</button>)}
    </div>
    {own.length > 0 && <ul className="prompt-picker-list" aria-label="Your own templates">{own.map(t => <li key={t.id} className="prompt-picker-own">
      <button type="button" className="prompt-picker-card" onClick={() => onPick(asJournalTemplate(t), lang)}><strong dir="auto">{t.title}</strong><span className="fine" dir="auto">{t.headings.join(' · ')}</span></button>
      {onRemoveOwn && <button type="button" className="text-link" aria-label={`Remove your template “${t.title}”`} onClick={() => { onRemoveOwn(t.id); showUndo({message: `Your template “${t.title}” removed.`, undone: `“${t.title}” is back.`, restore: () => onAddOwn?.(t.title, t.headings.join('\n'), t.id)}); }}>Remove</button>}
    </li>)}</ul>}
    {onAddOwn && (!making ? <button type="button" className="secondary prompt-picker-make" onClick={() => setMaking(true)}>Make your own template</button>
      : <div className="prompt-picker-form" role="group" aria-label="Make your own template">
        <label className="field"><span>Name</span><input value={title} maxLength={OWN_TITLE_MAX} placeholder="Run diary" onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); make(); } }} onChange={e => { setTitle(e.target.value); setProblem(''); }}/></label>
        <label className="field"><span>Headings, one per line (up to six)</span><textarea rows={4} value={headings} placeholder={'How it went:\nWhat I noticed:'} onChange={e => { setHeadings(e.target.value); setProblem(''); }}/></label>
        <p className="fine">{readHeadings(headings).length} of 6 headings. Kept in your journal on this device.</p>
        <div className="prompt-picker-form-actions"><button type="button" className="secondary" onClick={make}>Keep this template</button><button type="button" className="quiet" onClick={() => { setMaking(false); setProblem(''); }}>Cancel</button></div>
        {problem && <p className="field-error" role="alert">{problem}</p>}
      </div>)}
    <ul className="prompt-picker-list" aria-label="Prompts">{JOURNAL_TEMPLATES.map(t => <li key={t.id}>
      <button type="button" className="prompt-picker-card" lang={lang} onClick={() => onPick(t, lang)}>
        <strong>{t.title[lang]}</strong>
        <span className="fine">{t.headings[lang].join(' · ')}</span>
        {t.note && <span className="fine prompt-picker-note">{t.note[lang]}</span>}
      </button>
    </li>)}</ul>
  </div>;
}
