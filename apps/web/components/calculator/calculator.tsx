'use client';
import Link from 'next/link';
import {CountUp} from './count-up';
import {useDeferredValue, useEffect, useMemo, useState, type ReactNode} from 'react';
import Decimal from 'decimal.js';
import {normalizeDecimalInput} from '../../lib/decimal-input';
import {COMPOUNDING, DEFAULT_INPUT, FREQUENCY, LIMITS, compound, compoundInputSchema, milestoneWhen, whatIfs, type CompoundInput, type CompoundResult} from '../../lib/compound/engine';
import {CALCULATOR, MAX_SCENARIOS, removeScenario, rememberInput, restoreScenario, saveScenario, type Scenario} from '../../lib/compound/store';
import {formatMoney, formatSignedMoney} from '../../lib/visual-format';
import {useDeviceRecord} from '../ai/use-device-record';
import {useLocalToday} from '../use-local-today';
import {SectionHeading} from '../ui/section-heading';
import {showToast} from '../ui/undo-toast';
import {CalculatorChart, type ChartLine} from './calculator-chart';
import {earnCalculatorPrefill} from '../../lib/earn/calculator-link';
import './calculator.css';

/**
 * The compound interest calculator (Session AA-Cloud Part 3, owner edit 5): large fields with sliders for the return and
 * the years, results that follow every change, the chart first after the figures on a phone, "what if" plans as lines
 * over it, the year-by-year table, milestones, the value in today's money, saved scenarios on this device and "Turn this
 * into a goal". Every figure is an estimate from the person's own assumptions: returns are not guaranteed, and nothing
 * here is advice.
 */
const AMOUNT = /^\d{1,13}(\.\d{1,2})?$/;
const TONES = {higher: {tone: '#6fe6f6', dash: ''}, lower: {tone: '#ffc27a', dash: '8 5'}, earlier: {tone: '#f08bd6', dash: '2 5'}, custom: {tone: '#9ff0b5', dash: '12 4 3 4'}} as const;
type Draft = {start: string; contribution: string; frequency: CompoundInput['frequency']; ratePercent: string; years: string; months: string; compounding: CompoundInput['compounding']; timing: CompoundInput['timing']; increasePercent: string; inflationPercent: string; currency: CompoundInput['currency']};
type Compare = {higher: boolean; lower: boolean; earlier: boolean; custom: string};
const toDraft = (i: CompoundInput): Draft => ({start: i.start, contribution: i.contribution, frequency: i.frequency, compounding: i.compounding, timing: i.timing, currency: i.currency, ratePercent: String(i.ratePercent), years: String(i.years), months: String(i.months ?? 0), increasePercent: String(i.increasePercent), inflationPercent: String(i.inflationPercent)});
/**
 * An amount as typed, read as the rest of the app reads one (Gate C): a decimal comma ("99,50"), thousands written with
 * commas when they cannot be anything else ("1,000,000" or "2,000.50"), and "1,500" refused with the reason, because it
 * could mean 1500 or 1.5.
 */
const AMOUNT_HINT = 'An amount with up to two decimals, such as 250 or 99.50.';
function amountText(raw: string): {value?: string; error?: string} {
  const v = raw.replace(/\s/g, '');
  if (/^\d{1,3}(,\d{3})+\.\d{1,2}$/.test(v) || /^\d{1,3}(,\d{3}){2,}$/.test(v)) return {value: v.replace(/,/g, '')};
  try { const n = normalizeDecimalInput(v); return AMOUNT.test(n) ? {value: n} : {error: AMOUNT_HINT}; } catch (e) { return {error: e instanceof Error ? e.message : AMOUNT_HINT}; }
}
/** Results past this are shown as too large to read reliably, never as long rows of exact-looking digits. */
const SHOWN_LIMIT = new Decimal('1e15');
const tooLarge = (v: string) => new Decimal(v).abs().gt(SHOWN_LIMIT);

