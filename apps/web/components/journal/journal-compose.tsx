'use client';
import Link from 'next/link';
import {Suspense, lazy, useEffect, useId, useMemo, useState, type FormEvent} from 'react';
import {useDeviceRecord} from '../ai/use-device-record';
import {localDate} from '../../lib/local-date';
import {ENERGY, ENERGY_WORDS, rateEnergy} from '../../lib/energy/schema';
import {JOURNAL, MAX_TEXT, type JournalEntry} from '../../lib/journal/schema';
import {followUpFor, patternLine, patterns} from '../../lib/journal/reflect';
import {lineLanguage} from '../../lib/quick-log/multi';
import {zigiSignals} from '../zigi/bus';
import './journal.css';
// Session AK (lane S, item 6): the optional feeling word after the 1–5 (its grid loads when opened).
import {MoodWordsFold} from '../mood-words/mood-words-fold';
// Session AK (BUILD list 2 #1): a calm line while a note looks like recovery words or a key.
import {SecretGuard} from '../secret-guard/secret-guard';
// Session AK (BUILD list 2 #13, lane G1a): "Start from a prompt" (its list loads when the fold opens).
import {onlyHeadings, startFrom, templateById, type PromptLang} from '../../lib/journal-prompts/templates';
import {questionOfTheDay, withQuestion} from '../../lib/journal-prompts/daily';
// Session AV lane 2 (LEDGER #38): the packs' words load only once a pack is on (types only here).
import type {PromptPack} from '../../lib/journal-prompts/packs';
type PacksModule = typeof import('../../lib/journal-prompts/packs');
import {readTags, tagCounts} from '../../lib/journal/tags';
import {setQuestionLang, useQuestionLang} from './question-lang';
import {addOwnTemplate, editOwnTemplate, removeOwnTemplate} from '../../lib/journal-prompts/own';
const PromptPicker = lazy(() => import('../journal-prompts/prompt-picker'));
// Session AV lane 2 (journal; LEDGER #38, Day One's Prompt Packs): the packs, their list loaded when the fold opens.
const PromptPacks = lazy(() => import('../journal-prompts/prompt-packs'));
// Session AV (follow-up 1, F-GOOD-THINGS): three good things in one go, its own chunk.
const ThreeGoodThings = lazy(() => import('./three-good-things'));

/**
 * Session AI (feature 6, the journal and the daily energy rating): today's energy (1–5) in one tap, a few lines of
 * journal, then ZIGi's ONE follow-up question (made on this device from what the entry says; never advice), with room to
 * answer it. Private by default; nothing here is sent anywhere. Used on Today (a For you card) and on the Journal page.
 */
