'use client';
import Link from 'next/link';
import {Suspense, lazy, useEffect, useId, useMemo, useRef, useState, type FormEvent} from 'react';
import {useDeviceRecord} from '../ai/use-device-record';
import {addLocalDays, localDate} from '../../lib/local-date';
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
import type {PendingMedia} from './compose-media';
// Session AK (BUILD list 2 #13, lane G1a): "Start from a prompt" (its list loads when the fold opens).
import {ALL_TEMPLATES, onlyHeadings, startFrom, templateById, type PromptLang} from '../../lib/journal-prompts/templates';
import {questionIndexOfTheDay, questionOfTheDay, withQuestion} from '../../lib/journal-prompts/daily';
// Session AV lane 2 (LEDGER #56): questions the person hid are passed over; hiding one loads its writer on the tap.
import {mutedNow} from '../../lib/muted/rule';
// Session AV lane 2 (LEDGER #38): the packs' words load only once a pack is on (types only here).
import type {PromptPack} from '../../lib/journal-prompts/packs';
type PacksModule = typeof import('../../lib/journal-prompts/packs');
import {readTags, tagCounts} from '../../lib/journal/tags';
import {periodChoices, periodWords} from '../../lib/journal/periods';
import {addDream, dreamsBook} from '../../lib/journal/dreams';
import {OPENS_WORDS, addMonths, opensOnFor, type OpensChoice} from '../../lib/journal/letters';
import {formatDate} from '../../lib/visual-format';
import {setQuestionLang, useQuestionLang} from './question-lang';
import {addOwnTemplate, asJournalTemplate, editOwnTemplate, removeOwnTemplate, withDefault} from '../../lib/journal-prompts/own';
const PromptPicker = lazy(() => import('../journal-prompts/prompt-picker'));
// Session AV lane 2 (journal; LEDGER #38, Day One's Prompt Packs): the packs, their list loaded when the fold opens.
const PromptPacks = lazy(() => import('../journal-prompts/prompt-packs'));
// Session AV (follow-up 1, F-GOOD-THINGS): three good things in one go, its own chunk.
const ThreeGoodThings = lazy(() => import('./three-good-things'));
// Session AV lane 2 (journal; LEDGER #35, #42): photos and a voice note for the entry, loaded when opened.
const ComposeMedia = lazy(() => import('./compose-media'));
// Session AV lane 2 (r3-notes; LEDGER #266, Grid Diary): a templated entry written as a grid of cards (the Mandala 3 × 3).
const ComposeGrid = lazy(() => import('./compose-grid'));
// Session AV lane 2 (r4-mind; LEDGER #308, Journey): the format bar under the entry's words, its own chunk.
const JournalFormat = lazy(() => import('./journal-format'));
const NO_MEDIA: PendingMedia = {photos: [], audio: null};

/**
 * Session AI (feature 6, the journal and the daily energy rating): today's energy (1–5) in one tap, a few lines of
 * journal, then ZIGi's ONE follow-up question (made on this device from what the entry says; never advice), with room to
 * answer it. Private by default; nothing here is sent anywhere. Used on Today (a For you card) and on the Journal page.
 */
