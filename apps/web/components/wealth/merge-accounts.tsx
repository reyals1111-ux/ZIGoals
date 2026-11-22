'use client';
import {useId, useRef, useState} from 'react';
import {useDeviceRecord} from '../ai/use-device-record';
import {ACCOUNTS, MAX_SNAPSHOTS, type Account} from '../../lib/accounts/schema';
import {MONEY_LOG} from '../../lib/money-log/schema';
import {MONEY_TAGS_RECORD} from '../../lib/money-tags/schema';
import {bankNamesFor, defaultAsName, mergeAccounts, mergeLog, mergeProblem, mergeTargets, planMerge, undoMergeAccounts, undoMergeLog, type MergeUndo} from '../../lib/money-log/merge-accounts';
import {formatDate, formatNumber} from '../../lib/visual-format';
import {showUndo} from '../ui/undo-toast';
import {moneyCents} from './money-tools/format';
import './spending/money-r5.css';

/**
 * Session AV lane 2, round 5 (money; Tiller's Data Cleanup, LEDGER #387): "Merge two accounts" in What you own or What
 * you owe, its own chunk, opened from the group's "Merge two" button: choose the account to merge and the one it goes
 * into (same currency, both owned or both owed); see what moves — balances, a debt's payments, the money-log entries of
 * the bank-file names chosen and the exact doubles that brings together, offered for removal; then merge, with Undo
 * (lib/money-log/merge-accounts.ts). Nothing is lost: the one merged is archived with its own history.
 */