function parseDraft(d: Draft): {input?: CompoundInput; errors: Partial<Record<keyof Draft, string>>} {
  const errors: Partial<Record<keyof Draft, string>> = {};
  const num = (key: keyof Draft, v: string, min: number, max: number, int = false) => {
    const n = Number(v.replace(',', '.'));
    if (v.trim() === '' || !Number.isFinite(n) || n < min || n > max || (int && !Number.isInteger(n))) { errors[key] = key === 'months' ? `Whole months from ${min} to ${max}.` : int ? `Whole years from ${min} to ${max}.` : `A number from ${min} to ${max}.`; return 0; }
    return Math.round(n * 100) / 100;
  };
  const amounts = {start: amountText(d.start), contribution: amountText(d.contribution)};
  for (const key of ['start', 'contribution'] as const) if (amounts[key].error) errors[key] = amounts[key].error;
  const ratePercent = num('ratePercent', d.ratePercent, -50, LIMITS.ratePercent), years = num('years', d.years, 1, LIMITS.years, true);
  // Session AH (TR14): months after the whole years.
  const months = (d.months ?? '0').trim() === '' ? 0 : num('months', d.months ?? '0', 0, 11, true);
  if (!errors.months && years >= LIMITS.years && months > 0) errors.months = `Up to ${LIMITS.years} years in all.`;
  const increasePercent = num('increasePercent', d.increasePercent, 0, LIMITS.increasePercent), inflationPercent = num('inflationPercent', d.inflationPercent, 0, LIMITS.inflationPercent);
  if (Object.keys(errors).length) return {errors};
  const parsed = compoundInputSchema.safeParse({...d, start: amounts.start.value, contribution: amounts.contribution.value, ratePercent, years, months, increasePercent, inflationPercent});
  return parsed.success ? {input: parsed.data, errors} : {errors: {start: 'These numbers cannot be calculated.'}};
}
function safeCompound(input: CompoundInput): CompoundResult | null {
  try { return compound(input); } catch { return null; }
}
/** "20 years" or "1 year 6 months". */
const spanWords = (i: Pick<CompoundInput, 'years' | 'months'>) => `${i.years} ${i.years === 1 ? 'year' : 'years'}${i.months ? ` ${i.months} ${i.months === 1 ? 'month' : 'months'}` : ''}`;
const PERIOD_WORDS = {weekly: 'every week', monthly: 'every month', yearly: 'every year'} as const, ADDED_WORDS = {yearly: 'once a year', quarterly: 'every quarter', monthly: 'every month', daily: 'every day'} as const;
/** Every assumption behind a result, in one sentence. */
export function assumptionsText(i: CompoundInput): string {
  const m = (v: string) => formatMoney(v, i.currency);
  return `Assumes ${m(i.start)} to start and ${m(i.contribution)} ${PERIOD_WORDS[i.frequency]}, at the ${i.timing} of each period${i.increasePercent > 0 ? `, raised ${i.increasePercent} % each year` : ', never raised'}; a ${i.ratePercent} % yearly return, added ${ADDED_WORDS[i.compounding]}; for ${spanWords(i)}; ${i.inflationPercent > 0 ? `${i.inflationPercent} % inflation for today’s money` : 'no inflation'}; no fees or taxes.`;
}
const addMonths = (day: string, months: number) => { if (!months) return day; const y = Number(day.slice(0, 4)), mo = Number(day.slice(5, 7)) - 1 + months, d = Number(day.slice(8, 10)); const year = y + Math.floor(mo / 12), month = mo % 12, last = new Date(Date.UTC(year, month + 1, 0)).getUTCDate(); return `${year}-${String(month + 1).padStart(2, '0')}-${String(Math.min(d, last)).padStart(2, '0')}`; };
const addYears = (day: string, years: number) => `${Number(day.slice(0, 4)) + years}${day.slice(4, 10) === '-02-29' ? '-02-28' : day.slice(4, 10)}`;

