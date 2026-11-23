'use client';
import {Suspense, lazy, useEffect, useId, useMemo, useRef, useState, type FormEvent} from 'react';
import {useDeviceRecord} from '../../ai/use-device-record';
import {localDate} from '../../../lib/local-date';
import {formatDate} from '../../../lib/visual-format';
import {moneyCents} from '../money-tools/format';
import {addEntry, byCategory, fromCents, monthOf, removeEntry, roomToSpend, totals, weekOf} from '../../../lib/money-log/engine';
import {MONEY_LOG, type MoneyEntry, type PaidWith} from '../../../lib/money-log/schema';
import {categoryPath, PAID_WITH_WORDS} from '../../../lib/money-more/quick';
// Session AV lane 2 (money): left out of the figures, tax mark, spread over months, own categories, bulk changes, history.
import {addOwnCategory, bulkCategory, bulkExcluded, categoryChoices, changesBetween, inFigures, removeOwnCategory, withMarks} from '../../../lib/money-log/counted';
import type {BulkAction} from './money-search';
// Session AV lane 2, round 4 (money; Lunch Money's grouped transactions, LEDGER #341).
import {groupEntries, groupRows, ungroup, type GroupSummary, type ListRow} from '../../../lib/money-log/groups';
import {GroupItem} from './group-row';
import type {KeepPayee} from './places';
import {uncheck} from '../../../lib/money-log/reconcile';
import {draftAlreadyLogged} from '../../../lib/money-photos/match';
import {setTransfer} from '../../../lib/bankfiles/reimport';
import './spending.css';
import {usePhoneShowAll} from '../../phone/phone-show-all';
import {PhoneFold} from '../../phone/phone-fold';
import {usePhoneActive} from '../../phone/use-phone-layout';
// Session AK (lane M): rules on new entries, the review mark, and Money tools (its own chunk, loaded after this body).
import {MONEY_RULES} from '../../../lib/money-rules/schema';
import {applyRules} from '../../../lib/money-rules/engine';
import {MONEY_REVIEW} from '../../../lib/money-review/review';
// Session AK (BUILD list 2 #1): a calm line while a note looks like recovery words or a key.
import {SecretGuard} from '../../secret-guard/secret-guard';
const MoneyTools = lazy(() => import('../money-tools/money-tools'));
// Session AK (BUILD list 2 #6, #7, #18, #19): recent categories first, Select with a running total, the spending map
// (its own chunk, on "Map"), and a calculator in the amount fields. Pure parts in lib/; nothing new is stored.
import {categoriesRecentFirst} from '../../../lib/recent-categories/recent';
import {pastCategory} from '../../../lib/money-log/suggest';
import {withRefundShare} from '../../../lib/money-log/refunds';
import {barWidths} from '../../../lib/money-log/bars';
import {selectionLine, summarizeSelection} from '../../../lib/money-log/selection';
import {amountProblem} from '../../../lib/money-calc/expression';
// PR-052: one form check for a new entry and an edit, and the edit itself (in place, the same id).
import {checkMoneyEdit, checkMoneyForm, readMoneyAmount, replaceEntry} from '../../../lib/money-log/form';
import {CalcHint} from '../../money-calc/calc-hint';
import {MONEY_DRAFT_EVENT, type MoneyDraft} from '../../money-photos/draft-event';
import '../../money-select/money-select.css';
import {changeWithUndo, removeWithUndo} from '../../ui/remove-with-undo';
const SpendingMap = lazy(() => import('../../spending-map/spending-map'));
// Session AP (features 1, 2, 4, 5): Your money over time (month by month, categories over a year, top payees, your usual
// pace, age of money and tags), its own chunk; each view inside is its own chunk again.
const SpendingInsights = lazy(() => import('./insights/spending-insights'));

/**
 * Session AI (B3 competitor gap; feature 5's numbers): the expense and income log with a weekly "room to spend". Logged
 * here by hand, from ZIGi's card or from a quick line; kept on this device, in Export everything and the backup. Every
 * figure is the person's own entries in their own currency, never converted; no advice and no projection.
 */
