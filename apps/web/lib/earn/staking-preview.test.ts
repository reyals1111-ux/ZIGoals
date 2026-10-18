import {describe, expect, it} from 'vitest';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {StakingEmptyPreview} from '../../components/earn/staking-empty-preview';

/** Session AF (L1): the Staking empty state that previews Earn, as it first renders (before any live answer). */
describe('the Staking empty preview', () => {
  it('keeps the Staking sentence, shows three live figures as "reading…" (never a number before a read) and the door to Earn', () => {
    const html = renderToStaticMarkup(createElement(StakingEmptyPreview));
    expect(html).toContain('A clear view of your wealth');
    expect(html).toContain('Track a public wallet to see liquid funds, stake and rewards together.');
    expect(html.match(/data-live-figure="preview-[a-z]+"/g)).toEqual(['data-live-figure="preview-native"', 'data-live-figure="preview-valdora"', 'data-live-figure="preview-oroswap"']);
    expect(html.match(/data-state="loading"/g)).toHaveLength(3);
    expect(html).not.toMatch(/\d %/);
    expect(html).toContain('href="/app/earn"');
    expect(html).not.toMatch(/https?:\/\//);
  });
});
