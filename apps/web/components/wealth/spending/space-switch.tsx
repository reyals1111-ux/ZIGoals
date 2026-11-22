'use client';
import {useId, useRef, useState, type FormEvent} from 'react';
import {useDeviceRecord} from '../../ai/use-device-record';
import {MONEY_MORE} from '../../../lib/money-more/schema';
import {showSpace, spaceName, spaceOf, withBusiness, withoutBusiness, type MoneySpace} from '../../../lib/money-more/spaces';
import {showUndo} from '../../ui/undo-toast';
import './space-switch.css';

/**
 * Session AV lane 2, round 2 (money; Emma's Spaces): the money space shown in Spending and Budgets on Wealth — Personal,
 * or the person's business space with its own entries, budgets and totals (its own records, lib/money-more/spaces.ts).
 * Inside Wealth's own sections only: the shell, Today, NOVA and the rest of Wealth keep reading Personal, so nothing of
 * the protected baseline changes. `SpaceSwitch` shows only once a business space exists; `SpaceSetup` starts or ends it.
 */
export function useMoneySpace(): {space: MoneySpace; ready: boolean} {
  const more = useDeviceRecord(MONEY_MORE);
  return {space: more.loaded && !more.unreadable ? spaceOf(more.data) : 'personal', ready: more.loaded};
}
export default function SpaceSwitch({where}: {where: 'spending' | 'budgets'}) {
  const id = useId(), more = useDeviceRecord(MONEY_MORE);
  if (!more.loaded || more.unreadable || !more.data.business) return null;
  const space = spaceOf(more.data), choose = (s: MoneySpace) => { try { more.update(m => showSpace(m, s)); } catch { /* a write that fails leaves the space shown as it was */ } };
  return <div className="money-space" role="radiogroup" aria-labelledby={`${id}-l`}>
    <span id={`${id}-l`} className="money-space-label">Space</span>
    {(['personal', 'business'] as const).map(s => <label key={s} className="money-space-chip"><input type="radio" name={`${id}-space`} checked={space === s} onChange={() => choose(s)}/><span>{spaceName(more.data, s)}</span></label>)}
    {space === 'business' && <p className="fine money-space-note">{where === 'spending' ? `${spaceName(more.data, 'business')}: its own entries and totals. Today, NOVA, bills and the rest of Wealth use Personal.` : `${spaceName(more.data, 'business')}: its own budgets, from its own entries.`}</p>}
  </div>;
}
/** At the foot of Spending: start a business space, rename it, or end its switch (its records stay until erased). */
export function SpaceSetup() {
  const id = useId(), more = useDeviceRecord(MONEY_MORE), [open, setOpen] = useState(false), [name, setName] = useState(''), [problem, setProblem] = useState(''), button = useRef<HTMLButtonElement>(null);
  if (!more.loaded || more.unreadable) return null;
  const has = !!more.data.business;
  const save = (e: FormEvent) => { e.preventDefault(); try { more.update(m => withBusiness(m, name || 'Business')); setOpen(false); setProblem(''); requestAnimationFrame(() => document.querySelector<HTMLInputElement>('.money-space input:checked')?.focus()); } catch (cause) { setProblem(cause instanceof Error ? cause.message : 'Not saved on this device.'); } };
  const end = () => { const before = more.data; more.update(m => withoutBusiness(m)); showUndo({message: 'The business space is hidden; its entries and budgets stay on this device (and in Export everything) until you erase them.', undone: 'The business space is back.', restore: () => more.update(() => before)}); requestAnimationFrame(() => button.current?.focus()); };
  return <div className="money-space-setup">
    {!open ? <p className="fine"><button ref={button} type="button" className="text-link" aria-expanded={false} onClick={() => { setOpen(true); setName(more.data.business?.name ?? ''); }}>{has ? `Rename the ${more.data.business!.name} space` : 'Keep business money apart: add a business space'}</button>{has && <> · <button type="button" className="text-link" onClick={end}>End the business space</button></>}</p>
    : <form className="money-space-form" onSubmit={save} aria-label={has ? 'Rename the business space' : 'Add a business space'}>
      <label className="field"><span>Name of the space</span><input value={name} maxLength={30} autoComplete="off" placeholder="Business" aria-describedby={`${id}-n`} onChange={e => setName(e.target.value)}/></label>
      <p id={`${id}-n`} className="fine">Its own entries, budgets and totals, chosen at the top of Spending and Budgets. Your personal money is not changed.</p>
      {problem && <p role="alert">{problem}</p>}
      <div className="budgets-form-actions"><button type="submit" className="secondary">{has ? 'Rename' : 'Add the space'}</button><button type="button" className="quiet" onClick={() => { setOpen(false); setProblem(''); }}>Cancel</button></div>
    </form>}
  </div>;
}
