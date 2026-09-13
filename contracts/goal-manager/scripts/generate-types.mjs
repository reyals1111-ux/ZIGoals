import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { compile } from 'json-schema-to-typescript';

// Rust's write_api schema is the only source for these public types.
const contract = new URL('../', import.meta.url);
const api = JSON.parse(await readFile(new URL('schema/zigoals-goal-manager.json', contract), 'utf8'));
const schemas = [api.instantiate, api.execute, api.query, ...Object.values(api.responses)];
const definitions = {};
for (const schema of schemas) {
  for (const [name, definition] of Object.entries(schema.definitions ?? {})) {
    if (definitions[name] && JSON.stringify(definitions[name]) !== JSON.stringify(definition)) {
      throw new Error(`Conflicting schema definition: ${name}`);
    }
    definitions[name] = definition;
  }
}
for (const schema of schemas) {
  const { $schema, definitions: nested, ...definition } = schema;
  if (definitions[schema.title] && JSON.stringify(definitions[schema.title]) !== JSON.stringify(definition)) {
    // Inline response schemas may duplicate their equivalent nested type.
    const prior = { ...definitions[schema.title] };
    delete prior.title;
    const current = { ...definition };
    delete current.title;
    if (JSON.stringify(prior) !== JSON.stringify(current)) throw new Error(`Conflicting top-level schema: ${schema.title}`);
  }
  definitions[schema.title] = definition;
}
const result = await compile({
  title: 'ContractTypes',
  anyOf: schemas.map(schema => ({ $ref: `#/definitions/${schema.title}` })),
  definitions,
}, 'ContractTypes', {
  bannerComment: '/* Generated from Rust CosmWasm schemas. Run contracts/goal-manager/scripts/generate-types.mjs; do not edit. */',
  unreachableDefinitions: true,
  additionalProperties: false,
});
const output = new URL('../../packages/shared-types/src/contract.generated.ts', contract);
await writeFile(output, result);
console.log(`Generated ${fileURLToPath(output)}`);