const CURRENCIES = ['EUR', 'USD', 'GBP', 'CHF'] as const;
const money = (cents: number, currency: string) => moneyCents(cents, currency); // Session AL (PRIMITIVES 3f): the one format layer
const readAmount = readMoneyAmount;
/** Session AK (#19): why a typed sum cannot be saved, in its own words; lane EXF (EX-9): also a plain amount that is too large. */
const sumProblem = amountProblem;
/** PR-052: an edited entry's own category stays choosable when it is not one of the usual ones (a rule's or ZIGi's). */
const withOwn = (chips: readonly string[], own: string | undefined): readonly string[] => own && !chips.includes(own) ? [own, ...chips] : chips;
// Session AV (L-7): with only monthly budgets, the weekly card shows this month's room from them (its own chunk).
const MonthRoom = lazy(() => import('../budgets/month-room'));
// Session AV (owner follow-up 1, F-MONEY-SEARCH): the whole money log searched, loaded when its fold opens.
const MoneySearch = lazy(() => import('./money-search'));
// Session AV lane 2, round 2 (money; Wallet, Emma): saved entries, subcategory and paid with, the month by method (own chunk).
const SavedChips = lazy(() => import('./quick-log').then(m => ({default: m.SavedChips})));
const FormExtras = lazy(() => import('./quick-log').then(m => ({default: m.FormExtras})));
const MonthExtras = lazy(() => import('./quick-log').then(m => ({default: m.MonthExtras})));
// Session AV lane 2, round 2 (money; Emma's unusual-transaction alerts): one calm line, with "That's fine" (own chunk).
const UnusualLine = lazy(() => import('./unusual-line'));
// Session AV lane 2, round 4 (money; Lunch Money, LEDGER #342, #347): archive a category, starter sets (own chunk, on the fold).
const CategoryMore = lazy(() => import('./category-more'));
// Session AV lane 2, round 5 (money; Tiller's Hello Money, LEDGER #384): yesterday's money and its two choices (own chunk, on the fold).
const YesterdayMoney = lazy(() => import('./yesterday-money'));
// Session AV lane 2, round 5 (money; Tiller's Foundation Template, LEDGER #389): the money log as a table, a CSV and an .xlsx (own chunk, on the fold).
const MoneySheet = lazy(() => import('./money-sheet'));
// Session AV lane 2, round 6 (money; Banktivity, LEDGER #425): the purchase a refund is for, and the money streak (own chunks).
const RefundOf = lazy(() => import('./refund-of'));
const MoneyStreakLine = lazy(() => import('./money-streak'));
const MoneyHousekeeping = lazy(() => import('./money-housekeeping'));
// Session AV lane 2, round 2 (money; Emma's split and settle, Wallet's lent and borrowed): between you and others (own chunk).
const ShareFold = lazy(() => import('./people-money').then(m => ({default: m.ShareFold})));
const PeoplePanel = lazy(() => import('./people-money'));
// Session AV lane 2, round 2 (money; Wallet's loyalty and club cards): store cards with a barcode for the till (own chunk).
const StoreCards = lazy(() => import('../store-cards/store-cards'));
// Session AV lane 2, round 2 (money; Emma's Spaces): a business space with its own records, switched inside Spending.
import SpaceSwitch, {SpaceSetup, useMoneySpace} from './space-switch';
import {logSpec, type MoneySpace} from '../../../lib/money-more/spaces';
export default function SpendingSection({showcase = false}: {showcase?: boolean}) {
  // Session AV lane 2, round 2: the Showcase always shows Personal; a space change mounts the body afresh on its own records.
  const {space, ready} = useMoneySpace(), shown: MoneySpace = showcase ? 'personal' : space;
  if (!ready) return <p className="fine">Loading your spending…</p>;
  return <>{!showcase && <SpaceSwitch where="spending"/>}<SpendingBody key={shown} showcase={showcase} space={shown}/></>;
}
function SpendingBody({showcase = false, space}: {showcase?: boolean; space: MoneySpace}) {
  const log = useDeviceRecord(space === 'business' ? logSpec('business') : MONEY_LOG), business = space === 'business', today = localDate(), id = useId(), rules = useDeviceRecord(MONEY_RULES), review = useDeviceRecord(MONEY_REVIEW);
  const toReview = useMemo(() => new Set(review.data.ids), [review.data.ids]);
  const [kind, setKind] = useState<'expense' | 'income'>('expense'), [amount, setAmount] = useState(''), [category, setCategory] = useState<string>('Food & drink');
  const [note, setNote] = useState(''), [date, setDate] = useState(today), [problem, setProblem] = useState(''), [status, setStatus] = useState('');
  const [budgetDraft, setBudgetDraft] = useState<string | null>(null);
  // Session AV lane 2 (money): the entry's own marks in the form, and the search fold opened from a category (drill-down).
  const [paidWith, setPaidWith] = useState<PaidWith | ''>(''), [sub, setSub] = useState('');
  const [refund, setRefund] = useState(false), [refundOf, setRefundOf] = useState('');
  const [leftOut, setLeftOut] = useState(false), [tax, setTax] = useState(false), [spread, setSpread] = useState(1), [ownDraft, setOwnDraft] = useState('');
  const [drill, setDrill] = useState<{category?: string; from: string; to: string; n: number} | null>(null), searchFold = useRef<HTMLDetailsElement>(null);
  // Session AK RB (RELEASE_REVIEW_2 R2-8): the entry form and the weekly budget open from their buttons (an empty Wealth
  // showed both forms in full). Once open the entry form stays open for the next entry; a receipt draft opens it.
  const [logging, setLogging] = useState(false), [budgeting, setBudgeting] = useState(false), logButton = useRef<HTMLButtonElement>(null);
  // Session AK RB (R2-8): on a phone this week's list shows four entries, then "Show all" (every entry stays in the page;
  // Select mode lists them all).
  const weekMore = usePhoneShowAll(4);
  const currency = log.data.currency ?? log.data.budget?.currency ?? 'EUR';
  const [cur, setCur] = useState<string | null>(null), chosen = cur ?? currency;
  const room = useMemo(() => roomToSpend(log.data, today), [log.data, today]);
  const week = weekOf(today, log.data.weekStartsOn), month = monthOf(today);
  const weekEntries = useMemo(() => log.data.entries.filter(e => e.date >= week.start && e.date <= today).sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt)), [log.data.entries, week.start, today]);
  const monthCats = useMemo(() => byCategory(log.data.entries, month.start, month.end), [log.data.entries, month.start, month.end]);
  const monthWidths = useMemo(() => barWidths(monthCats.slice(0, 8)), [monthCats]);
  const monthTotals = useMemo(() => totals(log.data.entries, month.start, month.end), [log.data.entries, month.start, month.end]);
  // PR-052: an entry being edited in the same form (its amount, category, note and date), or null for a new one.
  const [editing, setEditing] = useState<MoneyEntry | null>(null);
  const clearMarks = () => { setLeftOut(false); setTax(false); setSpread(1); setPaidWith(''); setSub(''); setRefundOf(''); };
  /** Session AV lane 2, round 2: the form's subcategory and paid with, on an entry (cleared when the form has none). */
  const withQuick = (e: MoneyEntry): MoneyEntry => { const {sub: _s, paidWith: _p, ...rest} = e; void _s; void _p; return {...rest, ...(sub && e.kind === 'expense' ? {sub} : {}), ...(paidWith ? {paidWith} : {})}; };
  const endEdit = () => { setEditing(null); setRefund(false); setAmount(''); setNote(''); setDate(today); clearMarks(); setLogging(false); requestAnimationFrame(() => logButton.current?.focus()); };
  const [searching, setSearching] = useState(false);
  const [yesterdayOpen, setYesterdayOpen] = useState(false), [sheetOpen, setSheetOpen] = useState(false);
  // fix2011: on a phone "More about your money" opens by itself for /app/wealth#money-check (Settings → Your data links there).
  const phone = usePhoneActive(), [checkHash, setCheckHash] = useState(false);
  useEffect(() => { try { setCheckHash(window.location.hash === '#money-check'); } catch { /* no location: stays shut */ } }, []);
  const startEdit = (entry: MoneyEntry) => { setEditing(entry); setKind(entry.refund ? 'expense' : entry.kind); setRefund(!!entry.refund); setRefundOf(entry.refundOf ?? ''); setAmount(entry.amount); setCategory(entry.category); setNote(entry.note ?? ''); setDate(entry.date); setLeftOut(!!entry.excluded); setTax(!!entry.taxDeductible); setSpread(entry.spread ?? 1); setPaidWith(entry.paidWith ?? ''); setSub(entry.sub ?? ''); setProblem(''); setStatus(''); setLogging(true); requestAnimationFrame(() => amountField.current?.focus()); };
  const saveEdit = (entry: MoneyEntry) => {
    const checked = checkMoneyEdit(entry, {amount, category, note, date}, today);
    if (!checked.ok) return setProblem(checked.problem);
    // Session AV lane 2 (money): what changed goes into the entry's history (by you), with its marks.
    // Review B6O-4: a refund's share follows the shared purchase it names (lib/money-log/refunds.ts withRefundShare).
    const linked = (x: MoneyEntry): MoneyEntry => { if (!x.refund) return x; const {refundOf: _o, ...rest} = x; void _o; return withRefundShare(log.data.entries, refundOf ? {...rest, refundOf} : rest); };
    const at = new Date().toISOString(), marked = withMarks(changesBetween(entry, linked(withQuick(checked.entry)), 'you', at), {excluded: leftOut, taxDeductible: tax, spread: entry.kind === 'expense' ? spread : null}, at);
    // Session AV lane 2, round 4 (money, LEDGER #340): a checked entry whose amount changes is no longer checked against the bank.
    const kept = marked.checked && marked.amount !== entry.amount ? (() => { const {checked: _c, ...rest} = marked; void _c; return rest; })() : marked;
    void changeWithUndo(log.update, current => replaceEntry(current, kept), 'Saved.', {undone: 'Edit undone.', undoLabel: `Undo the edit to ${checked.entry.category}`})
      .then(() => { endEdit(); setStatus('Saved.'); }, () => setProblem('This could not be saved on this device. Nothing was changed.'));
  };
  const save = (event: FormEvent) => {
    event.preventDefault(); setProblem(''); setStatus('');
    if (editing) return saveEdit(editing);
    const checked = checkMoneyForm({amount, date, today});
    if (!checked.ok) return setProblem(checked.problem);
    const value = checked.amount;
    // Round 6 (#425): a refund is written as income with `refund` in its expense category, so an older build reads it as money received.
    const typed: MoneyEntry = {id: crypto.randomUUID(), kind: refund ? 'income' : kind, ...(refund ? {refund: true as const, ...(refundOf ? {refundOf} : {})} : {}), amount: value, currency: chosen, category: formCategory, ...(note.trim() ? {note: note.trim().slice(0, 200)} : {}), date, createdAt: new Date().toISOString(), source: 'form',
      ...(leftOut ? {excluded: true as const} : {}), ...(tax ? {taxDeductible: true as const} : {}), ...(kind === 'expense' && !refund && spread >= 2 ? {spread} : {}), ...(kind === 'expense' && !refund && sub ? {sub} : {}), ...(paidWith ? {paidWith} : {})};
    // Session AK (lane M, item 1): the person's rules run on a new entry too (first match wins); the status names it.
    const ruled = applyRules([withRefundShare(log.data.entries, typed)], rules.data.rules), entry = ruled.entries[0]!, byRule = ruled.changes.length > 0; // B6O-4
    try { log.update(current => addEntry(current, entry)); } catch { return setProblem('This could not be saved on this device. Nothing was changed.'); }
    if (note.trim()) keepPlace.current?.(note.trim());
    setAmount(''); setNote(''); clearMarks(); setStatus(`${refund ? 'Refund' : kind === 'expense' ? 'Spent' : 'Received'} ${money(Math.round(Number(value) * 100), chosen)} · ${categoryPath(entry)} · saved${refund ? `; it lowers ${entry.category}` : ''}${byRule ? ' (set by one of your rules)' : ''}.`);
  };
  // Session AL (3e): the one Undo toast; its restore puts the entry back in the LATEST money log (removeWithUndo).
  const remove = (entry: MoneyEntry) => { setStatus(''); void removeWithUndo(log.update, current => removeEntry(current, entry.id), `Removed: ${entry.category} ${money(Math.round(Number(entry.amount) * 100), entry.currency)}.`, 'Put back.').catch(() => setStatus('This could not be removed on this device.')); };
  const saveBudget = (event: FormEvent) => {
    event.preventDefault();
    const raw = budgetDraft ?? '';
    if (!raw.trim()) { log.update(current => { const {budget: _drop, ...rest} = current; void _drop; return rest; }); setBudgetDraft(null); setBudgeting(false); setStatus('Weekly budget removed.'); return; }
    const value = readAmount(raw); if (!value) return setProblem(sumProblem(raw) ?? 'Enter the weekly budget as an amount above zero.');
    log.update(current => ({...current, budget: {weekly: value, currency: chosen}})); setBudgetDraft(null); setBudgeting(false); setStatus(`Weekly budget set: ${money(Math.round(Number(value) * 100), chosen)}.`);
  };
  const share = room ? Math.max(0, Math.min(1, room.spent / Math.max(1, room.budget))) : 0, r = 46, circumference = 2 * Math.PI * r;
  const categories = useMemo(() => categoryChoices(log.data, kind), [log.data, kind]);
  // Session AV lane 2 (CI run 2007): your own categories speak through Spending's one live region (and a refusal through
  // the form's alert), not a second status line of their own inside the fold — Spending had two status lines at once.
  const addOwn = () => { setProblem(''); try { const name = ownDraft.trim().replace(/\s+/g, ' '); log.update(current => addOwnCategory(current, kind, name)); setCategory(name); setOwnDraft(''); setStatus(`${name} added to your categories.`); } catch (e) { setStatus(''); setProblem(e instanceof Error ? e.message : 'This could not be saved on this device.'); } };
  const removeOwn = (name: string) => { setProblem(''); try { log.update(current => removeOwnCategory(current, kind, name)); if (category === name) setCategory(categories[0]!); setStatus(`${name} removed from the choices; entries that use it keep it.`); } catch { setStatus(''); setProblem('This could not be saved on this device.'); } };
  const ownList = (kind === 'expense' ? log.data.own?.expense : log.data.own?.income) ?? [];
  const bulk = (ids: ReadonlySet<string>, action: BulkAction) => {
    const at = new Date().toISOString();
    // Session AV lane 2, round 4 (money, LEDGER #341): "Group" puts the selection in one named group (each entry still counts).
    if (action.kind === 'group') { try { groupEntries(log.data, ids, action.name, 'g'); } catch (e) { return e instanceof Error ? e.message : 'This could not be grouped.'; } const gid = `g_${crypto.randomUUID().slice(0, 12)}`; void changeWithUndo(log.update, current => groupEntries(current, ids, action.name, gid), `${ids.size} entries grouped as ${action.name.trim()}; each still counts on its own.`, {undone: 'Group undone.', undoLabel: `Undo the group ${action.name.trim()}`}).catch(() => setStatus('This could not be saved on this device. Nothing was changed.')); return null; }
    void changeWithUndo(log.update, current => action.kind === 'category' ? bulkCategory(current, ids, action.category, at) : bulkExcluded(current, ids, action.out, at), action.kind === 'category' ? `${ids.size} moved to ${action.category}.` : action.out ? `${ids.size} left out of the figures.` : `${ids.size} counted again.`, {undone: 'Change undone.', undoLabel: 'Undo the change to the selected entries'}).catch(() => setStatus('This could not be saved on this device. Nothing was changed.'));
    return null;
  };
  const openDrill = (c: string) => { setDrill(d => ({category: c, from: month.start, to: today, n: (d?.n ?? 0) + 1})); if (searchFold.current) searchFold.current.open = true; setSearching(true); requestAnimationFrame(() => searchFold.current?.querySelector<HTMLElement>('summary')?.scrollIntoView({block: 'start'})); };
  // Session AV lane 2, round 4 (money, LEDGER #338): a day on the month's calendar opens that day's entries in the search; focus goes to its summary.
  const openDay = (day: string) => { setDrill(d => ({from: day, to: day, n: (d?.n ?? 0) + 1})); if (searchFold.current) searchFold.current.open = true; setSearching(true); requestAnimationFrame(() => { const summary = searchFold.current?.querySelector<HTMLElement>('summary'); summary?.scrollIntoView({block: 'start'}); summary?.focus(); }); };
  // Session AK (#6): the three most used in the last 30 days first, then the usual order (counted, never stored).
  // Session AV lane 2, round 4 (money, LEDGER #342): an archived category never leads the chips.
  const hidden = useMemo(() => new Set(((kind === 'expense' ? log.data.archived?.expense : log.data.archived?.income) ?? []).map(c => c.toLowerCase())), [log.data.archived, kind]);
  const ordered = useMemo(() => categoriesRecentFirst(log.data.entries, kind, categories, today, undefined, hidden), [log.data.entries, kind, categories, today, hidden]);
  const [ownOpen, setOwnOpen] = useState(false);
  /** The form's category: a new entry never takes an archived one (the first category offered instead). */
  const formCategory = !editing && hidden.has(category.toLowerCase()) ? (categories[0] ?? category) : category;
  const suggested = useMemo(() => note.trim() ? pastCategory(log.data.entries.filter(e => e.id !== editing?.id), kind, note) : null, [log.data.entries, kind, note, editing?.id]);
  // Session AK (#7): Select mode on this week's list, with the running total of the picked entries.
  const [selecting, setSelecting] = useState(false), [picked, setPicked] = useState<ReadonlySet<string>>(() => new Set());
  const pickedSummary = useMemo(() => summarizeSelection(weekEntries, picked), [weekEntries, picked]);
  const togglePick = (entryId: string) => setPicked(current => { const next = new Set(current); if (!next.delete(entryId)) next.add(entryId); return next; });
  // Session AK (#18): this month as a list (as before) or as a map.
  const [monthView, setMonthView] = useState<'list' | 'map'>('list');
  // Session AK (#10): a draft from a receipt photo (Money tools → Receipt photos) fills this form; nothing is saved until Save.
  const amountField = useRef<HTMLInputElement>(null), noteField = useRef<HTMLInputElement>(null), latestEntries = useRef(log.data.entries);
  // Session AV lane 2, round 4 (money, LEDGER #346): while a typed place is chosen, Save keeps the note's payee with it.
  const keepPlace = useRef<KeepPayee>(null);
  useEffect(() => { latestEntries.current = log.data.entries; }, [log.data.entries]);
  useEffect(() => {
    const take = (event: Event) => {
      const d = (event as CustomEvent<MoneyDraft>).detail ?? {};
      // Session AV lane 2 (money; Monarch): a receipt whose amount and day are already in the log (an imported card payment)
      // opens that entry instead of drafting a second one.
      const same = draftAlreadyLogged(latestEntries.current, d);
      if (same) { setEditing(same); setKind(same.kind); setAmount(same.amount); setCategory(same.category); setNote(same.note ?? ''); setDate(same.date); setLeftOut(!!same.excluded); setTax(!!same.taxDeductible); setSpread(same.spread ?? 1); setPaidWith(same.paidWith ?? ''); setSub(same.sub ?? ''); setProblem(''); setStatus(`This receipt looks like ${(same.note ?? same.category).split(' · ')[0]} on ${formatDate(same.date)}, already in your log (the same amount). It is open below; keep its photo in Receipt photos.`); setLogging(true); requestAnimationFrame(() => amountField.current?.focus()); return; }
      setEditing(null); setKind('expense'); setRefund(false); setProblem('');
      if (d.amount) setAmount(d.amount);
      if (d.date) setDate(d.date);
      if (d.payee) setNote(d.payee.slice(0, 200));
      if (d.currency) setCur(d.currency);
      setStatus('A draft from your receipt photo is in the form. Check it, then Save.');
      setLogging(true);
      requestAnimationFrame(() => amountField.current?.focus());
    };
    window.addEventListener(MONEY_DRAFT_EVENT, take);
    return () => window.removeEventListener(MONEY_DRAFT_EVENT, take);
  }, []);
  // Opening the form puts the cursor in Amount.
  useEffect(() => { if (logging) amountField.current?.focus({preventScroll: false}); }, [logging]);
  // Session AV lane 2, round 4 (money; Lunch Money, LEDGER #341): a group of entries is one line in the list (not while selecting).
  const weekRows: ListRow[] = selecting ? weekEntries.map(entry => ({kind: 'entry', entry})) : groupRows(weekEntries, log.data.entries);
  const ungroupOne = (g: GroupSummary) => { void changeWithUndo(log.update, current => ungroup(current, g.id), `${g.name}: its ${g.entries.length} entries are on their own again.`, {undone: `${g.name} is a group again.`, undoLabel: `Undo ungrouping ${g.name}`}).catch(() => setStatus('This could not be saved on this device. Nothing was changed.')); };
  const entryItem = (e: MoneyEntry) => <li key={e.id}>
          {selecting && <label className="money-select-check"><input type="checkbox" checked={picked.has(e.id)} onChange={() => togglePick(e.id)} aria-label={`Select ${e.category} ${e.amount} ${e.currency} on ${formatDate(e.date)}`}/></label>}
          <span className="spending-entry-what">{toReview.has(e.id) && <span className="spending-review-dot" title="To review"><span className="visually-hidden">To review: </span></span>}<strong>{categoryPath(e)}</strong>{e.note && <span className="fine"> · {e.note}</span>}<span className="fine"> · <time dateTime={e.date}>{formatDate(e.date, {weekday: true, year: false})}</time></span>{/* Session AV lane 2 (P-32): "Sun, Nov 22", not the stored "2026-11-22" */}{e.paidWith && <span className="fine"> · {PAID_WITH_WORDS[e.paidWith].en}</span>}{!inFigures(e) ? <span className="money-mark"> · {e.transfer ? 'Transfer' : 'Left out'}</span> : e.refund ? <span className="money-mark"> · Refund</span> : null}{e.spread && <span className="money-mark"> · over {e.spread} months</span>}{e.checked && <span className="money-mark money-mark-checked" title={`Checked against your bank for ${formatDate(e.checked)}`}> · checked</span>}</span>
          <span className={`spending-amount${e.kind === 'income' ? ' spending-in' : ''}`}>{e.kind === 'income' ? '+' : '−'}{money(Math.round(Number(e.amount) * 100), e.currency)}</span>
          <span className="spending-entry-actions"><button type="button" className="text-link spending-edit" aria-label={`Edit ${e.category} ${e.amount} ${e.currency} on ${e.date}`} onClick={() => startEdit(e)}>Edit</button><button type="button" className="text-link spending-remove" aria-label={`Remove ${e.category} ${e.amount} ${e.currency} on ${e.date}`} onClick={() => { if (editing?.id === e.id) endEdit(); remove(e); }}>Remove</button></span>
        </li>;
  if (!log.loaded) return <p className="fine">Loading your spending…</p>;
  return <div className="spending-body">
    {showcase && <p className="fine spending-showcase">Fictional Showcase entries.</p>}
    {log.unreadable && <p role="alert">This device&rsquo;s spending log could not be read; new entries start a fresh one.</p>}
    <div className="spending-top">
      <div className="spending-room" role="group" aria-label={room ? "Room to spend this week" : "Room to spend" /* Session AV (L-7): this month's budgets show here when there is no weekly one */}>
        <svg viewBox="0 0 120 120" width="120" height="120" aria-hidden="true" focusable="false" className="spending-ring">
          <circle cx="60" cy="60" r={r} className="spending-ring-track"/>
          {room && <circle cx="60" cy="60" r={r} className={`spending-ring-fill${room.left < 0 ? ' spending-ring-over' : ''}`} strokeDasharray={`${circumference * share} ${circumference}`} transform="rotate(-90 60 60)"/>}
        </svg>
        <div className="spending-room-text">
          {room ? <><strong>{room.left >= 0 ? money(room.left, room.currency) : money(-room.left, room.currency)}</strong>
            <span>{room.left >= 0 ? `left of ${money(room.budget, room.currency)} this week` : `over this week's ${money(room.budget, room.currency)}`}</span>
            <span className="fine">{room.daysLeft === 1 ? 'Last day of the week' : `${room.daysLeft} days to go`} · spent {money(room.spent, room.currency)}</span></>
            : <Suspense fallback={<><strong>No weekly budget</strong><span className="fine">Set a weekly budget to see your room to spend.</span></>}><MonthRoom entries={log.data.entries} today={today}/></Suspense>}
        </div>
      </div>
      {!logging ? <div className="spending-actions"><button ref={logButton} type="button" className="primary" aria-expanded={false} aria-controls={`${id}-log`} onClick={() => setLogging(true)}>Log spending</button>{!showcase && <Suspense fallback={null}><SavedChips update={log.update} today={today} onSaid={setStatus}/></Suspense>}</div>
      : <form className="spending-form" id={`${id}-log`} onSubmit={save} aria-label={editing ? `Edit ${editing.category} ${editing.amount} ${editing.currency} on ${editing.date}` : 'Log spending or income'}>
        {editing && <EntryHistory entry={editing} other={editing.transfer ? log.data.entries.find(x => x.id === editing.transfer) : undefined} onUncheck={() => { const ent = editing; void changeWithUndo(log.update, current => uncheck(current, ent.id), 'No longer checked against your bank.', {undone: 'Checked again.', undoLabel: 'Undo: keep it checked'}).then(() => endEdit(), () => setProblem('This could not be saved on this device.')); }} onUntransfer={() => { const ent = editing; void changeWithUndo(log.update, current => setTransfer(current, ent.id, ent.transfer!, false, new Date().toISOString()), 'Counted again: no longer a transfer.', {undone: 'Transfer kept.', undoLabel: 'Undo: keep it a transfer'}).then(() => endEdit(), () => setProblem('This could not be saved on this device.')); }}/>}
        {editing ? <p className="spending-editing">Editing {editing.refund ? 'a refund' : editing.kind === 'income' ? 'money received' : 'spending'} in {editing.currency}: {editing.category} · {money(Math.round(Number(editing.amount) * 100), editing.currency)} · {formatDate(editing.date)}</p>
        : <div className="spending-kind" role="radiogroup" aria-label="Kind">
          {(['expense', 'income', 'refund'] as const).map(k => <label key={k} className="spending-chip"><input type="radio" name={`${id}-kind`} checked={k === 'refund' ? refund : !refund && kind === k} onChange={() => { const c = k === 'income' ? 'income' : 'expense'; if (c !== kind || refund !== (k === 'refund')) setCategory(categoryChoices(log.data, c)[0] ?? (c === 'expense' ? 'Food & drink' : 'Salary')); setKind(c); setRefund(k === 'refund'); setRefundOf(''); /* Session AV lane 2, round 4: the first category still offered. Round 6 (#425): a refund takes an expense category */ }}/><span>{/* fix2011: "Money back", so no chip's name holds a category's ("Refund" held "Fun": two radios answered to it) */}{k === 'expense' ? 'Spent' : k === 'income' ? 'Received' : 'Money back'}</span></label>)}
        </div>}
        <div className="spending-row">
          <label className="field"><span>Amount</span><input ref={amountField} inputMode="decimal" autoComplete="off" value={amount} onChange={e => setAmount(e.target.value)} placeholder="12.50" aria-describedby={`${id}-calc`}/></label>
          {!editing && <label className="field spending-currency"><span>Currency</span><select value={chosen} onChange={e => setCur(e.target.value)}>{[...new Set([currency, ...CURRENCIES])].map(c => <option key={c} value={c}>{c}</option>)}</select></label>}
          <label className="field"><span>Date</span><input type="date" value={date} max={today} min="1990-01-01" onChange={e => setDate(e.target.value)}/></label>
        </div>
        <CalcHint value={amount} id={`${id}-calc`}/>
        <fieldset className="spending-cats"><legend>Category</legend>{ordered.recent > 0 && <span className="fine spending-recent-note">Your most used lately come first.</span>}{withOwn(ordered.chips, editing?.category).map(c => <label key={c} className="spending-chip"><input type="radio" name={`${id}-cat`} checked={formCategory === c} onChange={() => { setCategory(c); setSub(''); }}/><span>{c}</span></label>)}</fieldset>
        <Suspense fallback={null}><FormExtras say={setStatus} log={log.data} update={log.update} category={formCategory} sub={sub} setSub={setSub} paidWith={paidWith} setPaidWith={setPaidWith} draft={{kind, amount: readAmount(amount), currency: editing?.currency ?? chosen, note: note.trim()}} editing={!!editing} keepPlace={keepPlace} onPayee={(payee, c) => { setNote(payee); if (c && !hidden.has(c.toLowerCase()) && categories.includes(c)) { setCategory(c); setSub(''); } }}/></Suspense>
        {refund && <Suspense fallback={null}><RefundOf entries={log.data.entries} draft={{id: editing?.id ?? '', currency: editing?.currency ?? chosen, category: formCategory, date}} amount={readAmount(amount)} value={refundOf} onChange={setRefundOf}/></Suspense>}
        <label className="field"><span>Note — optional</span><input ref={noteField} maxLength={200} value={note} onChange={e => setNote(e.target.value)} placeholder="Lunch with Sam"/></label>
        {/* Session AV (owner follow-up 1, F-CATEGORY-SUGGEST): the category this payee or note had before, offered, never chosen for you. */}
        {suggested && suggested.category !== formCategory && !hidden.has(suggested.category.toLowerCase()) && <p className="fine spending-suggest" role="status">Before, “{suggested.payee ?? note.trim()}” was {suggested.category}{suggested.times > 1 ? ` (${suggested.times} times)` : ''}. <button type="button" className="text-link" onClick={() => { setCategory(suggested.category); noteField.current?.focus(); /* Session AV (q2 rank 22): the hint goes, so focus returns to the note */ }}>Use {suggested.category}</button></p>}
        <SecretGuard text={note} onRemove={() => setNote('')}/>
        <details className="spending-own" onToggle={e => setOwnOpen((e.currentTarget as HTMLDetailsElement).open)}><summary>Your own categories{ownList.length ? ` (${ownList.length})` : ''}</summary>
          <p className="fine">Add a category of your own for {kind === 'expense' ? 'spending' : 'money received'}; it is offered here, in budgets and in To review.</p>
          <div className="spending-own-row"><label className="field"><span>New category</span><input value={ownDraft} maxLength={40} autoComplete="off" placeholder={kind === 'expense' ? 'Pets' : 'Side job'} onChange={e => setOwnDraft(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addOwn(); } }}/></label><button type="button" className="secondary" onClick={addOwn}>Add category</button></div>
          {ownList.length > 0 && <ul className="spending-own-list">{ownList.map(c => <li key={c}><span>{c}</span><button type="button" className="text-link" aria-label={`Remove ${c} from your categories`} onClick={() => removeOwn(c)}>Remove</button></li>)}</ul>}
          {ownOpen && <Suspense fallback={null}><CategoryMore log={log.data} update={log.update} kind={kind} onArchived={name => { if (category === name) setCategory(categoryChoices(log.data, kind).find(c => c !== name) ?? category); }}/></Suspense>}
        </details>
        {editing && editing.kind === 'expense' && !showcase && !business && <Suspense fallback={null}><ShareFold key={editing.id} entry={log.data.entries.find(x => x.id === editing.id) ?? editing} log={log.data} update={log.update} onDone={setStatus}/></Suspense>}
        <fieldset className="spending-marks"><legend className="visually-hidden">Marks</legend>
          <label className="spending-check"><input type="checkbox" checked={leftOut} onChange={e => setLeftOut(e.target.checked)}/><span>Not part of my spending <span className="fine">(card interest, a refund you passed on: kept in your log, left out of totals and budgets)</span></span></label>
          <label className="spending-check"><input type="checkbox" checked={tax} onChange={e => setTax(e.target.checked)}/><span>Tax-deductible <span className="fine">(your own mark, to find it later)</span></span></label>
          {kind === 'expense' && !refund && <label className="field spending-spread"><span>Count in budgets over</span><select value={spread} onChange={e => setSpread(Number(e.target.value))}><option value={1}>This month only</option>{[2, 3, 4, 6, 12, 24].map(n => <option key={n} value={n}>{n} months, a {n === 2 ? 'half' : n === 12 ? 'twelfth' : `1/${n}`} each</option>)}</select></label>}
        </fieldset>
        {problem && <p role="alert">{problem}</p>}
        <div className="spending-form-actions"><button type="submit" className="primary">{editing ? 'Save changes' : 'Save'}</button>{editing ? <button type="button" className="quiet" onClick={() => { setProblem(''); endEdit(); }}>Cancel edit</button> : <button type="button" className="quiet" onClick={() => { setLogging(false); setProblem(''); requestAnimationFrame(() => logButton.current?.focus()); }}>Done</button>}</div>
      </form>}
    </div>
    <p className="spending-status" role="status" aria-live="polite">{status}</p>
    {!showcase && !business && <Suspense fallback={null}><MoneyStreakLine entries={log.data.entries} today={today}/></Suspense>}
    {!showcase && <Suspense fallback={null}><UnusualLine entries={log.data.entries} today={today} update={log.update} onEdit={startEdit}/></Suspense>}
    <div className="spending-lists">
      <section aria-labelledby={`${id}-week`}>
        <div className="money-select-head"><h3 id={`${id}-week`}>This week</h3>
          {weekEntries.length > 0 && <span className="money-select-actions">
            {selecting && <button type="button" className="quiet" onClick={() => setPicked(picked.size === weekEntries.length ? new Set() : new Set(weekEntries.map(e => e.id)))}>{picked.size === weekEntries.length ? 'Clear' : 'Select all'}</button>}
            {/* A toggle keeps one name; its pressed state says whether Select mode is on (press it again to leave). */}
            <button type="button" className="quiet" aria-pressed={selecting} onClick={() => { setSelecting(v => !v); setPicked(new Set()); }}>Select</button>
          </span>}
        </div>
        {weekEntries.length ? <ul className={`spending-entries${selecting ? ' money-selecting' : ''}`} {...(selecting ? {} : weekMore.listProps(weekRows.length))}>{weekRows.map(row => row.kind === 'entry' ? entryItem(row.entry) : <GroupItem key={`g-${row.group.id}`} group={row.group} shown={row.shown} entry={entryItem} money={money} onUngroup={ungroupOne}/>)}</ul> : <p className="fine">Nothing logged this week yet.</p>}
        {!selecting && weekMore.button(weekRows.length, 'entries')}
        {selecting && weekEntries.length > 0 && <p className="money-select-total" aria-live="polite">{selectionLine(pickedSummary, money)}{pickedSummary.totals.length > 1 ? <span className="fine"> · each currency on its own, never converted</span> : null}</p>}
      </section>
      <section aria-labelledby={`${id}-month`}>
        <div className="money-select-head"><h3 id={`${id}-month`}>This month by category</h3>
          {monthCats.length > 0 && <span className="money-select-actions" role="group" aria-label="Show this month as">
            <button type="button" className="quiet" aria-pressed={monthView === 'list'} onClick={() => setMonthView('list')}>List</button>
            <button type="button" className="quiet" aria-pressed={monthView === 'map'} onClick={() => setMonthView('map')}>Map</button>
          </span>}
        </div>
        {monthView === 'map' && monthCats.length > 0 ? <Suspense fallback={<p className="fine" aria-busy="true">Drawing the map…</p>}><SpendingMap entries={log.data.entries} from={month.start} to={month.end}/></Suspense> : monthCats.length ? <ul className="spending-bars">{monthCats.slice(0, 8).map((c, i) => { const width = monthWidths[i]; /* Review B6O-5: no bar at or below zero */ return <li key={`${c.currency}-${c.category}`}>
          <span className="spending-bar-label"><button type="button" className="text-link spending-drill" aria-label={`See this month's ${c.category} entries`} onClick={() => openDrill(c.category)}>{c.category}</button></span><span className="spending-bar" aria-hidden="true">{width != null && <span style={{width: `${width}%`}}/>}</span><span className="spending-amount">{money(c.total, c.currency)}</span></li>; })}</ul>
          : <p className="fine">No spending logged this month.</p>}
        <Suspense fallback={null}><MonthExtras entries={log.data.entries} from={month.start} to={month.end}/></Suspense>
        {monthTotals.map(t => <p key={t.currency} className="fine">This month in {t.currency}: spent {money(t.expenses, t.currency)}, received {money(t.income, t.currency)}.</p>)}
      </section>
    </div>
    {/* Session AV lane 2 (fix2011, tests/pillar-phone-length.spec.ts): on a phone, Spending's later reading parts — Your money
        over time and round 5's and 6's folds (Yesterday's money, the spreadsheet, Check and tidy) — are one row, "More about
        your money", after Search, as Wealth's "More about your wealth" is; /app/wealth#money-check opens it. Desktop is as it was. */}
    {(() => {
      const yesterday = !business && log.data.entries.length > 0 && <details className="money-yesterday-fold" onToggle={e => setYesterdayOpen((e.currentTarget as HTMLDetailsElement).open)}><summary>Yesterday’s money</summary>{yesterdayOpen && <Suspense fallback={<p className="fine" aria-busy="true">Opening…</p>}><YesterdayMoney entries={log.data.entries} today={today} showcase={showcase}/></Suspense>}</details>, search = log.data.entries.length > 0 && <details ref={searchFold} className="money-search-fold" onToggle={e => setSearching((e.currentTarget as HTMLDetailsElement).open)}><summary>Search all your entries</summary>{searching && <Suspense fallback={<p className="fine" aria-busy="true">Opening the search…</p>}>{drill && <p className="fine money-drill-note" role="status">{drill.category ? `${drill.category} this month, from your list above. Select them to change several at once.` : `Entries on ${formatDate(drill.from)}, from the calendar of the month.`}</p>}<MoneySearch key={drill ? `${drill.category ?? drill.from}-${drill.n}` : 'all'} entries={log.data.entries} onEdit={startEdit} onBulk={bulk} onUngroup={ungroupOne} categories={categoryChoices(log.data, 'expense')} archived={[...(log.data.archived?.expense ?? []), ...(log.data.archived?.income ?? [])]} {...(drill ? {initial: drill.category ? {category: drill.category, from: drill.from, to: drill.to, kind: 'expense' as const} : {from: drill.from, to: drill.to}} : {})}/></Suspense>}</details>, sheet = log.data.entries.length > 0 && <details className="money-sheet-fold" onToggle={e => setSheetOpen((e.currentTarget as HTMLDetailsElement).open)}><summary>Your money as a spreadsheet</summary>{sheetOpen && <Suspense fallback={<p className="fine" aria-busy="true">Opening…</p>}><MoneySheet log={log.data} today={today} label={business ? 'business' : 'personal'}/></Suspense>}</details>, check = !business && log.data.entries.length > 0 && <Suspense fallback={null}><MoneyHousekeeping log={log} today={today} showcase={showcase}/></Suspense>, insights = <Suspense fallback={null}><SpendingInsights entries={log.data.entries} today={today} showcase={showcase} space={space} openDay={openDay} weekStartsOn={log.data.weekStartsOn}/></Suspense>;
      if (!phone) return <>{yesterday}{search}{sheet}{check}{insights}</>;
      const more = log.data.entries.length > 0, parts = ['Your money over time', ...(more && !business ? ['yesterday’s money'] : []), ...(more ? ['a spreadsheet'] : []), ...(more && !business ? ['check and tidy'] : [])];
      return <>{search}<PhoneFold label="More about your money" detail={parts.length > 2 ? `${parts[0]}, ${parts[1]} and ${parts.length - 2} more` : parts.join(' and ')} remembered={checkHash}><div className="spending-more">{yesterday}{sheet}{check}{insights}</div></PhoneFold></>;
    })()}
    {!showcase && !business && <Suspense fallback={null}><PeoplePanel log={log.data} update={log.update} today={today} currencies={[...new Set([currency, ...CURRENCIES])]}/></Suspense>}
    {!showcase && !business && <Suspense fallback={null}><StoreCards/></Suspense>}
    {!budgeting ? <p className="spending-budget-line"><button type="button" className="secondary" aria-expanded={false} onClick={() => setBudgeting(true)}>{log.data.budget ? 'Change weekly budget' : 'Set a weekly budget'}</button></p>
    : <form className="spending-budget" onSubmit={saveBudget} aria-label="Weekly budget">
      <label className="field"><span>Weekly budget ({chosen}) — leave empty for none</span><input inputMode="decimal" value={budgetDraft ?? (log.data.budget ? fromCents(Math.round(Number(log.data.budget.weekly) * 100)) : '')} onChange={e => setBudgetDraft(e.target.value)} aria-describedby={`${id}-budget-calc`}/></label>
      <CalcHint value={budgetDraft ?? ''} id={`${id}-budget-calc`}/>
      <label className="field"><span>Week starts on</span><select value={log.data.weekStartsOn} onChange={e => log.update(current => ({...current, weekStartsOn: e.target.value as 'monday' | 'sunday'}))}><option value="monday">Monday</option><option value="sunday">Sunday</option></select></label>
      {problem && !logging && <p role="alert">{problem}</p>}
      <div className="spending-form-actions"><button type="submit" className="secondary">Save budget</button><button type="button" className="quiet" onClick={() => { setBudgeting(false); setBudgetDraft(null); }}>Cancel</button></div>
    </form>}
    <p className="fine">Your own entries, kept on this device and in Export everything; amounts are never converted between currencies. Not financial advice.</p>
    {/* Session AK (lane M): buffer days, To review, Rules, Split an entry and the emergency sheet. */}
    {/* Session AK X1 (verification): while its chunk loads, Money tools says so (aria-busy, as Wealth's later parts do), so
        a reader of the page never takes the page without it for the whole page. */}
    {business ? <p className="fine">Money tools (To review, rules, receipts, the 60-day forecast) work on your personal space.</p> : <Suspense fallback={<div className="money-tools-loading" aria-busy="true" hidden/>}><MoneyTools showcase={showcase}/></Suspense>}
    {!showcase && <SpaceSetup/>}
  </div>;
}