export function JournalCompose({compact = false, book = null}: {compact?: boolean; /** Session AV lane 2 (LEDGER #43): the journal a new entry goes in (the one the list shows). */ book?: string | null}) {
  const journal = useDeviceRecord(JOURNAL), energy = useDeviceRecord(ENERGY), today = localDate(), id = useId();
  const [prompt, setPrompt] = useState<{id: string; lang: PromptLang} | null>(null), [prompts, setPrompts] = useState(false);
  // Session AV Part 7 (F-PROMPT): today's question, and how many times "Another question" was pressed.
  const [step, setStep] = useState(0), qLang = useQuestionLang(), [hidden, setHidden] = useState(0), [hiddenSaid, setHiddenSaid] = useState(''), [mutedQ, setMutedQ] = useState<ReadonlySet<number> | undefined>(undefined);
  // Session AV lane 2 (LEDGER #56): the hidden questions, read after mount (never on the server) and after each hide.
  useEffect(() => { setMutedQ(mutedNow().questions); }, [hidden]); // Session AV (F-OWN-TEMPLATES): the question in Dutch too
  const [linkDay, setLinkDay] = useState(''); // Session AV lane 2 (LEDGER #35): the day a [[link]] points to
  const [tagText, setTagText] = useState(''); // Session AV (follow-up 1, F-JOURNAL-TAGS): tags as the entry is written
  // Session AV lane 2 (journal; LEDGER #43, Day One): the journal this entry goes in (null: the main Journal).
  const [chosenBook, setChosenBook] = useState<string | null | undefined>(undefined);
  const books = journal.data.journals ?? [], target = (chosenBook === undefined ? book : chosenBook) ?? null, inBook = target && books.some(b => b.id === target) ? target : null;
  const [gridOn, setGridOn] = useState<boolean | null>(null); // null: the template's own way (the Mandala is a grid)
  // Session AV lane 2 (r3-notes; LEDGER #269, Grid Diary): the week, month or year this entry is about ('' for the day).
  const [period, setPeriod] = useState('');
  // Session AV lane 2 (r3-notes; LEDGER #278): "Write down a dream" on the sleep log opens ?dream=<the night's day>.
  const [dream, setDream] = useState<string | null>(null);
  // Session AV lane 2 (r3-notes; LEDGER #279, Stoic): a letter to open later — when it opens ('' not a letter).
  const [opens, setOpens] = useState<'' | OpensChoice | 'day'>(''), [opensDay, setOpensDay] = useState(''), [asLetter, setAsLetter] = useState(false);
  useEffect(() => { if (compact) return; try { const d = new URLSearchParams(window.location.search).get('dream'); if (d && /^\d{4}-\d{2}-\d{2}$/.test(d) && d <= today) setDream(d); } catch { /* no address */ } }, [compact, today]);
  const words = useRef<HTMLTextAreaElement>(null);
  const [text, setText] = useState(''), [problem, setProblem] = useState(''), [status, setStatus] = useState(''), [asked, setAsked] = useState<string | null>(null), [answer, setAnswer] = useState('');
  const todayEnergy = energy.data.days[today]?.energy ?? null;
  // Session AV lane 2 (journal; LEDGER #39, Day One's default template): a new entry starts from the chosen template, on
  // opening and after each save (clearing the words leaves it empty until the next entry).
  const [fillDefault, setFillDefault] = useState(true);
  const defaultTemplate = useMemo(() => { const d = journal.data.defaultTemplate; if (!d) return null; const own = (journal.data.templates ?? []).find(t => t.id === d); return own ? asJournalTemplate(own) : templateById(d); }, [journal.data.defaultTemplate, journal.data.templates]);
  useEffect(() => {
    if (compact || !fillDefault || !journal.loaded) return;
    setFillDefault(false);
    if (!defaultTemplate || text.trim()) return;
    setText(startFrom('', defaultTemplate, qLang)); setPrompt({id: defaultTemplate.id, lang: qLang});
    if (defaultTemplate.tags?.length) setTagText(defaultTemplate.tags.join(', '));
  }, [compact, fillDefault, journal.loaded, defaultTemplate, text, qLang]);
  // Session AV lane 2 (r3-notes; LEDGER #277): "Write about this" on Today's quote opens the Journal with ?quote=<id>; the
  // entry starts with the quote and its writer (its words load on that visit only).
  useEffect(() => {
    if (compact || !journal.loaded) return;
    let id: string | null = null;
    try { id = new URLSearchParams(window.location.search).get('quote'); } catch { /* no address */ }
    if (!id || !/^[a-z0-9-]{1,20}$/.test(id)) return;
    let live = true;
    void import('../../lib/journal/quotes').then(m => { const q = m.quoteById(id); if (!live || !q) return; setText(current => current.trim() && !onlyHeadings(current) ? current : `${m.quoteEntry(q, qLang)}${current}`); setStatus(`The quote is in your entry. Write what it brings up for you.`); }, () => undefined);
    return () => { live = false; };
    // On arrival only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [compact, journal.loaded]);
  const [packsOpen, setPacksOpen] = useState(false), [packs, setPacks] = useState<PacksModule | null>(null), packIds = journal.data.packs;
  useEffect(() => { if (compact || packs || !(packIds ?? []).length) return; let live = true; void import('../../lib/journal-prompts/packs').then(m => { if (live) setPacks(m); }, () => undefined); return () => { live = false; }; }, [compact, packs, packIds]);
  const todayQ: {question: string; pack: PromptPack | null} = packs && (packIds ?? []).length ? packs.questionWithPacks(today, step, qLang, packIds) : {question: questionOfTheDay(today, step, qLang, mutedQ), pack: null};
  const tagOffers = useMemo(() => {
    if (compact) return [];
    const typed = readTags(tagText).map(t => t.toLowerCase()), head = tagText.includes(',') ? `${tagText.slice(0, tagText.lastIndexOf(',') + 1).trim()} ` : '';
    return tagCounts(journal.data.entries).map(t => t.tag).filter(t => !typed.includes(t.toLowerCase())).slice(0, 30).map(t => `${head}${t}`);
  }, [compact, tagText, journal.data.entries]);
  const pattern = useMemo(() => { const p = patterns(journal.data, energy.data)[0]; return p ? patternLine(p, 'en') : null; }, [journal.data, energy.data]);
  const rate = (n: number) => { try { energy.update(current => rateEnergy(current, today, n, new Date().toISOString())); setStatus(`Energy today: ${ENERGY_WORDS.en[n - 1]}.`); } catch { setStatus('This could not be saved on this device.'); } };
  // Session AV lane 2 (journal; LEDGER #35, #42): photos and a voice note wait here until Save, then are kept on this device.
  const [media, setMedia] = useState<PendingMedia>(NO_MEDIA), [mediaOpen, setMediaOpen] = useState(false), [saving, setSaving] = useState(false);
  const hasMedia = media.photos.length > 0 || !!media.audio;
  const save = async (event?: FormEvent) => {
    event?.preventDefault(); setProblem('');
    if (saving) return;
    const words = text.trim();
    if (!words && !hasMedia) return setProblem('Write a few words first.');
    if (words && prompt && onlyHeadings(words)) return setProblem('Write a few words under the headings first.');
    { const own = prompt ? (journal.data.templates ?? []).find(t => t.id === prompt.id) : null; if (own?.body && words === own.body.trim()) return setProblem('Change the template’s words to today’s first.'); }
    const opensOn = !opens ? null : opens === 'day' ? (/^\d{4}-\d{2}-\d{2}$/.test(opensDay) && opensDay > today ? opensDay : null) : opensOnFor(opens, today);
    if (opens === 'day' && !opensOn) return setProblem('Choose a day after today to open the letter on.');
    const tags = compact ? [] : readTags(tagText);
    let photos: string[] = [], audio: {id: string; seconds: number}[] = [], photoFields: {photos?: string[]; morePhotos?: string[]} = {};
    if (hasMedia) {
      setSaving(true); setStatus('Keeping the photos and the voice note on this device…');
      try {
        // Session AV lane 2 (r4-mind; LEDGER #317): room for the photos is checked first; five to twelve go in morePhotos.
        const [keep, more, {photoScope}] = await Promise.all([import('../../lib/journal/keep-media'), import('../../lib/journal/more-photos'), import('../../lib/health-aa/photos')]);
        const room = await more.photoRoom(photoScope(), media.photos.length + (media.audio ? 1 : 0));
        if (!room.ok) throw new Error(`${room.reason} Nothing was saved.`);
        try { for (const f of media.photos) photos.push(await keep.keepJournalPhoto(f)); if (media.audio) audio = [{id: await keep.keepJournalAudio(media.audio.blob, media.audio.seconds), seconds: media.audio.seconds}]; }
        catch (e) { await keep.forgetJournalMedia([...photos, ...audio.map(a => a.id)]); throw e; }
        photoFields = more.splitPhotos(photos);
      } catch (e) { setSaving(false); setStatus(''); photos = []; audio = []; return setProblem(e instanceof Error ? e.message : 'The photos could not be kept on this device. Nothing was saved.'); }
      setSaving(false);
    }
    const fallback = audio.length && photos.length ? 'Photos and a voice note.' : audio.length ? 'A voice note.' : photos.length > 1 ? 'Photos.' : 'A photo.';
    const entry: JournalEntry = {id: crypto.randomUUID(), date: today, text: (words || fallback).slice(0, MAX_TEXT), createdAt: new Date().toISOString(), ...(prompt ? {template: prompt.id} : {}), ...(tags.length ? {tags} : {}), ...(inBook && !compact ? {journal: inBook} : {}), ...photoFields, ...(audio.length ? {audio} : {}), ...(period && !compact ? {period} : {}), ...(opensOn && !compact ? {opensOn} : {})};
    const question = words && journal.data.followUps ? followUpFor(entry, journal.data.entries, lineLanguage(words)) : null;
    // Session AV lane 2 (r3-notes; LEDGER #278): a dream goes in the Dreams journal (made on first use), linked to its night.
    const dreamOf = dream;
    try { journal.update(current => { const full = {...entry, ...(question ? {followUp: {question, from: 'device' as const}} : {})}; if (dreamOf) return addDream(current, full, dreamOf).journal; return {...current, entries: [...current.entries, full].slice(-5000)}; }); }
    catch { if (photos.length || audio.length) void import('../../lib/journal/keep-media').then(k => k.forgetJournalMedia([...photos, ...audio.map(a => a.id)])); return setProblem('This could not be saved on this device. Nothing was changed.'); }
    setText(''); setTagText(''); setPrompt(null); setGridOn(null); setPeriod(''); setDream(null); setOpens(''); setOpensDay(''); setAsLetter(false); setFillDefault(true); setMedia(NO_MEDIA); setMediaOpen(false); setStatus(opensOn ? `Your letter is folded away until ${formatDate(opensOn)}. That day it opens on Today.` : 'Saved in your journal, on this device.'); setAsked(question ? entry.id : null); setAnswer('');
    if (question) zigiSignals.emit('journal_reflecting'); // Session AK Part 12: ZIGi asks its one question (a Studio-4 reaction once its art lands)
  };
  const pending = asked ? journal.data.entries.find(e => e.id === asked) : null;
  const saveAnswer = (event: FormEvent) => {
    event.preventDefault();
    if (!pending || !answer.trim()) return;
    journal.update(current => ({...current, entries: current.entries.map(e => e.id === pending.id && e.followUp ? {...e, followUp: {...e.followUp, answer: answer.trim().slice(0, 2000), answeredAt: new Date().toISOString()}} : e)}));
    setAsked(null); setAnswer(''); setStatus('Your answer is with the entry.');
  };
  // Session AV lane 2 (r3-notes; LEDGER #266): the template the entry started from, and whether it is written as a grid.
  const promptTemplate = prompt ? (() => { const own = (journal.data.templates ?? []).find(t => t.id === prompt.id); return own ? asJournalTemplate(own) : templateById(prompt.id); })() : null;
  const canGrid = !compact && !!promptTemplate && !promptTemplate.body && promptTemplate.headings[prompt!.lang].length >= 2;
  const asGrid = canGrid && (gridOn ?? promptTemplate!.grid === 'mandala');
  if (!journal.loaded || !energy.loaded) return <p className="fine">Loading your journal…</p>;
  return <div className={`journal-compose${compact ? ' journal-compose-compact' : ''}`}>
    <fieldset className="journal-energy"><legend>Energy today</legend>
      {[1, 2, 3, 4, 5].map(n => <label key={n} className="journal-energy-dot" title={ENERGY_WORDS.en[n - 1]}><input type="radio" name={`${id}-energy`} checked={todayEnergy === n} onChange={() => rate(n)}/><span aria-hidden="true">{n}</span><span className="sr-only">{n} of 5, {ENERGY_WORDS.en[n - 1]}</span></label>)}
      <span className="fine journal-energy-word">{todayEnergy ? ENERGY_WORDS.en[todayEnergy - 1] : '1 drained · 5 full of energy'}</span>
    </fieldset>
    {todayEnergy !== null && <MoodWordsFold day={today}/>}
    {/* Session AV (1c, q4 #4, fresh-agent review; Day One, Finch): "Three good things" open at the top of Write, one step. */}
    {!compact && !pending && <Suspense fallback={null}><ThreeGoodThings/></Suspense>}
    {!pending && <form onSubmit={e => void save(e)} aria-label="Write in your journal">
      {/* Session AV Part 7 (ADR-045 F-PROMPT): one question a day (lib/journal-prompts/daily.ts); using it only writes it into the text. */}
      {!compact && !text.trim() && <div className="journal-today-question" role="group" aria-label="Today’s question"><p><span className="fine">Today’s question{todayQ.pack ? <> · <span lang={qLang}>{todayQ.pack.title[qLang]}</span> pack</> : null}</span> <strong lang={qLang}>{todayQ.question}</strong></p>
        <div className="journal-today-question-actions"><button type="button" className="secondary" onClick={() => setText(current => withQuestion(current, todayQ.question))}>Use this question</button><button type="button" className="quiet" onClick={() => setStep(n => n + 1)}>Another question</button>{/* Session AV lane 2 (#56): a pack's own question is chosen in Prompt packs, so only the daily one hides here. */}{!todayQ.pack && <button type="button" className="quiet" onClick={() => { const i = questionIndexOfTheDay(today, step, qLang, mutedQ); void import('../../lib/muted/write').then(m => { m.setMuted('questions', i, true); setHidden(n => n + 1); setHiddenSaid('Hidden: it will not be asked again. Journal → Start from a prompt → Hidden lists it.'); }).catch(() => setHiddenSaid('This could not be hidden on this device.')); }}>Don’t ask this again</button>}<button type="button" className="quiet" lang={qLang === 'en' ? 'nl' : 'en'} onClick={() => setQuestionLang(qLang === 'en' ? 'nl' : 'en')}>{qLang === 'en' ? 'In het Nederlands' : 'In English'}</button></div>{hiddenSaid && <p className="fine" role="status">{hiddenSaid}</p>}</div>}
      {canGrid && <button type="button" className="quiet journal-grid-toggle" aria-pressed={asGrid} onClick={() => setGridOn(!asGrid)}>{asGrid ? 'Write as one text' : 'Write as a grid'}</button>}
      {asGrid ? <Suspense fallback={<p className="fine">Opening the grid…</p>}><ComposeGrid key={`${prompt!.id}-${prompt!.lang}`} template={promptTemplate!} lang={prompt!.lang} text={text} onChange={setText}/></Suspense>
        : <label className="field"><span>{compact ? 'A few lines about today' : dream ? 'Your dream' : 'Today’s entry'}</span><textarea ref={words} rows={compact ? 3 : 5} maxLength={MAX_TEXT} value={text} onChange={e => setText(e.target.value)} placeholder={dream ? 'What you remember: people, places, how it felt.' : 'What stood out today?'}/></label>}
      {!compact && !asGrid && <Suspense fallback={null}><JournalFormat value={text} onChange={setText} maxLength={MAX_TEXT} field={() => words.current}/></Suspense>}
      {dream && <p className="fine journal-dream-line" role="status">A dream from the night ending {formatDate(dream, {weekday: true})}. It goes in your {dreamsBook(journal.data)?.name ?? 'Dreams'} journal{dreamsBook(journal.data) ? '' : ' (made when you save)'}, and shows on that night in your sleep log. <button type="button" className="text-link" onClick={() => setDream(null)}>Not a dream</button></p>}
      {prompt && templateById(prompt.id)?.note && <p className="fine">{templateById(prompt.id)!.note![prompt.lang]}</p>}
      {/* Session AV lane 2 (journal; LEDGER #35, Day One's links to other entries): a day's entries, or a note, goal or habit, by [[name]]. */}
      {!compact && <details className="prompt-fold journal-link-fold"><summary>Link another day <span className="fine">· or type [[a note, goal or habit]]</span></summary>
        <div className="journal-link-day"><label className="field"><span>Day to link</span><input type="date" max={today} value={linkDay} onChange={e => setLinkDay(e.target.value)}/></label>
          <button type="button" className="secondary" disabled={!/^\d{4}-\d{2}-\d{2}$/.test(linkDay)} onClick={() => { setText(current => `${current.replace(/\s+$/, '')}${current.trim() ? ' ' : ''}[[${linkDay}]]`); setStatus(`A link to ${linkDay} is in your entry; it opens that day's entries.`); }}>Add the link</button></div>
      </details>}
      <SecretGuard text={text} onRemove={() => setText('')}/>
      {/* Session AV (1c, q4 #5; Day One suggests tags): the tags already in use, offered after what is typed so far. */}
      {!compact && <label className="field journal-compose-tags"><span>Tags — optional</span><input maxLength={200} autoComplete="off" list={tagOffers.length ? `${id}-known-tags` : undefined} value={tagText} onChange={e => setTagText(e.target.value)} placeholder="work, family" aria-describedby={`${id}-tags-hint`}/><small id={`${id}-tags-hint`} className="fine">Separate tags with commas; up to 8.</small></label>}
      {!compact && !dream && (prompt?.id === 'letter-future-you' || asLetter || opens ? <fieldset className="journal-letter">
        <legend>Open it later, as a letter</legend>
        <label className="field"><span>Open this entry</span><select value={opens} onChange={e => setOpens(e.target.value as typeof opens)}><option value="">Now: not a letter</option>{(['month', 'half', 'year'] as const).map(c => <option key={c} value={c}>{OPENS_WORDS[c]} ({formatDate(opensOnFor(c, today))})</option>)}<option value="day">On a day I choose</option></select></label>
        {opens === 'day' && <label className="field"><span>The day it opens</span><input type="date" min={addLocalDays(today, 1)} max={addMonths(today, 120)} value={opensDay} onChange={e => setOpensDay(e.target.value)}/></label>}
        <p className="fine">Until then it stays folded away in your journal, its words hidden. On its day it opens on Today, and the Journal&rsquo;s reminder tells you that morning (if notifications are on).</p>
      </fieldset> : <button type="button" className="quiet journal-letter-open" onClick={() => { setAsLetter(true); requestAnimationFrame(() => document.querySelector<HTMLElement>('.journal-letter select')?.focus()); }}>Open it later, as a letter…</button>)}
      {!compact && (() => { const choices = periodChoices(today), lookBack = period ? ALL_TEMPLATES.find(t => t.period === (period.includes('-W') ? 'week' : period.length === 7 ? 'month' : 'year')) : null;
        const word = (c: (typeof choices)[number]) => !c.kind ? 'This day' : `${c.which === 'this' ? 'This' : 'Last'} ${c.kind} · ${periodWords(c.value)}`;
        return <div className="journal-compose-period">
          <label className="field"><span>This entry is about</span><select value={period} onChange={e => setPeriod(e.target.value)}>{choices.map(c => <option key={c.value || 'day'} value={c.value}>{word(c)}</option>)}</select></label>
          {lookBack && prompt?.id !== lookBack.id && onlyHeadings(text) && <button type="button" className="quiet" onClick={() => { setText(current => startFrom(current, lookBack, qLang)); setPrompt({id: lookBack.id, lang: qLang}); setGridOn(null); setStatus(`Started from “${lookBack.title[qLang]}”. Write under each heading, or change anything.`); }}>Start from the {lookBack.title.en.toLowerCase()}</button>}
        </div>; })()}
      {!compact && !dream && books.length > 0 && <label className="field journal-compose-book"><span>Journal</span><select value={inBook ?? ''} onChange={e => setChosenBook(e.target.value || null)}><option value="">Journal (main)</option>{books.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}</select></label>}
      {!compact && tagOffers.length > 0 && <datalist id={`${id}-known-tags`}>{tagOffers.map(o => <option key={o} value={o}/>)}</datalist>}
      {!compact && <details className="prompt-fold" open={prompts || undefined} onToggle={e => setPrompts((e.currentTarget as HTMLDetailsElement).open)}><summary>Start from a prompt</summary>
        {prompts && <Suspense fallback={<p className="fine">Opening…</p>}><PromptPicker startLang={qLang} own={journal.data.templates ?? []} onEditOwn={(ownId, title, headingsText) => { journal.update(current => editOwnTemplate(current, ownId, {title, headingsText})); setStatus(`Your template “${title}” is saved.`); }} onAddOwn={(title, headingsText, newId) => journal.update(current => addOwnTemplate(current, {title, headingsText}, newId))} onRemoveOwn={ownId => journal.update(current => removeOwnTemplate(current, ownId))} defaultId={journal.data.defaultTemplate ?? null} onDefault={(templateId, title) => { try { journal.update(c => withDefault(c, templateId)); setStatus(templateId ? `A new entry starts from “${title}”.` : 'A new entry starts empty.'); } catch { setStatus('This choice could not be kept on this device.'); } }} onPick={(t, lang) => { setText(current => startFrom(current, t, lang)); setPrompt({id: t.id, lang}); setGridOn(null); setPrompts(false); if (t.tags?.length) setTagText(current => current.trim() ? current : t.tags!.join(', ')); setStatus(`Started from “${t.title[lang]}”. Write under each heading, or change anything.`); }}/></Suspense>}
      </details>}
      {!compact && <details className="prompt-fold journal-media-fold" open={mediaOpen || hasMedia || undefined} onToggle={e => setMediaOpen((e.currentTarget as HTMLDetailsElement).open)}><summary>Photos and a voice note <span className="fine">· {hasMedia ? [media.photos.length ? `${media.photos.length} ${media.photos.length === 1 ? 'photo' : 'photos'}` : '', media.audio ? 'a voice note' : ''].filter(Boolean).join(' and ') : 'on this device only'}</span></summary>
        {(mediaOpen || hasMedia) && <Suspense fallback={<p className="fine">Opening…</p>}><ComposeMedia value={media} onChange={setMedia}/></Suspense>}
      </details>}
      {!compact && <details className="prompt-fold prompt-packs-fold" open={packsOpen || undefined} onToggle={e => setPacksOpen((e.currentTarget as HTMLDetailsElement).open)}><summary>Prompt packs <span className="fine">· {(journal.data.packs ?? []).length ? `${(journal.data.packs ?? []).length} on` : 'sleep, training and more'}</span></summary>
        {packsOpen && <Suspense fallback={<p className="fine">Opening…</p>}><PromptPacks on={journal.data.packs ?? []} lang={qLang} onToggle={(packId, on, m) => { /* Session AV lane 2 (fixb1): kept in the same tap, so the box never springs back first */ setPacks(m); try { journal.update(c => ({...c, packs: m.withPack(c.packs, packId, on)})); setStatus(on ? 'Pack on: its questions join today’s question.' : 'Pack off.'); } catch { setStatus('This choice could not be kept on this device.'); } }} onUse={q => { setText(current => withQuestion(current, q)); setStatus('The question is in your entry. Write under it, or change anything.'); }}/></Suspense>}
      </details>}
      {problem && <p role="alert">{problem}</p>}
      <div className="journal-actions"><button type="submit" className="primary" disabled={saving}>{saving ? 'Saving…' : 'Save entry'}</button>{compact && <Link className="text-link" href="/app/journal">Open your journal</Link>}{compact && <Link className="text-link" href="/app/journal#good-things">Three good things</Link>}</div>
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
