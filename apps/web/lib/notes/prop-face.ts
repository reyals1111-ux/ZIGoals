import {formatDate, formatNumber} from '../visual-format';
import type {NoteProp} from './schema';

/**
 * Session AV lane 2 (review B3C-13): the Properties fold's face — its first three properties as the table and board show
 * them: a day and a number through the app's own formatters, a tick as yes or no. Pure.
 */
export const propFaceValue = (p: NoteProp): string => p.t === 'tick' ? (p.v ? 'yes' : 'no') : p.t === 'date' ? formatDate(p.v) : p.t === 'number' ? formatNumber(p.v) : p.v;
export const propsFace = (props: readonly NoteProp[] | undefined): string | null => props?.length ? props.slice(0, 3).map(p => `${p.k}: ${propFaceValue(p)}`).join(', ') : null;