export function Calculator() {
  const record = useDeviceRecord(CALCULATOR), today = useLocalToday();
  const [draft, setDraft] = useState<Draft>(() => toDraft(DEFAULT_INPUT)), [restored, setRestored] = useState(false), [touched, setTouched] = useState(false);
  const [compare, setCompare] = useState<Compare>({higher: true, lower: true, earlier: false, custom: ''});
  const [name, setName] = useState(''), [allRows, setAllRows] = useState(false);
  // Session AF (L1, ADR-028 H17): opened from the Earn page (?from=earn&rate=…&label=illustration), the yearly return starts
  // at that live rate under an "illustration" banner; the first field the person touches clears it. Never remembered by itself.
  const [illustration, setIllustration] = useState<string | null>(null);
  // The page opens on the inputs it showed last on this device.
  useEffect(() => {
    if (restored || !record.loaded) return;
    queueMicrotask(() => {
      setRestored(true);
      const rate = earnCalculatorPrefill(window.location.search);
      // Session AH (TR14, B-010): Earn's rate is a simple yearly rate, so it is added once a year here (as if the rewards
      // were restaked once a year), and the banner says so.
      if (record.data.last) setDraft(rate ? {...toDraft(record.data.last), ratePercent: rate, compounding: 'yearly'} : toDraft(record.data.last));
      else if (rate) setDraft(d => ({...d, ratePercent: rate, compounding: 'yearly'}));
      setIllustration(rate);
    });
  }, [record.loaded, record.data.last, restored]);
  const parsed = useMemo(() => parseDraft(draft), [draft]);
  // While a field is being corrected the results keep showing the last inputs that worked.
  const [shown, setShown] = useState<CompoundInput>(DEFAULT_INPUT);
  if (parsed.input && parsed.input !== shown) setShown(parsed.input);
  const input = useDeferredValue(parsed.input ?? shown);
  // Session AH (TR14, B-123): no figures while a field is wrong (they were the last numbers that worked, and read as current).
  const valid = parsed.input !== undefined;
  const result = useMemo(() => valid ? safeCompound(input) : null, [input, valid]);
  const lines = useMemo<ChartLine[]>(() => {
    const out: ChartLine[] = [];
    for (const w of whatIfs(input)) {
      if (!compare[w.id as 'higher' | 'lower' | 'earlier']) continue;
      const r = safeCompound(w.input);
      if (r && !tooLarge(r.final)) out.push({id: w.id, label: w.label, ...TONES[w.id as 'higher' | 'lower' | 'earlier'], offset: w.id === 'earlier' ? -5 : 0, result: r});
    }
    const custom = Number(compare.custom.replace(',', '.'));
    if (compare.custom.trim() && Number.isFinite(custom) && custom >= -50 && custom <= LIMITS.ratePercent && custom !== input.ratePercent) {
      const r = safeCompound({...input, ratePercent: Math.round(custom * 100) / 100});
      if (r && !tooLarge(r.final)) out.push({id: 'custom', label: `${Math.round(custom * 100) / 100} % return`, ...TONES.custom, offset: 0, result: r});
    }
    return out;
  }, [input, compare]);
  // Remembered on this device a moment after the person's last change (never while a field is wrong, never just for opening the page).
  useEffect(() => {
    if (!restored || !touched || !parsed.input || !record.loaded || record.unreadable) return;
    const t = window.setTimeout(() => { try { record.update(s => rememberInput(s, parsed.input!)); } catch { /* the page still works */ } }, 600);
    return () => window.clearTimeout(t);
  }, [parsed.input, restored, touched, record]);

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => { setTouched(true); setIllustration(null); setDraft(d => ({...d, [key]: value})); };
  const money = (v: string) => formatMoney(v, input.currency);
  const scenarios = record.loaded && !record.unreadable ? record.data.scenarios : [];
  const save = () => {
    if (!parsed.input) return;
    const title = name.trim() || `Plan ${scenarios.length + 1}`;
    try {
      record.update(s => saveScenario(s, {id: `s${Date.now().toString(36)}`, name: title, input: parsed.input!, savedAt: new Date().toISOString()}));
      setName('');
      showToast({message: `“${title}” saved on this device.`});
    } catch (e) { showToast({message: e instanceof Error && e.message ? e.message : 'The scenario could not be saved on this device.'}); }
  };
  const remove = (s: Scenario) => {
    const index = scenarios.findIndex(x => x.id === s.id);
    try {
      record.update(current => removeScenario(current, s.id));
      showToast({message: `“${s.name}” removed.`, undo: () => record.update(current => restoreScenario(current, s, index)), undone: `“${s.name}” is back.`});
    } catch { showToast({message: 'The scenario could not be removed.'}); }
  };
  const goalHref = result ? `/app/goals/new?${new URLSearchParams({from: 'calculator', name: `Grow to ${money(result.final)}`.slice(0, 100), target: result.final, currency: input.currency, date: addMonths(addYears(today, input.years), input.months ?? 0), contribution: input.contribution, every: input.frequency})}` : '/app/goals/new';
  const rows = result ? (allRows ? result.rows : result.rows.slice(0, 10)) : [];
  const busy = parsed.input !== undefined && input !== parsed.input;

  return <div className="calc">
    {illustration && <p className="calc-illustration notice" role="status" style={{margin: "0 0 16px"}} data-earn-illustration={illustration}><b>Illustration, not a promise.</b> The yearly return starts at {illustration} %, ZIGChain’s native staking rate as the Earn page read it live (a simple yearly rate). Here it is added to the balance once a year, as if you restaked the rewards each year; without restaking, growth is lower. Rates move every block and nothing here is guaranteed. Change any field to use your own numbers.</p>}
    {!valid ? <section className="panel calc-results" aria-labelledby="calc-results-title"><h2 id="calc-results-title">Correct the marked field to see the estimate.</h2><p role="status">The figures come back as soon as every field is valid.</p></section> : !result ? <section className="panel calc-results" role="status"><h2>These numbers cannot be calculated.</h2><p>Check the return: a loss of 50 % or more in a single period is outside what this calculator models.</p></section> : tooLarge(result.final) || tooLarge(result.growth) ? <section className="panel calc-results" role="status"><h2>Too large to estimate here.</h2><p>With these numbers the result passes {formatMoney(SHOWN_LIMIT.toFixed(0), input.currency)}, beyond what this calculator shows reliably. Lower the return, the years or the amounts.</p></section> : <>
      <section className={`calc-results panel${parsed.input ? '' : ' is-stale'}`} aria-labelledby="calc-results-title" aria-busy={busy}>
        <SectionHeading id="calc-results-title" eyebrow={`After ${spanWords(input)} · an estimate`} title="What it could grow to" />
        <dl className="calc-figures" aria-live="polite">
          <div className="calc-final"><dt>Estimated final value</dt><dd style={{'--chars': money(result.final).length} as import('react').CSSProperties}><CountUp text={money(result.final)}/></dd></div>
          <div><dt>You put in</dt><dd>{money(result.contributed)}</dd></div>
          <div><dt>Growth</dt><dd>{formatSignedMoney(result.growth, input.currency)}</dd></div>
          {result.realFinal && <div><dt>In today’s money</dt><dd>{money(result.realFinal)}</dd></div>}
        </dl>
        {/* Session AH (TR14, B-021, N-029): every assumption behind the figures, beside them. */}
        <p className="calc-assumptions" data-calc-assumptions>{assumptionsText(input)}</p>
        <p className="calc-estimate">An estimate; returns are not guaranteed. Real returns vary from year to year, and fees and taxes are not included.</p>
        <CalculatorChart result={result} start={input.start} currency={input.currency} lines={lines} />
        <fieldset className="calc-compare">
          <legend>Compare with</legend>
          {whatIfs(input).map(w => <label key={w.id} className="calc-chip"><input type="checkbox" checked={compare[w.id as 'higher' | 'lower' | 'earlier']} onChange={e => setCompare(c => ({...c, [w.id]: e.target.checked}))} /><span><i style={{background: TONES[w.id as 'higher' | 'lower' | 'earlier'].tone}} />{w.label}</span></label>)}
          <label className="calc-chip calc-chip-input"><span><i style={{background: TONES.custom.tone}} />Another return</span><input inputMode="decimal" aria-label="Another yearly return to compare, in percent" placeholder="%" value={compare.custom} onChange={e => setCompare(c => ({...c, custom: e.target.value}))} /></label>
        </fieldset>
        {lines.length > 0 && <ul className="calc-whatifs">
          {lines.map(l => { const diff = new Decimal(l.result.final).minus(result.final).toFixed(2); return <li key={l.id}><i style={{background: l.tone}} /><span>{l.label}</span><strong>{money(l.result.final)}</strong><small>{Number(diff) === 0 ? 'the same' : `${formatSignedMoney(diff, input.currency)} compared with your plan`}</small></li>; })}
        </ul>}
        <div className="calc-actions">
          <Link className="primary" href={goalHref}>Turn this into a goal</Link>
          <p className="fine">Creates a Value goal with this result as its target ({money(result.final)}), a date {spanWords(input)} from today and your {input.frequency} contribution as its plan.{input.increasePercent > 0 ? ' The plan keeps the first year’s contribution; the yearly raise is not carried over.' : ''} You can change everything before saving.</p>
        </div>
      </section>

    </>}
    <section className="calc-inputs panel" aria-labelledby="calc-inputs-title">
      {result && <p className="calc-sticky" aria-hidden="true"><span>Estimated final value</span><strong>{money(result.final)}</strong></p>}
      <SectionHeading id="calc-inputs-title" eyebrow="Your assumptions" title="Your plan" />
      <div className="calc-currency" role="radiogroup" aria-label="Currency">
        {(['USD', 'EUR'] as const).map(c => <label key={c}><input type="radio" name="calc-currency" checked={draft.currency === c} onChange={() => set('currency', c)} /><span>{c === 'USD' ? 'US dollar · USD' : 'Euro · EUR'}</span></label>)}
      </div>
      <div className="calc-fields">
        <Field label="Starting amount" error={parsed.errors.start} unit={draft.currency}><input inputMode="decimal" autoComplete="off" value={draft.start} onChange={e => set('start', e.target.value)} /></Field>
        <Field label="Regular contribution" error={parsed.errors.contribution} unit={draft.currency}>
          <input inputMode="decimal" autoComplete="off" value={draft.contribution} onChange={e => set('contribution', e.target.value)} />
        </Field>
        <label className="calc-field calc-select"><span>How often</span><select value={draft.frequency} onChange={e => set('frequency', e.target.value as Draft['frequency'])}>{(Object.keys(FREQUENCY) as (keyof typeof FREQUENCY)[]).map(f => <option key={f} value={f}>{f === 'weekly' ? 'Every week' : f === 'monthly' ? 'Every month' : 'Every year'}</option>)}</select></label>
        <Slider label="Yearly return" unit="%" value={draft.ratePercent} error={parsed.errors.ratePercent} min={0} max={15} step={0.1} onChange={v => set('ratePercent', v)} hint="A return you assume each year, before inflation. The slider goes to 15 %; type any value from −50 to 100." />
        <Slider label="Years" unit="years" value={draft.years} error={parsed.errors.years} min={1} max={LIMITS.years} step={1} onChange={v => set('years', v)} hint={`From 1 to ${LIMITS.years} years.`} />
        <Field label="And months" error={parsed.errors.months} unit="months" hint="0 to 11 months after the whole years."><input inputMode="numeric" autoComplete="off" value={draft.months} onChange={e => set('months', e.target.value)} /></Field>
        <label className="calc-field calc-select"><span>Interest added</span><select value={draft.compounding} onChange={e => set('compounding', e.target.value as Draft['compounding'])}>{(Object.keys(COMPOUNDING) as (keyof typeof COMPOUNDING)[]).map(c => <option key={c} value={c}>{c === 'yearly' ? 'Once a year' : c === 'quarterly' ? 'Every quarter' : c === 'monthly' ? 'Every month' : 'Every day'}</option>)}</select></label>
        <fieldset className="calc-field calc-timing"><legend>Contributions arrive</legend>{(['start', 'end'] as const).map(t => <label key={t}><input type="radio" name="calc-timing" checked={draft.timing === t} onChange={() => set('timing', t)} /><span>At the {t} of each period</span></label>)}</fieldset>
      </div>
      <details className="calc-more" open={Number(draft.increasePercent) > 0 || Number(draft.inflationPercent) > 0 || undefined}>
        <summary>Rising contributions and inflation (optional)</summary>
        <div className="calc-fields">
          <Field label="Raise contributions each year by" error={parsed.errors.increasePercent} unit="%"><input inputMode="decimal" value={draft.increasePercent} onChange={e => set('increasePercent', e.target.value)} /></Field>
          <Field label="Inflation each year" error={parsed.errors.inflationPercent} unit="%" hint="Shows what the result would buy in today’s money."><input inputMode="decimal" value={draft.inflationPercent} onChange={e => set('inflationPercent', e.target.value)} /></Field>
        </div>
      </details>
    </section>

    {result && <>
      <section className="calc-milestones panel" aria-labelledby="calc-milestones-title">
        <SectionHeading id="calc-milestones-title" eyebrow="Along the way" title="Milestones" level={3} />
        <ul>{[10_000, 100_000, 1_000_000].map(t => { const m = result.milestones.find(x => x.threshold === t); const already = Number(input.start) >= t; return <li key={t} data-reached={Boolean(m) || already}><strong>{money(t.toFixed(2)).replace(/[.,]00(?=\D*$)/, '')}</strong><span>{already ? 'Already there at the start' : m ? `${milestoneWhen(m)} (estimate)` : `Not within ${input.years} ${input.years === 1 ? 'year' : 'years'}`}</span></li>; })}</ul>
      </section>

      <section className="calc-table panel" aria-labelledby="calc-table-title">
        <SectionHeading id="calc-table-title" eyebrow="Every figure" title="Year by year" level={3} />
        <div className="calc-table-scroll" tabIndex={0} role="region" aria-labelledby="calc-table-title">
          <table>
            <caption className="sr-only">Year by year, an estimate in {input.currency}</caption>
            <thead><tr><th scope="col">Year</th><th scope="col">Put in that year</th><th scope="col">Put in so far</th><th scope="col">Growth so far</th><th scope="col">Balance</th>{result.realFinal && <th scope="col">In today’s money</th>}</tr></thead>
            <tbody>{rows.map(r => <tr key={r.year}><th scope="row">{r.months ? `${r.year} (${r.months} ${r.months === 1 ? 'month' : 'months'})` : r.year}</th><td>{money(r.contributedThisYear)}</td><td>{money(r.contributed)}</td><td>{formatSignedMoney(r.growth, input.currency)}</td><td><strong>{money(r.balance)}</strong></td>{result.realFinal && <td>{r.real ? money(r.real) : '—'}</td>}</tr>)}</tbody>
          </table>
        </div>
        {result.rows.length > 10 && <button type="button" className="secondary" aria-expanded={allRows} onClick={() => setAllRows(v => !v)}>{allRows ? 'Show the first 10 years' : `Show all ${result.rows.length} years`}</button>}
      </section>
    </>}

    <section className="calc-saved panel" aria-labelledby="calc-saved-title">
      <SectionHeading id="calc-saved-title" eyebrow="Kept on this device" title="Saved scenarios" level={3} lede={`Up to ${MAX_SCENARIOS}, with their inputs only: the results are worked out again each time.`} />
      <form className="calc-save" onSubmit={e => { e.preventDefault(); save(); }}>
        <label className="calc-field"><span>Name this scenario</span><input value={name} maxLength={60} placeholder={`Plan ${scenarios.length + 1}`} onChange={e => setName(e.target.value)} /></label>
        <button className="secondary" type="submit" disabled={!parsed.input || !record.loaded || record.unreadable}>Save scenario</button>
      </form>
      {/* Session AH (TR14, B-155): the limit in view, before a save is refused. */}
      {record.loaded && !record.unreadable && <p className="fine calc-saved-count" role="status">{scenarios.length} of {MAX_SCENARIOS} saved{scenarios.length >= MAX_SCENARIOS ? ' · remove one to save another (saving under an existing name replaces it)' : ''}</p>}
      {record.unreadable && <p className="notice" role="status">Saved scenarios on this device could not be read, so nothing is changed there.</p>}
      {scenarios.length ? <ul className="calc-scenarios">{scenarios.map(s => { const r = safeCompound(s.input); return <li key={s.id}>
        <div><strong>{s.name}</strong><span>{formatMoney(s.input.start, s.input.currency)} to start, {formatMoney(s.input.contribution, s.input.currency)} {s.input.frequency === 'weekly' ? 'a week' : s.input.frequency === 'monthly' ? 'a month' : 'a year'}, {s.input.ratePercent} % for {spanWords(s.input)}</span>{r && <small>About {formatMoney(r.final, s.input.currency)} (estimate)</small>}</div>
        <div className="calc-scenario-actions"><button type="button" className="secondary" onClick={() => { setTouched(true); setIllustration(null); setDraft(toDraft(s.input)); document.getElementById('calc-inputs-title')?.scrollIntoView({block: 'start'}); showToast({message: `“${s.name}” is in the calculator.`}); }} aria-label={`Open ${s.name}`}>Open</button><button type="button" className="quiet" onClick={() => remove(s)} aria-label={`Remove ${s.name}`}>Remove</button></div>
      </li>; })}</ul> : <p className="calc-empty">No saved scenarios yet. Save one to compare plans later.</p>}
    </section>
  </div>;
}

