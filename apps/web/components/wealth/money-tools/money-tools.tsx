'use client';
import {Suspense, lazy, useCallback, useId, useMemo, useState} from 'react';
import {useDeviceRecord} from '../../ai/use-device-record';
import {ACCOUNTS} from '../../../lib/accounts/schema';
import {localDate} from '../../../lib/local-date';
import {MONEY_LOG, type MoneyEntry} from '../../../lib/money-log/schema';
import {MONEY_RULES} from '../../../lib/money-rules/schema';
import {ruleFromEntry, type RuleDraft} from '../../../lib/money-rules/engine';
import {MONEY_REVIEW, toReview} from '../../../lib/money-review/review';
import {bufferDays, bufferSentence, bufferTrend} from '../../../lib/buffer-days/buffer';
import {moneyCents} from './format';
import './money-tools.css';

/**
 * Session AK (lane M): Money tools, inside Wealth → Spending (lazy-loaded after the Spending body). The buffer-days tile
 * is shown at once; each tool — To review, Rules, Split an entry and the emergency sheet — loads its own chunk only when
 * the person opens it. Everything reads and writes this device only.
 */
const ReviewInbox = lazy(() => import('./review-inbox'));
const RulesPanel = lazy(() => import('./rules-panel'));
const SplitPanel = lazy(() => import('./split-panel'));
const EmergencySheetPanel = lazy(() => import('./emergency-sheet'));
type Tool = 'review' | 'rules' | 'split' | 'sheet';

export default function MoneyTools({showcase = false}: {showcase?: boolean}) {
  const id = useId(), today = localDate();
  const log = useDeviceRecord(MONEY_LOG), accounts = useDeviceRecord(ACCOUNTS), review = useDeviceRecord(MONEY_REVIEW), rules = useDeviceRecord(MONEY_RULES);
  const [open, setOpen] = useState<Tool | null>(null), [prefill, setPrefill] = useState<RuleDraft | null>(null);
  const buffer = useMemo(() => accounts.loaded && !accounts.unreadable && log.loaded ? bufferDays(accounts.data, log.data.entries, today) : null, [accounts.loaded, accounts.unreadable, accounts.data, log.loaded, log.data.entries, today]);
  const pending = useMemo(() => toReview(review.data, log.data.entries).length, [review.data, log.data.entries]);
  const makeRule = useCallback((entry: MoneyEntry) => { setPrefill(ruleFromEntry(entry)); setOpen('rules'); }, []);
  const used = useCallback(() => setPrefill(null), []);
  const tools: [Tool, string][] = [['review', `To review (${pending})`], ['rules', `Rules (${rules.data.rules.length})`], ['split', 'Split an entry'], ['sheet', 'If something happens to me']];
  return <section className="money-tools" aria-labelledby={`${id}-title`}>
    <h3 id={`${id}-title`}>Money tools</h3>
    <div className="money-buffer" role="group" aria-label="Buffer days">
      <p className="eyebrow">BUFFER DAYS</p>
      {!buffer ? <p className="fine">{accounts.unreadable ? 'Your accounts could not be read on this device, so this cannot be worked out now.' : 'Loading…'}</p>
        : buffer.length ? buffer.slice(0, 3).map(row => <div key={row.currency} className="money-buffer-row">
          {row.known && <strong className="money-buffer-days">{row.missingBalances ? '≥ ' : ''}{row.days}<span> {row.days === 1 ? 'day' : 'days'}</span></strong>}
          <p>{bufferSentence(row)}</p>
          {row.known && <p className="fine">{moneyCents(row.cashCents, row.currency)} in cash and savings ÷ about {moneyCents(row.dailyCents, row.currency)} a day over the last {row.windowDays} days{row.missingBalances ? `; ${row.missingBalances} cash ${row.missingBalances === 1 ? 'account has' : 'accounts have'} no balance yet` : ''}. {bufferTrend(row) ?? ''}</p>}
        </div>)
        : <p className="fine">This cannot be worked out yet. Add a cash or savings account with its balance (What you have → Accounts) and log your spending here; the tile then shows how many days your cash covers.</p>}
    </div>
    <div className="money-tools-buttons" role="group" aria-label="Money tools">
      {tools.map(([tool, label]) => <button key={tool} type="button" className="secondary" aria-expanded={open === tool} aria-controls={`${id}-panel`} onClick={() => setOpen(o => o === tool ? null : tool)}>{tool === 'review' && pending > 0 && <span className="money-review-dot" aria-hidden="true"/>}{label}</button>)}
    </div>
    <div id={`${id}-panel`}>
      <Suspense fallback={<p className="fine">Loading…</p>}>
        {open === 'review' && <ReviewInbox log={log} review={review} onMakeRule={makeRule}/>}
        {open === 'rules' && <RulesPanel rules={rules} log={log} prefill={prefill} onPrefillUsed={used}/>}
        {open === 'split' && <SplitPanel log={log} onMakeRule={makeRule}/>}
        {open === 'sheet' && <EmergencySheetPanel showcase={showcase}/>}
      </Suspense>
    </div>
  </section>;
}