export function JournalCompose({compact = false, book = null}: {compact?: boolean; /** Session AV lane 2 (LEDGER #43): the journal a new entry goes in (the one the list shows). */ book?: string | null}) {
  const journal = useDeviceRecord(JOURNAL), energy = useDeviceRecord(ENERGY), today = localDate(), id = useId();
  const [prompt, setPrompt] = useState<{id: string; lang: PromptLang} | null>(null), [prompts, setPrompts] = useState(false);
  // Session AV Part 7 (F-PROMPT): today's question, and how many times "Another question" was pressed.
  const [step, setStep] = useState(0), qLang = useQuestionLang(); // Session AV (F-OWN-TEMPLATES): the question in Dutch too
  const [tagText, setTagText] = useState(''); // Session AV (follow-up 1, F-JOURNAL-TAGS): tags as the entry is written
  // Session AV lane 2 (journal; LEDGER #43, Day One): the journal this entry goes in (null: the main Journal).
  const [chosenBook, setChosenBook] = useState<string | null | undefined>(undefined);
  const books = journal.data.journals ?? [], target = (chosenBook === undefined ? book : chosenBook) ?? null, inBook = target && books.some(b => b.id === target) ? target : null;
  const [text, setText] = useState(''), [problem, setProblem] = useState(''), [status, setStatus] = useState(''), [asked, setAsked] = useState<string | null>(null), [answer, setAnswer] = useState('');
  const todayEnergy = energy.data.days[today]?.energy ?? null;
  const [packsOpen, setPacksOpen] = useState(false), [packs, setPacks] = useState<PacksModule | null>(null), packIds = journal.data.packs;
  useEffect(() => { if (compact || packs || !(packIds ?? []).length) return; let live = true; void import('../../lib/journal-prompts/packs').then(m => { if (live) setPacks(m); }, () => undefined); return () => { live = false; }; }, [compact, packs, packIds]);
  const todayQ: {question: string; pack: PromptPack | null} = packs && (packIds ?? []).length ? packs.questionWithPacks(today, step, qLang, packIds) : {question: questionOfTheDay(today, step, qLang), pack: null};
  const tagOffers = useMemo(() => {
    if (compact) return [];
    const typed = readTags(tagText).map(t => t.toLowerCase()), head = tagText.includes(',') ? `${tagText.slice(0, tagText.lastIndexOf(',') + 1).trim()} ` : '';
    return tagCounts(journal.data.entries).map(t => t.tag).filter(t => !typed.includes(t.toLowerCase())).slice(0, 30).map(t => `${head}${t}`);
  }, [compact, tagText, journal.data.entries]);
  const pattern = useMemo(() => { const p = patterns(journal.data, energy.data)[0]; return p ? patternLine(p, 'en') : null; }, [journal.data, energy.data]);
  const rate = (n: number) => { try { energy.update(current => rateEnergy(current, today, n, new Date().toISOString())); setStatus(`Energy today: ${ENERGY_WORDS.en[n - 1]}.`); } catch { setStatus('This could not be saved on this device.'); } };
  const save = (event: FormEvent) => {
    event.preventDefault(); setProblem('');
    const words = text.trim();
    if (!words) return setProblem('Write a few words first.');
    if (prompt && onlyHeadings(words)) return setProblem('Write a few words under the headings first.');
    const tags = compact ? [] : readTags(tagText);
    const entry: JournalEntry = {id: crypto.randomUUID(), date: today, text: words.slice(0, MAX_TEXT), createdAt: new Date().toISOString(), ...(prompt ? {template: prompt.id} : {}), ...(tags.length ? {tags} : {}), ...(inBook && !compact ? {journal: inBook} : {})};
    const question = journal.data.followUps ? followUpFor(entry, journal.data.entries, lineLanguage(words)) : null;
    try { journal.update(current => ({...current, entries: [...current.entries, {...entry, ...(question ? {followUp: {question, from: 'device' as const}} : {})}].slice(-5000)})); } catch { return setProblem('This could not be saved on this device. Nothing was changed.'); }
    setText(''); setTagText(''); setPrompt(null); setStatus('Saved in your journal, on this device.'); setAsked(question ? entry.id : null); setAnswer('');
    if (question) zigiSignals.emit('journal_reflecting'); // Session AK Part 12: ZIGi asks its one question (a Studio-4 reaction once its art lands)
  };
  const pending = asked ? journal.data.entries.find(e => e.id === asked) : null;
  const saveAnswer = (event: FormEvent) => {
    event.preventDefault();
    if (!pending || !answer.trim()) return;
    journal.update(current => ({...current, entries: current.entries.map(e => e.id === pending.id && e.followUp ? {...e, followUp: {...e.followUp, answer: answer.trim().slice(0, 2000), answeredAt: new Date().toISOString()}} : e)}));
    setAsked(null); setAnswer(''); setStatus('Your answer is with the entry.');
  };
  if (!journal.loaded || !energy.loaded) return <p className="fine">Loading your journal…</p>;
  return <div className={`journal-compose${compact ? ' journal-compose-compact' : ''}`}>
    <fieldset className="journal-energy"><legend>Energy today</legend>
      {[1, 2, 3, 4, 5].map(n => <label key={n} className="journal-energy-dot" title={ENERGY_WORDS.en[n - 1]}><input type="radio" name={`${id}-energy`} checked={todayEnergy === n} onChange={() => rate(n)}/><span aria-hidden="true">{n}</span><span className="sr-only">{n} of 5, {ENERGY_WORDS.en[n - 1]}</span></label>)}
      <span className="fine journal-energy-word">{todayEnergy ? ENERGY_WORDS.en[todayEnergy - 1] : '1 drained · 5 full of energy'}</span>
    </fieldset>
    {todayEnergy !== null && <MoodWordsFold day={today}/>}
    {/* Session AV (1c, q4 #4, fresh-agent review; Day One, Finch): "Three good things" open at the top of Write, one step. */}
    {!compact && !pending && <Suspense fallback={null}><ThreeGoodThings/></Suspense>}
    {!pending && <form onSubmit={save} aria-label="Write in your journal">
      {/* Session AV Part 7 (ADR-045 F-PROMPT): one question a day (lib/journal-prompts/daily.ts); using it only writes it into the text. */}
      {!compact && !text.trim() && <div className="journal-today-question" role="group" aria-label="Today’s question"><p><span className="fine">Today’s question{todayQ.pack ? <> · <span lang={qLang}>{todayQ.pack.title[qLang]}</span> pack</> : null}</span> <strong lang={qLang}>{todayQ.question}</strong></p>
        <div className="journal-today-question-actions"><button type="button" className="secondary" onClick={() => setText(current => withQuestion(current, todayQ.question))}>Use this question</button><button type="button" className="quiet" onClick={() => setStep(n => n + 1)}>Another question</button><button type="button" className="quiet" lang={qLang === 'en' ? 'nl' : 'en'} onClick={() => setQuestionLang(qLang === 'en' ? 'nl' : 'en')}>{qLang === 'en' ? 'In het Nederlands' : 'In English'}</button></div></div>}
      <label className="field"><span>{compact ? 'A few lines about today' : 'Today’s entry'}</span><textarea rows={compact ? 3 : 5} maxLength={MAX_TEXT} value={text} onChange={e => setText(e.target.value)} placeholder="What stood out today?"/></label>
      {prompt && templateById(prompt.id)?.note && <p className="fine">{templateById(prompt.id)!.note![prompt.lang]}</p>}
      <SecretGuard text={text} onRemove={() => setText('')}/>
      {/* Session AV (1c, q4 #5; Day One suggests tags): the tags already in use, offered after what is typed so far. */}
      {!compact && <label className="field journal-compose-tags"><span>Tags — optional</span><input maxLength={200} autoComplete="off" list={tagOffers.length ? `${id}-known-tags` : undefined} value={tagText} onChange={e => setTagText(e.target.value)} placeholder="work, family" aria-describedby={`${id}-tags-hint`}/><small id={`${id}-tags-hint`} className="fine">Separate tags with commas; up to 8.</small></label>}
      {!compact && books.length > 0 && <label className="field journal-compose-book"><span>Journal</span><select value={inBook ?? ''} onChange={e => setChosenBook(e.target.value || null)}><option value="">Journal (main)</option>{books.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}</select></label>}
      {!compact && tagOffers.length > 0 && <datalist id={`${id}-known-tags`}>{tagOffers.map(o => <option key={o} value={o}/>)}</datalist>}
      {!compact && <details className="prompt-fold" open={prompts || undefined} onToggle={e => setPrompts((e.currentTarget as HTMLDetailsElement).open)}><summary>Start from a prompt</summary>
        {prompts && <Suspense fallback={<p className="fine">Opening…</p>}><PromptPicker startLang={qLang} own={journal.data.templates ?? []} onEditOwn={(ownId, title, headingsText) => { journal.update(current => editOwnTemplate(current, ownId, {title, headingsText})); setStatus(`Your template “${title}” is saved.`); }} onAddOwn={(title, headingsText, newId) => journal.update(current => addOwnTemplate(current, {title, headingsText}, newId))} onRemoveOwn={ownId => journal.update(current => removeOwnTemplate(current, ownId))} onPick={(t, lang) => { setText(current => startFrom(current, t, lang)); setPrompt({id: t.id, lang}); setPrompts(false); setStatus(`Started from “${t.title[lang]}”. Write under each heading, or change anything.`); }}/></Suspense>}
      </details>}
      {!compact && <details className="prompt-fold prompt-packs-fold" open={packsOpen || undefined} onToggle={e => setPacksOpen((e.currentTarget as HTMLDetailsElement).open)}><summary>Prompt packs <span className="fine">· {(journal.data.packs ?? []).length ? `${(journal.data.packs ?? []).length} on` : 'sleep, training and more'}</span></summary>
        {packsOpen && <Suspense fallback={<p className="fine">Opening…</p>}><PromptPacks on={journal.data.packs ?? []} lang={qLang} onToggle={(packId, on) => { void import('../../lib/journal-prompts/packs').then(m => { setPacks(m); try { journal.update(c => ({...c, packs: m.withPack(c.packs, packId, on)})); setStatus(on ? 'Pack on: its questions join today’s question.' : 'Pack off.'); } catch { setStatus('This choice could not be kept on this device.'); } }, () => setStatus('The packs could not be opened. Try again.')); }} onUse={q => { setText(current => withQuestion(current, q)); setStatus('The question is in your entry. Write under it, or change anything.'); }}/></Suspense>}
      </details>}
      {problem && <p role="alert">{problem}</p>}
      <div className="journal-actions"><button type="submit" className="primary">Save entry</button>{compact && <Link className="text-link" href="/app/journal">Open your journal</Link>}{compact && <Link className="text-link" href="/app/journal#good-things">Three good things</Link>}</div>
    </form>}
    {pending?.followUp && <form className="journal-followup" onSubmit={saveAnswer} aria-label="ZIGi's question">
      {/* Session AL fourth pass (DV-190b): the same words as the saved entry ("Question for later"); it is made on this device, not by an AI chat. */}
      <p className="journal-question"><span className="eyebrow">Question for later</span> {pending.followUp.question}</p>
      <p className="fine journal-question-source">ZIGi asks this one on your device, from your entry; no AI reads it. Answer now or leave it.</p>
      <label className="field"><span>Your answer — optional</span><textarea rows={2} maxLength={2000} value={answer} onChange={e => setAnswer(e.target.value)}/></label>
      <SecretGuard text={answer} onRemove={() => setAnswer('')}/>
      <div className="journal-actions"><button type="submit" className="primary" disabled={!answer.trim()}>Save answer</button><button type="button" className="text-link" onClick={() => setAsked(null)}>Not now</button></div>
    </form>}
    <p className="journal-status" role="status" aria-live="polite">{status}</p>
    {pattern && <p className="journal-pattern"><span className="eyebrow">A pattern</span> {pattern}</p>}
  </div>;
}
