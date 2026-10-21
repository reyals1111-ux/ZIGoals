import {describe, expect, it} from 'vitest';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {StakingEmptyPreview} from '../../components/earn/staking-empty-preview';

/** Session AF (L1): the Staking empty state that previews Earn, as it first renders (before any live answer). */
describe('the Staking empty preview', () => {
  it('keeps the Staking sentence, shows two live figures as "reading…" (never a number before a read) and the door to Earn', () => {
    const html = renderToStaticMarkup(createElement(StakingEmptyPreview));
    expect(html).toContain('A clear view of your wealth');
    expect(html).toContain('Track a public wallet to see liquid funds, stake and rewards together.');
    // Session AF (the lead): two figures — the Staking page reads nothing about Valdora (staking-page.spec); exact list as before.
    expect(html.match(/data-live-figure="preview-[a-z]+"/g)).toEqual(['data-live-figure="preview-native"', 'data-live-figure="preview-oroswap"']);
    expect(html).not.toMatch(/valdora/i);
    expect(html.match(/data-state="loading"/g)).toHaveLength(2); // one per figure, as before
    expect(html).not.toMatch(/\d(?:\s|&nbsp;|&#160;)%/); // any space kind, as written in HTML
    expect(html).toContain('href="/app/earn#start-here"'); // ledger P1.2: the CTA opens Earn's Start-here path
    expect(html).not.toMatch(/https?:\/\//);
  });
});
