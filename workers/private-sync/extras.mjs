import {sessionAllowed} from './sessions.mjs';
/**
 * Session AB-Cloud Part 2 ([TIER 3] (sync), ADR-023 C1): the encrypted extras sections, in their own keyspace inside the
 * account's vault object, the Portfolio's pattern (portfolio.mjs) for four named sections:
 *   `extras:<section>` (the head: revision, generation, epoch, part count, bytes, and for `health` the Health domain
 *   generation it was written under), `extras-part:<section>:<n>` (the sealed parts of one snapshot) and
 *   `extras-receipt:<operation>`.
 * The vault's own reads, writes, compaction, domain deletion and rotation touch `record:` and `rotation-row:` keys only, so
 * an older client never sees or removes these copies; the account erase removes every key of the object, these included.
 *
 * A write replaces one section's snapshot, compare-and-swap on its revision; `generation` counts that section's deletions.
 * Writes are refused while a key rotation is staged and must be sealed at the active epoch; after a rotation the parts left
 * at the old epoch read as stale and a device that holds the records uploads them again. The `health` section follows the
 * Health domain: when the person deletes Health from the cloud (the domain generation moves past the one it was written
 * under), the section is removed with it, so Health-describing extras never outlive a Health deletion. Answers carry no
 * part contents beyond the sealed envelopes.
 */
export const EXTRAS_SECTIONS = ['goals', 'life', 'habits', 'health'];
/** Per section, as the Portfolio: one snapshot fits one relay request (the app's relay reads at most 1,010,000 bytes). */
export const EXTRAS_PARTS_MAX = 16, EXTRAS_BYTES_MAX = 1_000_000, EXTRAS_RECEIPTS_KEPT = 64;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
/** @param {unknown} value @param {number} [status] */
const reply = (value, status = 200) => Response.json(value, {status, headers: {'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff'}});
/** @param {any} value @param {string[]} keys */
const exact = (value, keys) => value && typeof value === 'object' && !Array.isArray(value) && Object.keys(value).length === keys.length && keys.every(k => Object.hasOwn(value, k));
const count = (/** @type {unknown} */ v) => Number.isSafeInteger(v) && /** @type {number} */ (v) >= 0;
/** @typedef {{revision:number,generation:number,epoch:number|null,parts:number,bytes:number,healthGeneration?:number}} ExtrasHead */
const empty = () => /** @type {ExtrasHead} */ ({revision: 0, generation: 0, epoch: null, parts: 0, bytes: 0});
const partKeys = (/** @type {string} */ section, /** @type {number} */ n) => Array.from({length: n}, (_, i) => `extras-part:${section}:${i}`);

/**
 * A section's head, after the Health rule: a `health` snapshot written under an earlier Health domain generation than the
 * vault's now is removed (its parts deleted, a deletion counted) before anything reads or writes it.
 * @param {RecordTransaction} store @param {string} section @returns {Promise<ExtrasHead>}
 */
async function head(store, section) {
  const current = /** @type {ExtrasHead|undefined} */ (await store.get(`extras:${section}`)) ?? empty();
  if (section !== 'health' || !current.parts) return current;
  const healthGeneration = (/** @type {Record<string,number>} */ (await store.get('domain-generations') ?? {})).health ?? 0;
  if ((current.healthGeneration ?? 0) >= healthGeneration) return current;
  await store.delete(partKeys(section, current.parts));
  const next = {revision: current.revision + 1, generation: current.generation + 1, epoch: null, parts: 0, bytes: 0};
  await store.put(`extras:${section}`, next);
  return next;
}

/**
 * Session AB-Cloud Gate B (security read, finding 3): called inside the transaction that applies a Health domain deletion
 * (the person's own, or one the lifecycle authority reconciles), so the sealed Health extras go with it at once instead of
 * waiting for the next extras request. The same rule as `head`: written under an earlier Health generation → removed.
 * @param {RecordTransaction} store
 */
export async function settleHealthExtras(store) { await head(store, 'health'); }

/**
 * GET `?section=<name>`: that section's head and sealed parts. GET without a section: every section's head (no parts), so a
 * device fetches parts only for a section that changed. POST {protocol:1, action:'put', vault, operation, section, base,
 * generation, epoch, parts} replaces a section's snapshot; {protocol:1, action:'delete', vault, operation, section, base,
 * generation} removes it and counts a deletion. Both are idempotent per operation id.
 * @param {Request} request @param {RecordState} state @param {(request:Request,max?:number)=>Promise<any>} readJSON
 * @param {(envelope:unknown)=>boolean} validEnvelope @param {string|null} sessionHash
 */
