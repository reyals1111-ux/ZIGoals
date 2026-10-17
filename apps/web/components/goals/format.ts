import {formatDate, formatMonth as monthText} from '../../lib/visual-format';
/** A calendar day ("2026-03-14") as the medium date ("14 Mar 2026"); never shifted by a zone. */
export const formatDay = (day: string) => formatDate(day);
/** A month and year ("Mar 2026"). */
export const formatMonth = (day: string) => monthText(day.slice(0, 7));
