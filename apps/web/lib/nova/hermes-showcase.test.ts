import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {describe, expect, it} from 'vitest';
import {buildShowcase} from '../showcase-data';
import {HERMES_SHOWCASE_EXAMPLE, hermesShowcaseLines} from './hermes-showcase';
import {NOVA_HERMES_KEY} from './hermes-record';

/** Session AK WA (N11): the Showcase's Hermes example is labelled, honest and makes no connection anywhere. */
describe('the Showcase\'s Hermes example', () => {
  it('says it is an example in every line but the person\'s own question, and says nothing is contacted', () => {
    expect(HERMES_SHOWCASE_EXAMPLE.honest).toMatch(/not a real gateway/);
    expect(HERMES_SHOWCASE_EXAMPLE.honest).toMatch(/Nothing on your computer or on the internet is contacted/);
    for (const line of hermesShowcaseLines().filter(l => !l.startsWith('You:') && !l.startsWith('NOVA:') && !l.startsWith('With your own data'))) expect(line, line).toMatch(/example/i);
  });
  it('is words only: no request path, no stored record, so NOVA never counts the Showcase as connected', () => {
    const src = readFileSync(join(__dirname, 'hermes-showcase.ts'), 'utf8'), view = readFileSync(join(__dirname, '../../components/nova/hermes/hermes-example.tsx'), 'utf8');
    for (const s of [src, view]) { expect(s).not.toMatch(/fetch\(|from '\.\/hermes'|hermes'\)|useDeviceRecord|updateDeviceRecord|localStorage/); }
    expect(Object.keys(buildShowcase('2026-11-01').records)).not.toContain(NOVA_HERMES_KEY);
  });
  it('is mounted on the Hermes guide only while the Showcase is on', () => {
    const guide = readFileSync(join(__dirname, '../../components/nova/hermes/hermes-guide.tsx'), 'utf8');
    expect(guide).toMatch(/\{showcase && <LoadBoundary quiet><Suspense fallback=\{null\}><HermesShowcaseExample\/>/);
  });
});
