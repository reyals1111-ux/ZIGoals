/**
 * Session AK P4 (docs/review/session-ak/FIRST_RUN_REVIEW.md, FR-11): after "Test connection" finds a local server's models,
 * one is chosen already (marked "Suggested") so Connect works at once: the guide's own pick when it is installed, else the
 * largest installed chat model that fits the memory chosen in the guide, else the first. A model that runs in a cloud
 * (Ollama's `remote_host`) is never suggested while a model on this computer is listed.
 */
export type ModelChoice = {id: string; cloud?: true};
/** A model's size in billions of parameters from its name ("qwen3:8b" → 8, "llama3.2:3b" → 3, "Qwen3.5-9B-Q4" → 9). */
export function paramsOf(id: string): number | null {
  const m = /(?:^|[:\-_/ ])(\d+(?:\.\d+)?)b(?![a-z0-9])/i.exec(id);
  return m ? Number(m[1]) : null;
}
const sameModel = (id: string, want: string) => { const a = id.toLowerCase(), b = want.toLowerCase(); return a === b || a === `${b}:latest` || a.replace(/:latest$/, '') === b; };
export function suggestModel(models: readonly ModelChoice[], {prefer = [], maxParams = null}: {prefer?: readonly string[]; maxParams?: number | null} = {}): string | null {
  const local = models.filter(m => !m.cloud), pool = local.length ? local : models;
  for (const want of prefer) { const hit = pool.find(m => sameModel(m.id, want)); if (hit) return hit.id; }
  if (maxParams !== null) {
    const fits = pool.map(m => ({id: m.id, p: paramsOf(m.id)})).filter((m): m is {id: string; p: number} => m.p !== null && m.p <= maxParams);
    if (fits.length) return fits.reduce((best, m) => m.p > best.p ? m : best).id;
  }
  return pool[0]?.id ?? null;
}
