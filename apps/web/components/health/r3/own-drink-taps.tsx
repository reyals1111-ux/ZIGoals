'use client';
import {newHealthId, type HealthData} from '../../../lib/health';
import {addWater, undoWaterLog} from '../../../lib/health-daily';
import {setDrink} from '../../../lib/health-extras';
import {ownDrinks, tapNote} from '../../../lib/own-drinks';
import type {OwnDrink} from '../../../lib/health-extras';
import {formatNumber} from '../../../lib/visual-format';
import {showUndo} from '../../ui/undo-toast';
import {useOneTap} from '../one-tap';
import {zigiSignals} from '../../zigi/bus';
import {useHealth} from '../use-health';
import {useHealthExtras} from '../meal-names';
import './health-r3.css';

type Perform = (updater: (latest: HealthData) => HealthData, message: string, after?: () => void) => Promise<void>;
const now = () => new Date().toISOString();

/**
 * Session AW (p5-fixes; ADR-045 D-CI2026's late row): the Water card's own drinks, one tap each, drawn with the card. They
 * were part of the card's lazy "more" (water-more.tsx), so the row arrived a moment after the page answered and pushed
 * the amount field down (and took the keyboard's next Tab). The row's code is small and already on the card's page; the
 * rest of that part (the tip, the drinks' energy line, "Your drinks", reminders) still loads on its own.
 * The same buttons, words and Undo as before (Session AV lane 2, LEDGER #280).
 */
export function OwnDrinkTaps({date, perform}: {date: string; perform: Perform}) {
  const {extras, update} = useHealthExtras(), store = useHealth(), sameTap = useOneTap() /* FR-S-11 */, drinks = ownDrinks(extras);
  function tap(d: OwnDrink, at: number) {
    if (!sameTap.tap(at)) return;
    const id = newHealthId(), note = tapNote(d);
    void perform(latest => addWater(latest, {id, date, amountMilli: d.sizeMl * 1000, unit: 'ml'}, now()), `${d.name} recorded.`, () => {
      try { update(r => setDrink(r, id, note.type, note.caffeineMg, note.more)); } catch { /* the entry is saved; only the drink note could not be kept */ }
      zigiSignals.emitValidated('health_log_recorded');
      sameTap.shown(showUndo({message: `${d.name} logged: ${formatNumber(d.sizeMl)} mL.`, undone: 'Water entry removed.', restore: () => store.update(undoWaterLog(id))}));
    });
  }
  if (!drinks.length) return null;
  return <div className="actions r3-own-drinks" role="group" aria-label="Your drinks, one tap each">{drinks.map(d => <button type="button" className="secondary" key={d.id} data-drink-colour={d.colour ?? 'blue'} aria-label={`Log ${d.name}, ${formatNumber(d.sizeMl)} mL`} onClick={e => tap(d, e.timeStamp)}><span aria-hidden="true" className="r3-drink-symbol">{d.symbol ?? '💧'}</span> {d.name} <small>{formatNumber(d.sizeMl)} mL</small></button>)}</div>;
}
