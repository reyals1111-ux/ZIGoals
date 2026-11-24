import {describe, expect, it} from 'vitest';
import {readFileSync} from 'node:fs';
import {join} from 'node:path';

/**
 * Session AV lane 2 (fixb4): in Compare, "Caffeine after" (an hour) sat in a <label> with its explanation, so the select's
 * name was the label's whole text ("Caffeine after 14:00 The time a drink was logged…"). Its name is now its label alone
 * and the line under it is its description.
 */
const src = readFileSync(join(__dirname, '..', '..', 'components', 'insights', 'compare', 'compare-explorer.tsx'), 'utf8');
describe('Compare: the caffeine hour', () => {
  it('is named by its label alone and described by the line under it', () => {
    expect(src).toContain('<span id={`${id}-late`}>Caffeine after</span>');
    expect(src).toMatch(/<select aria-labelledby=\{`\$\{id\}-late`\} aria-describedby=\{`\$\{id\}-late-about`\}/);
    expect(src).toMatch(/<small className="fine" id=\{`\$\{id\}-late-about`\}>The time a drink was logged\./);
  });
});
