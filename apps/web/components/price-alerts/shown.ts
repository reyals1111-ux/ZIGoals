/**
 * Session AV (fresh-agent check q2, rank 35): the alerts already shown as a toast in this tab, shared by the app-wide
 * check (price-alerts.tsx) and a portfolio page's own check (portfolio-value-alert.tsx), so one firing is one toast.
 */
const shown = new Set<string>();
/** True the first time for an alert id in this tab, false after. */
export function firstShow(id: string): boolean { if (shown.has(id)) return false; shown.add(id); return true; }
