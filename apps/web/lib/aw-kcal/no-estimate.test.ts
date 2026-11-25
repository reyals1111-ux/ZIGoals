import {existsSync, readdirSync, readFileSync, statSync} from 'node:fs';
import {join} from 'node:path';
import {describe, expect, test} from 'vitest';

/**
 * Session AW (kcal; owner decision 1a and amendment 4, ADR-046; UNFINISHED BL-13 "No calorie expenditure is estimated"):
 * the app's own code holds no estimate of the calories burned — no MET table, no "kcal used", no "burned about" — on any
 * page, widget, answer, export, Showcase or Help. The estimated maintenance (energy card, maintenance estimator,
 * highlights) is a different figure and stays, labelled "an estimate, not medical advice".
 */
const WEB = join(__dirname, '..', '..');
const sources = (dir: string): string[] => !existsSync(join(WEB, dir)) ? [] : readdirSync(join(WEB, dir)).flatMap(name => {
  const path = join(dir, name);
  return statSync(join(WEB, path)).isDirectory() ? sources(path) : /\.(ts|tsx)$/.test(name) && !/\.test\.|\.spec\./.test(name) ? [path] : [];
});
const FILES = ['app', 'components', 'lib'].flatMap(sources).filter(f => !f.includes('evals'));
const ESTIMATE = [/\bactivityKcalEstimate\b/, /\bACTIVITY_MET\b/, /\bMET values?\b/, /\bkcal used\b/i, /\bcalories used\b/i, /\bburned about\b/i, /\bkcal burned\b(?! *·)/i, /\bcalories (?:burned|you burned) (?:is|are|was|were) (?:about|roughly|around)\b/i, /\benergy (?:it|they|this activity) used\b/i];

describe('no estimated calorie burn anywhere', () => {
  test('the source holds none of the words or helpers an estimate would need', () => {
    const found = FILES.flatMap(f => { const s = readFileSync(join(WEB, f), 'utf8'); return ESTIMATE.filter(r => r.test(s)).map(r => `${f}: ${r}`); });
    expect(found).toEqual([]);
  });
  test('the estimated maintenance stays, and every place it shows says it is an estimate, not medical advice', () => {
    for (const f of ['components/health/energy-card.tsx', 'components/health/maintenance-estimator.tsx', 'components/health/health-highlights.tsx', 'components/health/coach-card.tsx'])
      expect(readFileSync(join(WEB, f), 'utf8'), f).toMatch(/estimate, not medical advice/i);
  });
  test('imported active energy names its source on the Health page and in the answers', () => {
    expect(readFileSync(join(WEB, 'components/bottom-health-trends.tsx'), 'utf8')).toMatch(/Active energy · kcal, \$\{energySourceWords\(/);
    expect(readFileSync(join(WEB, 'lib/ai/local-answers/engine.ts'), 'utf8')).toContain("', from your file'");
  });
});