const plural = (n: number, one: string, many: string) => `${formatNumber(n)} ${n === 1 ? one : many}`;
export default function MergeAccounts({list, title}: {list: readonly Account[]; title: string}) {
  const id = useId(), accounts = useDeviceRecord(ACCOUNTS), log = useDeviceRecord(MONEY_LOG), tags = useDeviceRecord(MONEY_TAGS_RECORD), heading = useRef<HTMLHeadingElement>(null);
  const [fromId, setFromId] = useState(list[1]?.id ?? ''), [intoId, setIntoId] = useState(list[0]?.id ?? '');
  const [names, setNames] = useState<string[] | null>(null), [asName, setAsName] = useState<string | null>(null), [keep, setKeep] = useState<Map<string, boolean>>(new Map()), [said, setSaid] = useState('');
  const ready = accounts.loaded && log.loaded && !accounts.unreadable && !log.unreadable;
  const from = accounts.data.items.find(a => a.id === fromId), targets = from ? mergeTargets(accounts.data, from.id) : [], into = targets.find(a => a.id === intoId) ?? null;
  const fromNames = from ? bankNamesFor(log.data, from) : [], intoNames = into ? bankNamesFor(log.data, into) : [];
  const chosenNames = names ?? fromNames.filter(n => n.own).map(n => n.name), name = asName ?? (into ? defaultAsName(log.data, into) : '');
  const problem = from && into ? mergeProblem(accounts.data, from.id, into.id) : from && !targets.length ? `No other active account in ${from.currency} on this side to merge ${from.name} into.` : 'Choose the two accounts.';
  const plan = (() => { if (!from || !into || problem) return null; try { return planMerge(accounts.data, log.data, from.id, into.id, chosenNames, name, tags.loaded && !tags.unreadable ? tags.data.tags : {}); } catch { return null; } })();
  // Review b5k #2: a copy that holds the person's own edits is never ticked for removal by default.
  const ticked = (d: NonNullable<typeof plan>['doubles'][number]) => keep.get(d.remove.id) ?? !d.edited;
  const removing = new Set((plan?.doubles ?? []).filter(ticked).map(d => d.remove.id));
  const reset = () => { setNames(null); setAsName(null); setKeep(new Map()); setSaid(''); };
  const merge = () => {
    if (!plan || !from || !into) { setSaid(problem ?? 'Choose the two accounts.'); return; }
    const at = new Date().toISOString(), fromBefore = from, intoBefore = into, shown = list.map(a => a.id);
    let added: MergeUndo['added'] = {snapshots: [], payments: []};
    try { accounts.update(current => { const out = mergeAccounts(current, fromBefore.id, intoBefore.id, at); added = out.added; return out.accounts; }); } catch { setSaid('This could not be saved on this device. Nothing was changed.'); return; }
    let undo: MergeUndo | null = null;
    try { log.update(current => { const out = mergeLog(current, plan, name, removing, shown); undo = {fromBefore, intoBefore, at, added, renamed: out.renamed, asName: name.trim().slice(0, 40), removed: out.removed, ...out.before, after: out.after}; return out.log; }); }
    catch { try { accounts.update(current => undoMergeAccounts(current, {fromBefore, intoBefore, added, at})); } catch { /* the accounts change stays; said below */ } setSaid('Your money log could not be saved on this device, so nothing was merged.'); return; }
    const done = undo as MergeUndo | null;
    const words = `${fromBefore.name} merged into ${intoBefore.name}: ${plural(plan.balances.moved, 'balance', 'balances')}${plan.payments ? `, ${plural(plan.payments, 'payment', 'payments')}` : ''} and ${plural(plan.entries.filter(x => !removing.has(x.id)).length, 'entry', 'entries')} moved${removing.size ? `, ${plural(removing.size, 'double', 'doubles')} removed` : ''}. ${fromBefore.name} is archived with its own history.`;
    reset(); setSaid(words); setFromId(''); requestAnimationFrame(() => heading.current?.focus());
    if (done) showUndo({message: words, undoLabel: `Undo merging ${fromBefore.name} into ${intoBefore.name}`, undone: `${fromBefore.name} and ${intoBefore.name} are as they were.`, restore: () => { accounts.update(current => undoMergeAccounts(current, done)); log.update(current => undoMergeLog(current, done)); }});
  };
  if (!ready) return <p className="fine" aria-busy="true">Opening…</p>;
  return <section className="money-merge" aria-labelledby={`${id}-title`}>
    <h4 id={`${id}-title`} ref={heading} tabIndex={-1}>Merge two accounts · {title}</h4>
    <p className="fine">After a bank changed its name, or a file named an account differently: one account&rsquo;s history goes into the other. Nothing is lost; the one merged is archived with its own history.</p>
    <div className="money-merge-pick">
      <label className="field"><span>Merge</span><select value={fromId} onChange={e => { setFromId(e.target.value); reset(); }}><option value="">Choose…</option>{list.map(a => <option key={a.id} value={a.id}>{a.name} ({a.currency})</option>)}</select></label>
      <label className="field"><span>into</span><select value={into?.id ?? ''} onChange={e => { setIntoId(e.target.value); reset(); }}><option value="">Choose…</option>{targets.map(a => <option key={a.id} value={a.id}>{a.name} ({a.currency})</option>)}</select></label>
    </div>
    {plan && from && into ? <>
      <ul className="money-merge-plan" aria-label="What the merge moves">
        <li>{plan.balances.moved ? `${plural(plan.balances.moved, 'balance', 'balances')} of ${from.name} ${plan.balances.moved === 1 ? 'goes' : 'go'} to ${into.name}` : `${from.name} has no balance to move`}{plan.balances.kept ? `; on ${plural(plan.balances.kept, 'day', 'days')} both have one, ${into.name}’s own stays` : ''}.</li>
        {plan.balances.capped > 0 && <li>{plural(plan.balances.capped, 'older balance', 'older balances')} of {from.name} stay on it only: {into.name} can hold {formatNumber(MAX_SNAPSHOTS)} balances, and its own are all kept.</li>}
        {plan.payments > 0 && <li>{plural(plan.payments, 'payment', 'payments')} on {from.name} go with them.</li>}
        {plan.note && <li>Its note joins {into.name}&rsquo;s: &ldquo;{plan.note}&rdquo;.</li>}
        <li>{into.name} takes the earlier place in your order, and the later day you checked either against your bank.</li>
        <li>{from.name} is then archived; its history stays on it.</li>
      </ul>
      {fromNames.length > 0 && <fieldset className="money-merge-names"><legend>Money-log entries from bank files named</legend>
        {fromNames.filter(n => !intoNames.some(x => x.own && x.name === n.name)).map(n => <label key={n.name} className="money-search-check"><input type="checkbox" checked={chosenNames.includes(n.name)} onChange={e => { setNames(e.target.checked ? [...chosenNames, n.name] : chosenNames.filter(x => x !== n.name)); setKeep(new Map()); }}/><span>{n.name} <span className="fine">({plural(log.data.entries.filter(x => x.currency === from.currency && x.account === n.name).length, 'entry', 'entries')})</span></span></label>)}
        <label className="field"><span>Their entries are then named</span><input value={name} maxLength={40} onChange={e => setAsName(e.target.value)} list={`${id}-names`}/></label>
        <datalist id={`${id}-names`}>{[into.name.slice(0, 40), ...intoNames.map(n => n.name)].map(n => <option key={n} value={n}/>)}</datalist>
        <p className="fine">{plan.entries.length ? `${plural(plan.entries.length, 'entry', 'entries')} take the name “${name.trim()}”.` : 'No entry is renamed.'}</p>
      </fieldset>}
      {plan.doubles.length > 0 && <fieldset className="money-merge-doubles"><legend>Doubles this brings together (the same day, amount and bank reference)</legend>
        <p className="fine">A copy that holds your own edits — a category, a split, a note, tags, marks or changes — is not ticked: look before you remove it.</p>
        <ul>{plan.doubles.map(d => <li key={d.remove.id}><label className="money-search-check"><input type="checkbox" checked={ticked(d)} onChange={e => { const on = e.target.checked; setKeep(k => new Map(k).set(d.remove.id, on)); }}/><span>Remove the copy {plan.entries.some(x => x.id === d.remove.id) ? `from ${from.name}` : `in ${into.name}`} of {(d.remove.note ?? d.remove.category).split(' · ')[0]} · {formatDate(d.remove.date)} · <span data-private-amount="">{moneyCents(Math.round(Number(d.remove.amount) * 100), d.remove.currency)}</span> <span className="fine">(ref {d.remove.ref}){d.differs.length ? ` — the two copies differ: ${d.differs.join(', ')}; the copy with your edits is kept` : ''}</span></span></label></li>)}</ul>
      </fieldset>}
      <button type="button" className="primary" onClick={merge}>Merge {from.name} into {into.name}</button>
    </> : <p className="fine">{problem}</p>}
    <p className="fine" role="status" aria-live="polite">{said}</p>
  </section>;
}
