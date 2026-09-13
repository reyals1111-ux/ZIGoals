import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { isDeepStrictEqual } from 'node:util';

export const schema = JSON.parse(readFileSync(new URL('../../docs/release/artifact-manifest.schema.json', import.meta.url), 'utf8'));
export const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
const fail = message => { throw new Error(message); };
// This deliberately implements only the keywords present in our fixed schema.
// Unknown keywords fail closed so schema changes cannot silently bypass checks.
const keywords = new Set(['$schema', '$id', 'title', 'type', 'const', 'enum', 'minimum', 'maximum', 'minLength', 'maxLength', 'pattern', 'minItems', 'maxItems', 'items', 'additionalProperties', 'required', 'properties', 'allOf', 'if', 'then']);
function check(value, rule, path = 'manifest') {
  for (const key of Object.keys(rule)) if (!keywords.has(key)) fail(`Unsupported schema keyword: ${key}`);
  if ('const' in rule && !isDeepStrictEqual(value, rule.const)) fail(`${path}: wrong constant`);
  if (rule.enum && !rule.enum.includes(value)) fail(`${path}: unknown value`);
  if (rule.type === 'object') {
    if (!value || typeof value !== 'object' || Array.isArray(value)) fail(`${path}: expected object`);
  } else if (rule.type === 'array') {
    if (!Array.isArray(value)) fail(`${path}: expected array`);
    if (value.length < rule.minItems || value.length > rule.maxItems) fail(`${path}: invalid count`);
    value.forEach((item, index) => check(item, rule.items, `${path}[${index}]`));
  } else if (rule.type === 'string') {
    if (typeof value !== 'string' || value.length < rule.minLength || value.length > rule.maxLength || (rule.pattern && !new RegExp(rule.pattern).test(value))) fail(`${path}: invalid string`);
  } else if (rule.type === 'integer') {
    if (!Number.isSafeInteger(value) || value < rule.minimum || value > rule.maximum) fail(`${path}: invalid integer`);
  } else if (rule.type) fail(`${path}: unsupported schema type`);
  if (rule.properties && value && typeof value === 'object' && !Array.isArray(value)) {
    for (const key of rule.required ?? []) if (!Object.hasOwn(value, key)) fail(`${path}.${key}: missing`);
    if (rule.additionalProperties === false) for (const key of Object.keys(value)) if (!Object.hasOwn(rule.properties, key)) fail(`${path}.${key}: unknown field`);
    for (const [key, field] of Object.entries(rule.properties)) if (Object.hasOwn(value, key)) check(value[key], field, `${path}.${key}`);
  }
  // Partial array rules in the conditional schema have no type/items.
  if (!rule.type && Array.isArray(value) && ((rule.minItems && value.length < rule.minItems) || (rule.maxItems && value.length > rule.maxItems))) fail(`${path}: invalid count`);
  for (const member of rule.allOf ?? []) check(value, member, path);
  if (rule.if) {
    let matches = true;
    try { check(value, rule.if, path); } catch { matches = false; }
    if (matches) check(value, rule.then, path);
  }
}
export function validateManifest(manifest) {
  if (Buffer.byteLength(JSON.stringify(manifest) ?? '') > 32768) fail('Manifest exceeds 32 KiB');
  check(manifest, schema);
  if (manifest.independentBuildCount !== manifest.builds.length) fail('Independent build count disagrees');
  for (const build of manifest.builds) if (!Number.isFinite(Date.parse(build.builtAt)) || new Date(build.builtAt).toISOString() !== build.builtAt) fail('Invalid measured timestamp');
  const identities = manifest.builds.map(b => `${b.repository}/${b.runId}/${b.runAttempt}/${b.job}`);
  if (new Set(identities).size !== identities.length) fail('Build jobs are not distinct');
  // Different attempts/runs can be compared separately, but must not masquerade
  // as the two jobs of one canonical workflow run.
  const run = manifest.builds[0];
  if (manifest.builds.some(b => b.repository !== run.repository || b.runId !== run.runId || b.runAttempt !== run.runAttempt)) fail('Build workflow identity mismatch');
  return manifest;
}
export function verifyBuild({ expectedCommit, manifest, wasm }) {
  if (!/^[a-f0-9]{40}$/.test(expectedCommit ?? '')) fail('Expected commit must be an independently trusted full SHA');
  validateManifest(manifest);
  if (manifest.source.commit !== expectedCommit) fail('Source commit mismatch');
  if (!Buffer.isBuffer(wasm) || wasm.length !== manifest.artifact.sizeBytes || sha256(wasm) !== manifest.artifact.sha256) fail('Actual Wasm bytes/hash/size mismatch');
  return true;
}
export function verifyCandidate(input) {
  verifyBuild(input);
  if (input.manifest.status !== 'REPRODUCIBLE' || input.manifest.independentBuildCount !== 2) fail('Candidate requires two independently verified builds');
  return true;
}
export function compareBuilds({ expectedCommit, left, right }) {
  verifyBuild({ expectedCommit, ...left });
  verifyBuild({ expectedCommit, ...right });
  if (left.manifest.status !== 'BUILD_VERIFIED' || right.manifest.status !== 'BUILD_VERIFIED') fail('Compare requires single-build evidence');
  if (!left.wasm.equals(right.wasm)) fail('Independent Wasm bytes differ');
  for (const field of ['source', 'environment', 'artifact']) if (!isDeepStrictEqual(left.manifest[field], right.manifest[field])) fail(`${field} disagreement`);
  const result = { ...structuredClone(left.manifest), status: 'REPRODUCIBLE', independentBuildCount: 2, builds: [...structuredClone(left.manifest.builds), ...structuredClone(right.manifest.builds)] };
  verifyCandidate({ expectedCommit, manifest: result, wasm: left.wasm });
  return result;
}