export async function extrasRequest(request, state, readJSON, validEnvelope, sessionHash) {
  if (request.method === 'GET') {
    const asked = new URL(request.url).searchParams.get('section');
    if (asked !== null && !EXTRAS_SECTIONS.includes(asked)) return reply({error: 'INVALID_EXTRAS_REQUEST'}, 400);
    return state.storage.transaction(async store => {
      if (await store.get('account-deleted')) return reply({error: 'ACCOUNT_DELETED'}, 410);
      if (!await sessionAllowed(store, sessionHash)) return reply({error: 'SESSION_REVOKED'}, 401);
      if (asked === null) {
        /** @type {Record<string, {revision:number,generation:number,epoch:number|null,parts:number}>} */
        const sections = {};
        for (const section of EXTRAS_SECTIONS) { const h = await head(store, section); sections[section] = {revision: h.revision, generation: h.generation, epoch: h.epoch, parts: h.parts}; }
        return reply({protocol: 1, sections});
      }
      const current = await head(store, asked), parts = current.parts ? await store.get(partKeys(asked, current.parts)) : new Map();
      if (parts.size !== current.parts) return reply({error: 'EXTRAS_UNAVAILABLE'}, 503);
      return reply({protocol: 1, section: asked, revision: current.revision, generation: current.generation, epoch: current.epoch, parts: partKeys(asked, current.parts).map(k => parts.get(k))});
    });
  }
  if (request.method !== 'POST') return reply({error: 'METHOD_NOT_ALLOWED'}, 405);
  if (request.headers.get('content-type')?.split(';')[0]?.trim() !== 'application/json') return reply({error: 'JSON_REQUIRED'}, 415);
  /** @type {any} */ let input;
  try { input = await readJSON(request, 1_010_000); } catch { return reply({error: 'INVALID_OR_OVERSIZED_REQUEST'}, 400); }
  const put = input?.action === 'put';
  if (!exact(input, put ? ['protocol', 'action', 'vault', 'operation', 'section', 'base', 'generation', 'epoch', 'parts'] : ['protocol', 'action', 'vault', 'operation', 'section', 'base', 'generation'])
    || input.protocol !== 1 || !['put', 'delete'].includes(input.action) || !EXTRAS_SECTIONS.includes(input.section) || !UUID.test(input.vault) || !UUID.test(input.operation) || !count(input.base) || !count(input.generation)
    || put && (!Number.isSafeInteger(input.epoch) || input.epoch < 1 || !Array.isArray(input.parts) || !input.parts.length || input.parts.length > EXTRAS_PARTS_MAX || !input.parts.every(validEnvelope)))
    return reply({error: 'INVALID_EXTRAS_REQUEST'}, 400);
  const digest = [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(JSON.stringify(input))))].map(v => v.toString(16).padStart(2, '0')).join('');
  return state.storage.transaction(async store => {
    if (await store.get('account-deleted')) return reply({error: 'ACCOUNT_DELETED'}, 410);
    if (!await sessionAllowed(store, sessionHash)) return reply({error: 'SESSION_REVOKED'}, 401);
    if (await store.get('rotation')) return reply({error: 'ROTATION_IN_PROGRESS'}, 409);
    const manifest = await store.get('manifest');
    if (!manifest) return reply({error: 'ENROLL_FIRST'}, 409);
    if (manifest.vault !== input.vault) return reply({error: 'VAULT_CHANGED'}, 409);
    if (put && input.epoch !== manifest.epoch) return reply({error: 'EPOCH_RETIRED'}, 409);
    const receipt = await store.get(`extras-receipt:${input.operation}`);
    if (receipt) return receipt.digest === digest ? reply({revision: receipt.revision, generation: receipt.generation, replayed: true}) : reply({error: 'OPERATION_REUSED'}, 409);
    const current = await head(store, input.section);
    if (current.generation !== input.generation) return reply({error: 'EXTRAS_DELETED', generation: current.generation}, 409);
    if (current.revision !== input.base) return reply({error: 'REVISION_CONFLICT', revision: current.revision}, 409);
    const bytes = put ? input.parts.reduce((/** @type {number} */ n, /** @type {unknown} */ part) => n + JSON.stringify(part).length, 0) : 0;
    if (bytes > EXTRAS_BYTES_MAX) return reply({error: 'EXTRAS_CAPACITY'}, 507);
    if (current.parts) await store.delete(partKeys(input.section, current.parts));
    const healthGeneration = input.section === 'health' ? (/** @type {Record<string,number>} */ (await store.get('domain-generations') ?? {})).health ?? 0 : undefined;
    /** @type {ExtrasHead} */
    const next = put ? {revision: current.revision + 1, generation: current.generation, epoch: input.epoch, parts: input.parts.length, bytes, ...(healthGeneration !== undefined ? {healthGeneration} : {})}
      : {revision: current.revision + 1, generation: current.generation + 1, epoch: null, parts: 0, bytes: 0};
    const seq = (/** @type {number|undefined} */ (await store.get('extras-seq')) ?? 0) + 1;
    /** @type {Record<string, unknown>} */
    const writes = {[`extras:${input.section}`]: next, 'extras-seq': seq, [`extras-receipt:${input.operation}`]: {digest, section: input.section, revision: next.revision, generation: next.generation, seq}};
    if (put) input.parts.forEach((/** @type {unknown} */ part, /** @type {number} */ i) => { writes[`extras-part:${input.section}:${i}`] = part; });
    await store.put(writes);
    // Keep the newest receipts only (FIX_PLAN B5's horizon): an operation replayed after that many later writes is refused as a conflict.
    const receipts = await store.list({prefix: 'extras-receipt:'});
    if (receipts.size > EXTRAS_RECEIPTS_KEPT) await store.delete([...receipts].sort(([, a], [, b]) => a.seq - b.seq).slice(0, receipts.size - EXTRAS_RECEIPTS_KEPT).map(([key]) => key));
    return reply({revision: next.revision, generation: next.generation});
  });
}
