'use client';
import {useId, useMemo, useState, type FormEvent} from 'react';
import type {DeviceRecordState} from '../ai/use-device-record';
import {dueBeforePayday, nextPayday} from '../../lib/bills/month';
import type {BillsRecord} from '../../lib/bills/schema';
import type {CurrencyForecast} from '../../lib/cash-forecast/model';
import {readMoneyAmount} from '../../lib/money-log/form';
import type {MoneyLog} from '../../lib/money-log/schema';
import {lowBalanceCross, paydayCash} from '../../lib/money-notices';
import {centsText, moneyCents, moneyWhole} from '../wealth/money-tools/format';
import {formatDate} from '../../lib/visual-format';

/**
 * Session AV lane 2 (money; Rocket Money's Payday view and low-balance alerts): under "Next 60 days" — the next payday
 * the money log shows, the bills due before it, and the cash the forecast leaves the day before; and the person's own
 * line ("tell me when cash goes below €200"), with the first day the forecast crosses it (also on Today's Money line).
 * The forecast's own figures; a model, not a promise.
 */
const about = (cents: bigint, currency: string) => moneyWhole(centsText(cents), currency);
export default function PaydayLow({rows, log, bills, today}: {rows: readonly CurrencyForecast[]; log: DeviceRecordState<MoneyLog>; bills: BillsRecord; today: string}) {
  const id = useId(), pay = useMemo(() => nextPayday(log.data.entries, today), [log.data.entries, today]);
  const due = useMemo(() => pay ? dueBeforePayday(bills, log.data.entries, today, pay.date).find(d => d.currency === pay.currency) ?? null : null, [pay, bills, log.data.entries, today]);
  const left = useMemo(() => paydayCash(rows, pay), [rows, pay]), line = log.data.lowBalance, cross = useMemo(() => lowBalanceCross(rows, line), [rows, line]);
  const currencies = rows.filter(r => r.known).map(r => r.currency);
  const [draft, setDraft] = useState(''), [cur, setCur] = useState(line?.currency ?? currencies[0] ?? 'EUR'), [problem, setProblem] = useState(''), [note, setNote] = useState('');
  const save = (e: FormEvent) => {
    e.preventDefault(); setProblem('');
    if (!draft.trim()) { log.update(current => { const {lowBalance: _l, ...rest} = current; void _l; return rest; }); setNote('Low-balance line removed.'); return; }
    const value = readMoneyAmount(draft); if (!value) { setProblem('Enter the amount as a number above zero, for example 200.'); return; }
    log.update(current => ({...current, lowBalance: {amount: value, currency: cur}})); setDraft(''); setNote(`Saved: you will see it when the forecast goes below ${moneyCents(Math.round(Number(value) * 100), cur)}.`);
  };
  return <div className="cash-forecast-extra">
    <section aria-labelledby={`${id}-pay`}>
      <h5 id={`${id}-pay`}>Until payday</h5>
      {!pay ? <p className="fine">Your money log shows no regular monthly income yet (two entries from one source about a month apart), so there is no payday to count to.</p>
        : <p>Next payday: <strong>{formatDate(pay.date)}</strong> ({pay.source}). {due ? `${moneyCents(due.cents, due.currency)} in ${due.count} ${due.count === 1 ? 'bill' : 'bills'} before it, not yet in your log. ` : 'No tracked bill falls due before it. '}
          {left ? <>The forecast leaves about <strong>{about(left.cents, left.currency)}</strong> on {formatDate(left.date)}, after the bills and your everyday spending until then.</> : `With no ${pay.currency} cash or savings balance, what is left cannot be worked out.`}</p>}
    </section>
    <section aria-labelledby={`${id}-low`}>
      <h5 id={`${id}-low`}>Low-balance line</h5>
      {line ? <p>{cross ? <>Your forecast goes below <strong>{moneyCents(Number(cross.line), cross.currency)}</strong> around <strong>{formatDate(cross.date)}</strong> (about {about(cross.cents, cross.currency)}). Today&rsquo;s Money line says so too.</> : <>Your forecast stays above {moneyCents(Math.round(Number(line.amount) * 100), line.currency)} for the next 60 days.</>}</p>
        : <p className="fine">Set an amount you do not want your cash to go below; when the forecast crosses it, Today&rsquo;s Money line names the day.</p>}
      <form className="cash-forecast-low-form" onSubmit={save} aria-label="Low-balance line" noValidate>
        <label className="field"><span>{line ? 'New line — leave empty to remove it' : 'Tell me when cash goes below'}</span><input inputMode="decimal" autoComplete="off" value={draft} placeholder={line ? line.amount : '200'} onChange={e => setDraft(e.target.value)}/></label>
        {currencies.length > 1 && <label className="field"><span>Currency</span><select value={cur} onChange={e => setCur(e.target.value)}>{currencies.map(c => <option key={c} value={c}>{c}</option>)}</select></label>}
        <button type="submit" className="secondary">{line && !draft.trim() ? 'Remove the line' : 'Save the line'}</button>
        {problem && <p className="field-error" role="alert">{problem}</p>}
      </form>
      <p className="fine" role="status">{note}</p>
    </section>
  </div>;
}
