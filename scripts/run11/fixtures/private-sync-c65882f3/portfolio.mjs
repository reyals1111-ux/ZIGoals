import {sessionAllowed} from './sessions.mjs';
/**
 * Session U Part 9 (ADR-013): the opt-in encrypted copy of a person's Portfolio, in its own keyspace inside the account's
 * vault object: `portfolio` (the head: revision, generation, epoch, part count, bytes) and `portfolio-part:<n>` (sealed
 * parts of one snapshot), plus `portfolio-receipt:<operation>`. The vault's own reads, writes, compaction, domain deletion
 * and rotation touch `record:` and `rotation-row:` keys only, so an older client never sees or removes this copy; the
 * account erase removes every key of the object, this one included.
 *
 * A write replaces the whole snapshot, compare-and-swap on the revision. `generation` counts deletions: a device that
 * synced before a deletion sees it changed and stops instead of uploading again. Writes are refused while a key rotation
 * is staged and must be sealed at the active epoch; after a rotation the parts left at the old epoch read as stale and
 * a device that has the Portfolio uploads it again. Answers carry no part contents beyond the sealed envelopes.
 */
/** One snapshot fits one relay request (the app's relay reads at most 1,010,000 bytes); the client checks the same sealed size (PORTFOLIO_SEALED_MAX). */
export const PORTFOLIO_PARTS_MAX = 16, PORTFOLIO_BYTES_MAX = 1_000_000, PORTFOLIO_RECEIPTS_KEPT = 64;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
/** @param {unknown} value @param {number} [status] */
const reply = (value, status = 200) => Response.json(value, {status, headers: {'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff'}});
/** @param {any} value @param {string[]} keys */
const exact = (value, keys) => value && typeof value === 'object' && !Array.isArray(value) && Object.keys(value).length === keys.length && keys.every(k => Object.hasOwn(value, k));
const count = (/** @type {unknown} */ v) => Number.isSafeInteger(v) && /** @type {number} */ (v) >= 0;
/** @typedef {{revision:number,generation:number,epoch:number|null,parts:number,bytes:number}} PortfolioHead */
/** @param {RecordTransaction} store @returns {Promise<PortfolioHead>} */
const head = async store => (await store.get('portfolio')) ?? {revision: 0, generation: 0, epoch: null, parts: 0, bytes: 0};
const partKeys = (/** @type {number} */ n) => Array.from({length: n}, (_, i) => `portfolio-part:${i}`);

/**
 * GET: the head and its sealed parts. POST: {protocol:1, action:'put', vault, operation, base, generation, epoch, parts}
 * replaces the snapshot; {protocol:1, action:'delete', vault, operation, base, generation} removes it and counts a
 * deletion. Both are idempotent per operation id.
 * @param {Request} request @param {RecordState} state @param {(request:Request,max?:number)=>Promise<any>} readJSON
 * @param {(envelope:unknown)=>boolean} validEnvelope @param {string|null} sessionHash
 */
