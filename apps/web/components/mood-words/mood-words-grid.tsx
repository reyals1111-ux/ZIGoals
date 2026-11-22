'use client';
import Link from 'next/link';
import {Suspense, lazy, useEffect, useId, useRef, useState} from 'react';
import {ENERGY} from '../../lib/energy/schema';
import {QUADRANTS, clearFeeling, nextStepFor, nextStepLink, quadrantOfWord, setFeeling, walkHabit, type NextStep, type QuadrantId} from '../../lib/mood-words/words';
import {habitRuleOn} from '../../lib/habits';
import {useDeviceRecord} from '../ai/use-device-record';
import {useHabits} from '../habits/use-habits';
import './mood-words.css';
import {wordsOf} from '../../lib/mood-words/schema';
// Session AV lane 2 (LEDGER #61, Bearable): the person's own feeling words, added to a corner and kept on this device.
import {readCheckin, setOwnFeeling, setOwnWord, type QuadrantKey} from '../../lib/checkin-extras/rule';
// Session AV lane 2 (bodymind-r2; LEDGER #232, Moodnotes): up to three words a day, each with a strength.
import {addMoreWord, feelingsOn, keepMore, removeMoreWord, setStrength, STRENGTH_WORDS} from '../../lib/mood-words/more';
import {MAX_MORE_WORDS, STRENGTHS, type Strength} from '../../lib/mood-words/schema';
// Session AV lane 2 (r4-mind; LEDGER #324, #325, #326, How We Feel): what each word means (and a line of your own for
// your own words), choices that may help, and where you feel it — the last two their own chunks.
import {OWN_MEANING_MAX, meaningOf, ownMeanings, setOwnMeaning} from '../../lib/mood-words/meanings';
import {keepBody} from '../../lib/mood-words/body';
const FeelingChoices = lazy(() => import('./feeling-choices'));
const MoodBody = lazy(() => import('./mood-body'));

/**
 * Session AK (lane S, item 6): the grid itself. Two axes (energy up, pleasantness right) make four labelled quadrants; a
 * quadrant opens its twelve words; one tap on a word saves {energy, pleasantness, word} for the day in the energy record
 * (zigoals:energy:v1 `words`). An unpleasant word offers at most one small next step into an existing feature.
 */
