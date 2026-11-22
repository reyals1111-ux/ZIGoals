'use client';
import {PROMPT_PACKS, type PackLang} from '../../lib/journal-prompts/packs';
import './prompt-packs.css';

/**
 * Session AV lane 2 (journal; LEDGER #38, Day One's Prompt Packs): the packs to switch on — each with its words and its
 * questions, any of which goes into the entry with one press. A switched-on pack's questions take turns with the
 * everyday ones as today's question. In the question's language (English or Dutch). Loaded when its fold opens.
 */
export default function PromptPacks({on, lang, onToggle, onUse}: {on: readonly string[]; lang: PackLang; onToggle: (id: string, on: boolean) => void; onUse: (question: string) => void}) {
  return <div className="prompt-packs">
    <p className="fine">Switch a pack on and its questions take turns with the everyday ones as today&rsquo;s question. Or use one now.</p>
    <ul className="prompt-packs-list" aria-label="Prompt packs">{PROMPT_PACKS.map(p => <li key={p.id} className="prompt-pack">
      <label className="switch-row"><input type="checkbox" checked={on.includes(p.id)} onChange={e => onToggle(p.id, e.target.checked)}/> <span><strong lang={lang}>{p.title[lang]}</strong> <span className="fine" lang={lang}>· {p.blurb[lang]}</span></span></label>
      <details className="prompt-pack-questions"><summary>Its questions <span className="fine">· {p.questions[lang].length}</span></summary>
        <ul className="prompt-pack-question-list">{p.questions[lang].map(q => <li key={q}><button type="button" className="prompt-picker-card" lang={lang} aria-label={`Use this question: ${q}`} onClick={() => onUse(q)}><span>{q}</span></button></li>)}</ul>
      </details>
    </li>)}</ul>
  </div>;
}