export async function portfolioRequest(request, state, readJSON, validEnvelope, sessionHash) {
  if (request.method === 'GET') return state.storage.transaction(async store => {
    if (await store.get('account-deleted')) return reply({error: 'ACCOUNT_DELETED'}, 410);
    if (!await sessionAllowed(store, sessionHash)) return reply({error: 'SESSION_REVOKED'}, 401);
    const current = await head(store), parts = current.parts ? await store.get(partKeys(current.parts)) : new Map();
    if (parts.size !== current.parts) return reply({error: 'PORTFOLIO_UNAVAILABLE'}, 503);
    return reply({protocol: 1, revision: current.revision, generation: current.generation, epoch: current.epoch, parts: partKeys(current.parts).map(k => parts.get(k))});
  });
  if (request.method !== 'POST') return reply({error: 'METHOD_NOT_ALLOWED'}, 405);
  if (request.headers.get('content-type')?.split(';')[0]?.trim() !== 'application/json') return reply({error: 'JSON_REQUIRED'}, 415);
  /** @type {any} */ let input;
  try { input = await readJSON(request, 1_010_000); } catch { return reply({error: 'INVALID_OR_OVERSIZED_REQUEST'}, 400); }
  const put = input?.action === 'put';
  if (!exact(input, put ? ['protocol', 'action', 'vault', 'operation', 'base', 'generation', 'epoch', 'parts'] : ['protocol', 'action', 'vault', 'operation', 'base', 'generation'])
    || input.protocol !== 1 || !['put', 'delete'].includes(input.action) || !UUID.test(input.vault) || !UUID.test(input.operation) || !count(input.base) || !count(input.generation)
    || put && (!Number.isSafeInteger(input.epoch) || input.epoch < 1 || !Array.isArray(input.parts) || !input.parts.length || input.parts.length > PORTFOLIO_PARTS_MAX || !input.parts.every(validEnvelope)))
    return reply({error: 'INVALID_PORTFOLIO_REQUEST'}, 400);
  const digest = [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(JSON.stringify(input))))].map(v => v.toString(16).padStart(2, '0')).join('');
  return state.storage.transaction(async store => {
    if (await store.get('account-deleted')) return reply({error: 'ACCOUNT_DELETED'}, 410);
    if (!await sessionAllowed(store, sessionHash)) return reply({error: 'SESSION_REVOKED'}, 401);
    if (await store.get('rotation')) return reply({error: 'ROTATION_IN_PROGRESS'}, 409);
    const manifest = await store.get('manifest');
    if (!manifest) return reply({error: 'ENROLL_FIRST'}, 409);
    if (manifest.vault !== input.vault) return reply({error: 'VAULT_CHANGED'}, 409);
    if (put && input.epoch !== manifest.epoch) return reply({error: 'EPOCH_RETIRED'}, 409);
    const receipt = await store.get(`portfolio-receipt:${input.operation}`);
    if (receipt) return receipt.digest === digest ? reply({revision: receipt.revision, generation: receipt.generation, replayed: true}) : reply({error: 'OPERATION_REUSED'}, 409);
    const current = await head(store);
    if (current.generation !== input.generation) return reply({error: 'PORTFOLIO_DELETED', generation: current.generation}, 409);
    if (current.revision !== input.base) return reply({error: 'REVISION_CONFLICT', revision: current.revision}, 409);
    const bytes = put ? input.parts.reduce((/** @type {number} */ n, /** @type {unknown} */ part) => n + JSON.stringify(part).length, 0) : 0;
    if (bytes > PORTFOLIO_BYTES_MAX) return reply({error: 'PORTFOLIO_CAPACITY_EXPORT_REQUIRED'}, 507);
    if (current.parts) await store.delete(partKeys(current.parts));
    /** @type {PortfolioHead} */
    const next = put ? {revision: current.revision + 1, generation: current.generation, epoch: input.epoch, parts: input.parts.length, bytes}
      : {revision: current.revision + 1, generation: current.generation + 1, epoch: null, parts: 0, bytes: 0};
    /** @type {Record<string, unknown>} */
    const writes = {portfolio: next, [`portfolio-receipt:${input.operation}`]: {digest, revision: next.revision, generation: next.generation}};
    if (put) input.parts.forEach((/** @type {unknown} */ part, /** @type {number} */ i) => { writes[`portfolio-part:${i}`] = part; });
    await store.put(writes);
    // Keep the newest receipts only: an operation replayed after that many later writes is refused as a conflict.
    const receipts = await store.list({prefix: 'portfolio-receipt:'});
    if (receipts.size > PORTFOLIO_RECEIPTS_KEPT) await store.delete([...receipts].sort(([, a], [, b]) => a.revision - b.revision).slice(0, receipts.size - PORTFOLIO_RECEIPTS_KEPT).map(([key]) => key));
    return reply({revision: next.revision, generation: next.generation});
  });
}