/** Session AV lane 2 (money; Monarch's activity log): what changed on an entry, newest first, and its transfer twin. */
const FIELD_WORDS: Record<string, string> = {category: 'Category', amount: 'Amount', date: 'Date', note: 'Note', excluded: 'Counting', spread: 'Budgets over', transfer: 'Transfer'};
const BY_WORDS: Record<string, string> = {you: 'you', rule: 'one of your rules', bulk: 'you, with others at once', import: 'a re-import'};
function EntryHistory({entry, other, onUntransfer, onUncheck}: {entry: MoneyEntry; other?: MoneyEntry; onUntransfer: () => void; onUncheck?: () => void}) {
  const list = [...(entry.history ?? [])].reverse();
  return <>
    {entry.transfer && <p className="fine spending-transfer">A transfer{other ? ` with ${(other.note ?? other.category).split(' · ')[0]} (${other.kind === 'income' ? 'in' : 'out'}, ${formatDate(other.date)})` : ''}: both sides are left out of spending and income. <button type="button" className="text-link" onClick={onUntransfer}>Not a transfer</button></p>}
    {entry.checked && <p className="fine spending-transfer">Checked against your bank for {formatDate(entry.checked)}.{onUncheck && <> <button type="button" className="text-link" onClick={onUncheck}>Not checked</button></>}</p>}
    {list.length > 0 && <details className="spending-history"><summary>Changes to this entry ({list.length})</summary><ul>{list.map((h, i) => <li key={i}><span className="fine">{formatDate(h.at.slice(0, 10))}</span> · {FIELD_WORDS[h.field] ?? h.field}: {h.from ?? '—'} → {h.to ?? '—'} <span className="fine">(by {BY_WORDS[h.by] ?? h.by})</span></li>)}</ul></details>}
  </>;
}
