import {formatSignedGoalAmount} from '../../lib/goal-summary';
import {amount} from './common';

/** A signed amount of a currency in cents, as Wealth shows it. Session X P2.3: its own module, so Today's "For you" can
 *  use it without loading the whole Wealth page (its accounts editor, importers and charts). */
export const wealthMoney=(n:bigint,currency:string)=>formatSignedGoalAmount(n<0n,amount((n<0n?-n:n).toString(),2),currency);
