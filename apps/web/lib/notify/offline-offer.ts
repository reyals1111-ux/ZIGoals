import type {OfflineJob} from '../offline-queue/queue';
import {EXCHANGE_NAMES, isExchange} from '../exchanges/allowlist';

/**
 * Session AK Part 3, security review F6: what the person asked for while offline is OFFERED again when the connection is
 * back (a toast with a link), never run by itself. An exchange read happens only when the person taps "Read now": the
 * link carries a one-time token that only this tab's memory knows, so a link typed or shared from elsewhere reads nothing,
 * and a token works once. Nothing here is stored.
 */
const offered = new Map<string, string>();
const MAX_OFFERED = 20;
export const READ_PARAM = 'read';
export const PORTFOLIO_PATH = '/app/portfolio';

/** The toast for one queued job. An exchange read gets a link with a fresh one-time token. */
export function offerFor(job: Pick<OfflineJob, 'kind' | 'value'>): {message: string; link: {href: string; label: string}} | null {
  if (job.kind === 'food-lookup') return {message: `You’re back online. Look up barcode ${job.value} now?`, link: {href: `/app/health?barcode=${job.value}`, label: 'Look it up'}};
  if (job.kind !== 'exchange-refresh' || !isExchange(job.value)) return null;
  const token = crypto.randomUUID();
  offered.set(token, job.value);
  while (offered.size > MAX_OFFERED) offered.delete(offered.keys().next().value!);
  return {message: `You’re back online. Read ${EXCHANGE_NAMES[job.value]} now?`, link: {href: `${PORTFOLIO_PATH}?${READ_PARAM}=${token}`, label: 'Read now'}};
}
/** The exchange a tapped "Read now" link asked for, once; null for any token this tab did not offer or already used. */
export function takeOfferedRead(token: string | null | undefined): string | null {
  if (!token) return null;
  const exchange = offered.get(token) ?? null;
  offered.delete(token);
  return exchange;
}
