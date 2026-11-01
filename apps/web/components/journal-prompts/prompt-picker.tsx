'use client';
import {useId, useState} from 'react';
import {JOURNAL_TEMPLATES, type JournalTemplate, type PromptLang} from '../../lib/journal-prompts/templates';
import './prompt-picker.css';

/**
 * Session AK (BUILD list 2 #13, lane G1a): "Start from a prompt" in the Journal's Write box — eight templates in English
 * or Dutch, free. Picking one fills the entry with its headings (the compose keeps the person's own words above them);
 * the entry then remembers which template it began from. Loaded when its fold opens; stores nothing itself.
 */
export default function PromptPicker({onPick}: {onPick: (t: JournalTemplate, lang: PromptLang) => void}) {
  const id = useId(), [lang, setLang] = useState<PromptLang>('en');
  return <div className="prompt-picker">
    <div className="prompt-picker-lang" role="group" aria-labelledby={`${id}-lang`}><span id={`${id}-lang`} className="fine">Language</span>
      {(['en', 'nl'] as const).map(l => <button key={l} type="button" className="secondary" aria-pressed={lang === l} onClick={() => setLang(l)}>{l === 'en' ? 'English' : 'Nederlands'}</button>)}
    </div>
    <ul className="prompt-picker-list" aria-label="Prompts">{JOURNAL_TEMPLATES.map(t => <li key={t.id}>
      <button type="button" className="prompt-picker-card" lang={lang} onClick={() => onPick(t, lang)}>
        <strong>{t.title[lang]}</strong>
        <span className="fine">{t.headings[lang].join(' · ')}</span>
        {t.note && <span className="fine prompt-picker-note">{t.note[lang]}</span>}
      </button>
    </li>)}</ul>
  </div>;
}
