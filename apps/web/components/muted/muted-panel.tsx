'use client';
import {useEffect, useRef, useState} from 'react';
import {DAILY_QUESTIONS, DAILY_QUESTIONS_NL} from '../../lib/journal-prompts/daily';
import {JOURNAL_TEMPLATES} from '../../lib/journal-prompts/templates';
import {PATTERNS} from '../../lib/meditation/breathing';
import {BREATHING_PATTERNS} from '../../lib/meditation/schema';
import {mutedNow, type Muted, type MutedKind} from '../../lib/muted/rule';
import {setMuted} from '../../lib/muted/write';
import {ZIGI_STORE_EVENT} from '../../lib/ai/store/keys';
import './muted-panel.css';

/**
 * Session AV lane 2 (habits; LEDGER #56, Finch's muted tags and exercises): one list of what is not offered — the daily
 * journal questions hidden with "Don't ask this again", the ready journal templates and the breathing patterns, each a
 * checkbox "Hidden". The same list from the Journal's prompts and from Breathe with a guide (`kinds` picks what is
 * shown there). Kept in this device's habit extras; focus stays on the checkbox.
 */
export default function MutedPanel({kinds = ['questions', 'templates', 'breathing'], lang = 'en'}: {kinds?: readonly MutedKind[]; lang?: 'en' | 'nl'}) {
  const [muted, setMutedState] = useState<Muted>(() => mutedNow()), [said, setSaid] = useState('');
  useEffect(() => { const again = () => setMutedState(mutedNow()); window.addEventListener(ZIGI_STORE_EVENT, again); window.addEventListener('storage', again); return () => { window.removeEventListener(ZIGI_STORE_EVENT, again); window.removeEventListener('storage', again); }; }, []);
  const flip = (kind: MutedKind, id: number | string, on: boolean, name: string) => {
    try { setMuted(kind, id, on); setMutedState(mutedNow()); setSaid(on ? `Hidden: ${name}.` : `Offered again: ${name}.`); }
    catch { setSaid('This could not be saved on this device.'); }
  };
  const questions = lang === 'nl' ? DAILY_QUESTIONS_NL : DAILY_QUESTIONS;
  // A question brought back stays listed (unticked) until the panel closes, so focus never falls off the list.
  const seen = useRef(new Set<number>()); for (const i of muted.questions) seen.current.add(i);
  return <div className="muted-panel">
    {kinds.includes('questions') && <fieldset className="muted-group"><legend>Hidden daily questions (untick to ask again)</legend>
      {seen.current.size ? [...seen.current].sort((a, b) => a - b).filter(i => i < questions.length).map(i => <label key={i} className="checkbox muted-item"><input type="checkbox" checked={muted.questions.has(i)} onChange={e => flip('questions', i, e.target.checked, `“${questions[i]}”`)}/><span lang={lang}>{questions[i]}</span></label>)
        : <p className="fine">None. “Don’t ask this again” under today’s question hides one; it shows here to bring back.</p>}
    </fieldset>}
    {kinds.includes('templates') && <fieldset className="muted-group"><legend>Hide these ready templates</legend>
      {JOURNAL_TEMPLATES.map(t => <label key={t.id} className="checkbox muted-item"><input type="checkbox" checked={muted.templates.has(t.id)} onChange={e => flip('templates', t.id, e.target.checked, t.title[lang])}/><span lang={lang}>{t.title[lang]}</span></label>)}
    </fieldset>}
    {kinds.includes('breathing') && <fieldset className="muted-group"><legend>Hide these breathing patterns</legend>
      {BREATHING_PATTERNS.map(p => <label key={p} className="checkbox muted-item"><input type="checkbox" checked={muted.breathing.has(p)} onChange={e => flip('breathing', p, e.target.checked, PATTERNS[p].label)}/><span>{PATTERNS[p].label}</span></label>)}
      {muted.breathing.size >= BREATHING_PATTERNS.length && <p className="fine">With every pattern hidden, all of them are offered.</p>}
    </fieldset>}
    <p className="fine" role="status">{said}</p>
  </div>;
}
