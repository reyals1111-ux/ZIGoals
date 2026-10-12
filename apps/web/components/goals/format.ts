import {formatDate} from '../../lib/visual-format';
/** A calendar day ("2026-03-14") in the person's own way, with the month in words ("14 March 2026"); never shifted by a zone. */
export const formatDay = (day: string) => formatDate(`${day}T12:00:00Z`, {day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC'});
/** A month and year ("March 2026"). */
export const formatMonth = (day: string) => formatDate(`${day.slice(0, 7)}-15T12:00:00Z`, {month: 'long', year: 'numeric', timeZone: 'UTC'});
