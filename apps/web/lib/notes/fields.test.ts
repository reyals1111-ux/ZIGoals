import {readFileSync, readdirSync} from 'node:fs';
import {join} from 'node:path';
import {describe, expect, test} from 'vitest';
import {parseBlocks} from '../ai/safe-render';
import {parseLinks} from './links';

const DIR = join(__dirname, '..', '..', 'components', 'notes');
const sources = readdirSync(DIR).filter(f => f.endsWith('.tsx')).map(f => ({file: f, text: readFileSync(join(DIR, f), 'utf8')}));

describe('Notes fields and rendering stay safe', () => {
  test('every free-text field in Notes has the secret guard beside it', () => {
    for (const {file, text} of sources) {
      const fields = (text.match(/<textarea\b/g)?.length ?? 0) + (text.match(/<input\b(?![^>]*\btype=)[^>]*>/g)?.length ?? 0);
      const guards = text.match(/<SecretGuard\b/g)?.length ?? 0;
      expect(guards, `${file}: ${fields} text field(s), ${guards} guard(s)`).toBeGreaterThanOrEqual(fields);
    }
  });
  test('nothing in Notes writes HTML or runs text', () => {
    for (const {file, text} of sources) expect(text, file).not.toMatch(/dangerouslySetInnerHTML|innerHTML\s*=|\beval\(|new Function\(/);
  });
  test('the safe Markdown parser keeps [[links]] in its text, so the renderer can make them links', () => {
    const blocks = parseBlocks('# Plan\nSee [[Japan adventure]] and **[[Read|reading]]**\n- a [[2026-11-01]] day');
    const text = JSON.stringify(blocks);
    for (const name of ['[[Japan adventure]]', '[[Read|reading]]', '[[2026-11-01]]']) expect(text).toContain(name);
    expect(parseLinks('<script>alert(1)</script>[[x]]')).toEqual([{target: 'x', alias: null, heading: null, start: 25, end: 30, embed: false}]);
  });
  test('the Notes route stays light: the page loads only a small client part; the workspace is its own chunk', () => {
    const page = readFileSync(join(__dirname, '..', '..', 'app', 'app', 'notes', 'page.tsx'), 'utf8');
    expect(page).toMatch(/title: 'Notes'/);
    expect(page).not.toMatch(/notes-workspace|graph-view|notes-files/);
    const client = sources.find(s => s.file === 'notes-page-client.tsx')!.text;
    expect(client).toMatch(/lazy\(\(\) => import\('\.\/notes-workspace'\)\)/);
    const workspace = sources.find(s => s.file === 'notes-workspace.tsx')!.text;
    for (const part of ['this-day-strip', 'graph-view', 'notes-files']) expect(workspace).toMatch(new RegExp(`lazy\\(\\(\\) => import\\('\\./${part}'\\)\\)`));
  });
});