function Field({label, unit, error, hint, children}: {label: string; unit?: string; error?: string; hint?: string; children: ReactNode}) {
  return <label className="calc-field" data-invalid={error ? true : undefined}>
    <span>{label}</span>
    <span className="calc-input">{children}{unit && <b aria-hidden="true">{unit}</b>}</span>
    {hint && !error && <small>{hint}</small>}
    {error && <small className="calc-error" role="alert">{error}</small>}
  </label>;
}

function Slider({label, unit, value, error, min, max, step, onChange, hint}: {label: string; unit: string; value: string; error?: string; min: number; max: number; step: number; onChange: (v: string) => void; hint: string}) {
  const n = Number(value), id = label.toLowerCase().replace(/\W+/g, '-');
  return <div className="calc-field calc-slider" data-invalid={error ? true : undefined}>
    <label htmlFor={`calc-${id}`}>{label}</label>
    <span className="calc-input"><input id={`calc-${id}`} inputMode="decimal" value={value} onChange={e => onChange(e.target.value)} aria-describedby={`calc-${id}-note`} /><b aria-hidden="true">{unit}</b></span>
    <input type="range" min={min} max={max} step={step} value={Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : min} onChange={e => onChange(e.target.value)} aria-label={`${label}, slider`} aria-valuetext={`${value} ${unit}`} />
    <small id={`calc-${id}-note`} className={error ? 'calc-error' : undefined} role={error ? 'alert' : undefined}>{error ?? hint}</small>
  </div>;
}