export default function MoodWordsGrid({day, onClose}: {day: string; onClose: () => void}) {
  const energy = useDeviceRecord(ENERGY), id = useId();
  const current = wordsOf(energy.data)[day]?.word ?? null;
  const [quadrant, setQuadrant] = useState<QuadrantId | null>(() => (current ? quadrantOfWord(current)?.id : null) ?? null), [status, setStatus] = useState('');
  const words = useRef<HTMLDivElement>(null), [own, setOwn] = useState(''), [adding, setAdding] = useState(false);
  const [showMeanings, setShowMeanings] = useState(false), [meaningDraft, setMeaningDraft] = useState<string | null>(null), press = useRef<{word: string; timer: number; long: boolean} | null>(null);
  const mine = ownMeanings(energy.data);
  /** LEDGER #324: a long press on a word says what it means (the tap after it does not pick the word). */
  const holdStart = (word: string) => { const m = meaningOf(word) ?? mine[word]; if (!m) return; const timer = window.setTimeout(() => { if (press.current) press.current.long = true; setStatus(`${word}: ${m}.`); }, 500); press.current = {word, timer, long: false}; };
  const holdEnd = () => { if (press.current) window.clearTimeout(press.current.timer); };
  const wasLong = (word: string) => { const p = press.current; press.current = null; return !!p && p.word === word && p.long; };
  const saveMeaning = (word: string) => { try { energy.update(r => setOwnMeaning(r, word, meaningDraft ?? '')); setStatus(meaningDraft?.trim() ? `What “${word}” means to you is kept.` : `The line for “${word}” is removed.`); setMeaningDraft(null); } catch (cause) { setStatus(cause instanceof Error ? cause.message : 'This could not be saved on this device.'); } };
  const feelings = feelingsOn(energy.data, day), more = feelings.filter(f => !f.main);
  /** Session AV lane 2 (bodymind-r2; LEDGER #232): in "add another" mode a tapped word joins the day instead of replacing it. */
  const addAnother = (word: string) => {
    try { energy.update(r => addMoreWord(r, day, word)); setStatus(`Also feeling: ${word}. Kept on this device.`); setAdding(false); }
    catch (cause) { setStatus(cause instanceof Error ? cause.message : 'This could not be saved on this device.'); }
  };
  const strength = (word: string, s: Strength | null) => { try { energy.update(r => setStrength(r, day, word, s)); setStatus(s ? `${word}: ${STRENGTH_WORDS[s].en}.` : `${word}: no strength.`); } catch { setStatus('This could not be changed on this device.'); } };
  const dropMore = (word: string) => { try { energy.update(r => removeMoreWord(r, day, word)); setStatus(`“${word}” is no longer one of today’s words.`); } catch { setStatus('This could not be changed on this device.'); } };
  const ownWords = readCheckin(energy.data).ownWords;
  const pickOwn = (word: string, qid: QuadrantKey) => {
    if (adding && current) { addAnother(word); return; }
    try { energy.update(r => keepBody(r, keepMore(r, setOwnFeeling(r, day, word, qid, new Date().toISOString()), day), day)); setStatus(`Feeling today: ${word}. Kept on this device.`); }
    catch { setStatus('This could not be saved on this device.'); }
  };
  const addOwn = (qid: QuadrantKey) => {
    const w = own.trim();
    if (!w) { setStatus('Type a word first.'); return; }
    // Session AV lane 2 (bodymind-r2; LEDGER #232): while adding another word, the new own word joins the day.
    if (adding && current) { try { energy.update(r => addMoreWord(setOwnWord(r, qid, w, true), day, w)); setOwn(''); setAdding(false); setStatus(`Your own word “${w}” is added, and also chosen for today.`); } catch (cause) { setStatus(cause instanceof Error ? cause.message : 'This could not be saved on this device.'); } return; }
    try { energy.update(r => keepBody(r, keepMore(r, setOwnFeeling(setOwnWord(r, qid, w, true), day, w, qid, new Date().toISOString()), day), day)); setOwn(''); setStatus(`Your own word “${w}” is added and chosen for today.`); }
    catch (cause) { setStatus(cause instanceof Error ? cause.message : 'This could not be saved on this device.'); }
  };
  const dropOwn = (word: string, qid: QuadrantKey) => { try { energy.update(r => setOwnWord(r, qid, word, false)); setStatus(`“${word}” is no longer in your words. Days that used it keep it.`); requestAnimationFrame(() => words.current?.querySelector<HTMLInputElement>('input')?.focus()); } catch { setStatus('This could not be changed on this device.'); } };
  useEffect(() => { if (quadrant) words.current?.querySelector<HTMLButtonElement>('button')?.focus(); }, [quadrant]);
  const pick = (word: string) => {
    if (adding && current) { addAnother(word); return; }
    try { energy.update(r => keepBody(r, keepMore(r, setFeeling(r, day, word, new Date().toISOString()), day), day)); setStatus(`Feeling today: ${word}. Kept on this device.`); }
    catch { setStatus('This could not be saved on this device.'); }
  };
  const remove = () => { try { energy.update(r => clearFeeling(r, day)); setStatus('The feeling word is removed.'); setQuadrant(null); } catch { setStatus('This could not be changed on this device.'); } };
  const q = QUADRANTS.find(x => x.id === quadrant), step = current ? nextStepFor(current) : null;
  // The grid reads top row high energy, bottom row low; left unpleasant, right pleasant.
  const order: QuadrantId[] = ['high-unpleasant', 'high-pleasant', 'low-unpleasant', 'low-pleasant'];
  return <section className="mood-words" aria-labelledby={`${id}-title`}>
    <h3 id={`${id}-title`} className="mood-words-title">A word for how it feels</h3>
    <div className="mood-words-axes">
      <span className="mood-words-axis is-y" aria-hidden="true">Energy ↑</span>
      <div className="mood-words-quadrants" role="group" aria-label="Choose a corner: energy and how pleasant it feels">
        {order.map(qid => { const x = QUADRANTS.find(y => y.id === qid)!; return <button key={qid} type="button" className="mood-words-quadrant" data-quadrant={qid} aria-pressed={quadrant === qid} onClick={() => setQuadrant(qid)}>{x.title}</button>; })}
      </div>
      <span className="mood-words-axis is-x" aria-hidden="true">Pleasant →</span>
    </div>
    {q && <div className="mood-words-list" ref={words} role="group" aria-label={`Words: ${q.title}`} data-quadrant={q.id}>
      <p className="mood-words-meanings-toggle"><button type="button" className="text-link" aria-pressed={showMeanings} onClick={() => setShowMeanings(v => !v)}>{showMeanings ? 'Hide what the words mean' : 'What the words mean'}</button> <span className="fine">· or press and hold a word</span></p>
      {q.words.map(w => <span key={w} className={showMeanings ? 'mood-words-item is-open' : 'mood-words-item'}><button type="button" className="mood-words-word" aria-pressed={current === w} aria-describedby={showMeanings ? `${id}-m-${w.replace(/\s/g, '-')}` : undefined} onPointerDown={() => holdStart(w)} onPointerUp={holdEnd} onPointerLeave={holdEnd} onContextMenu={e => { if (press.current?.long) e.preventDefault(); }} onClick={() => { if (!wasLong(w)) pick(w); }}>{w}</button>{showMeanings && <small id={`${id}-m-${w.replace(/\s/g, '-')}`} className="mood-words-meaning">{meaningOf(w)}</small>}</span>)}
      {ownWords[q.id].map(w => <span key={`own-${w}`} className={showMeanings ? 'mood-words-own mood-words-item is-open' : 'mood-words-own'}><button type="button" className="mood-words-word" aria-pressed={current === w} onPointerDown={() => holdStart(w)} onPointerUp={holdEnd} onPointerLeave={holdEnd} onClick={() => { if (!wasLong(w)) pickOwn(w, q.id); }}>{w}</button><button type="button" className="text-link" aria-label={`Remove your word “${w}”`} onClick={() => dropOwn(w, q.id)}>×</button>{showMeanings && mine[w] && <small className="mood-words-meaning">{mine[w]}</small>}</span>)}
      {ownWords[q.id].length < 12 && <span className="mood-words-add"><label className="field"><span>Your own word</span><input type="text" value={own} maxLength={32} autoComplete="off" onChange={e => setOwn(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addOwn(q.id); } }}/></label><button type="button" className="secondary" onClick={() => addOwn(q.id)}>Add</button></span>}
    </div>}
    {/* Session AV lane 2 (bodymind-r2; LEDGER #232, Moodnotes): each of the day's words with its strength, up to three. */}
    {current && <div className="mood-words-strengths" role="group" aria-label="Today’s words and how strong each feels">
      {feelings.map(f => <div key={f.word} className="mood-words-strength-row" role="group" aria-label={`How strong: ${f.word}`}>
        <span className="mood-words-strength-word">{f.word}</span>
        {STRENGTHS.map(s => <button key={s} type="button" className="mood-words-strength" aria-pressed={f.strength === s} onClick={() => strength(f.word, f.strength === s ? null : s)}>{STRENGTH_WORDS[s].en}</button>)}
        {!f.main && <button type="button" className="text-link" aria-label={`Remove “${f.word}” from today`} onClick={() => dropMore(f.word)}>Remove</button>}
      </div>)}
      {more.length < MAX_MORE_WORDS && <p className="mood-words-another">{adding ? <><span className="fine">Tap a word above to add it as another feeling.</span> <button type="button" className="text-link" onClick={() => setAdding(false)}>Cancel</button></>
        : <button type="button" className="secondary" onClick={() => { setAdding(true); if (!quadrant) setQuadrant(quadrantOfWord(current)?.id ?? null); setStatus(''); }}>Add another word</button>}</p>}
    </div>}
    {/* Session AV lane 2 (r4-mind; LEDGER #324): the day's word and what it means; your own word gets a line of your own. */}
    {current && (meaningOf(current) ? <p className="fine mood-words-chosen-meaning"><strong>{current}</strong>: {meaningOf(current)}.</p>
      : meaningDraft !== null ? <form className="mood-words-own-meaning" aria-label={`What “${current}” means to you`} onSubmit={e => { e.preventDefault(); saveMeaning(current); }}>
          <label className="field"><span>What “{current}” means to you</span><input type="text" autoFocus maxLength={OWN_MEANING_MAX} value={meaningDraft} onChange={e => setMeaningDraft(e.target.value)} onKeyDown={e => { if (e.key === 'Escape') { e.preventDefault(); setMeaningDraft(null); } }}/></label>
          <span className="mood-words-own-meaning-actions"><button type="submit" className="secondary">Save</button><button type="button" className="quiet" onClick={() => setMeaningDraft(null)}>Cancel</button></span>
        </form>
      : <p className="fine mood-words-chosen-meaning"><strong>{current}</strong>{mine[current] ? <>: {mine[current]}. </> : '. '}<button type="button" className="text-link" onClick={() => setMeaningDraft(mine[current] ?? '')}>{mine[current] ? 'Change what it means to you' : 'Add what it means to you'}</button></p>)}
    <p className="fine" role="status" aria-live="polite">{status}</p>
    {/* Session AV lane 2 (r4-mind; LEDGER #325, #326): choices that may help (the one small step first), and where you feel it. */}
    {current && <Suspense fallback={step ? <NextStepLink step={step}/> : null}><FeelingChoices word={current} day={day} quadrant={(quadrantOfWord(current)?.id ?? (Object.keys(ownWords) as QuadrantKey[]).find(k => ownWords[k].includes(current)) ?? null) as QuadrantId | null}/></Suspense>}
    {current && <details className="mood-words-body-fold"><summary>Where do you feel it? <span className="fine">· optional</span></summary><Suspense fallback={<p className="fine">Opening…</p>}><MoodBody day={day}/></Suspense></details>}
    <p className="mood-words-actions">{current && <button type="button" className="text-link" onClick={remove}>Remove the word</button>}<button type="button" className="text-link" onClick={onClose}>Done</button></p>
  </section>;
}

function NextStepLink({step}: {step: NextStep}) {
  return step === 'walk' ? <WalkStep/> : <StepLink step={step} walkId={null}/>;
}
function WalkStep() {
  const habits = useHabits();
  const walk = habits.loaded && !habits.error ? walkHabit(habits.data.habits.filter(h => habitRuleOn(h, habits.today)?.state !== 'archived')) : undefined;
  return <StepLink step="walk" walkId={walk?.id ?? null}/>;
}
function StepLink({step, walkId}: {step: NextStep; walkId: string | null}) {
  const link = nextStepLink(step, walkId);
  return <p className="mood-words-step"><span className="fine">One small step, if you like:</span>{' '}
    {link.fullLoad ? <a className="secondary" href={link.href}>{link.label}</a> /* a full load on purpose: Health's camera and Bluetooth policy applies to its own document */
      : <Link className="secondary" href={link.href}>{link.label}</Link>}
  </p>;
}
