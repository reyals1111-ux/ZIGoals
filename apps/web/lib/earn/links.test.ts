import {existsSync, readdirSync, readFileSync, statSync} from 'node:fs';
import {join, relative} from 'node:path';
import {describe, expect, it} from 'vitest';
import {createElement, type ReactElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {VERIFIED_LINKS, isVerifiedUrl} from '@zigoals/ecosystem-registry/verified-links';
import {VerifiedLink} from '../../components/links/verified-link';

/**
 * Session AF (ADR-028 H5, H25, H34; `TIER 3 (public-safety labels)`): every outgoing link of the Earn pages comes from the
 * verified link registry and opens in a new tab as `<a target="_blank" rel="noopener noreferrer">`; nothing is framed and
 * nothing calls `window.open`. This guard reads every source file of the Earn pages (components/earn, app/app/earn) and
 * fails on a URL written in the code, on an anchor that opens a new tab by itself, on a frame or a popup, on a request to
 * anything but the app's own /api routes, and on any signing or sending method. The one place a new-tab anchor is built
 * is components/links/verified-link.tsx, whose URL is the registry's.
 */
const WEB = join(__dirname, '..', '..');
const DIRS = ['components/earn', 'app/app/earn', 'app/api/earn', 'lib/earn', 'lib/server/earn'];
const sources = (dir: string): string[] => !existsSync(join(WEB, dir)) ? [] : readdirSync(join(WEB, dir)).flatMap(name => {
  const path = `${dir}/${name}`;
  return statSync(join(WEB, path)).isDirectory() ? sources(path) : /\.(ts|tsx|mjs)$/.test(name) && !/\.test\.|\.spec\.|\.d\.mts$/.test(name) ? [path] : [];
});
// Comments may describe what they refuse; only code counts.
const code = (text: string) => text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"`])\/\/.*$/gm, '$1');
const PAGE_DIRS = ['components/earn', 'app/app/earn'];
const pageFiles = PAGE_DIRS.flatMap(sources), allFiles = DIRS.flatMap(sources);
// The link's text as createElement's third argument (react/no-children-prop); the props are the registry pair only.
const Link = VerifiedLink as unknown as (props: {provider: string; kind: string}) => ReactElement;
const render = (provider: string, kind: string, label: string) => renderToStaticMarkup(createElement(Link, {provider, kind}, label));
const FORBIDDEN_SIGNING = /signAmino|signDirect|signArbitrary|eth_sign|personal_sign|eth_signTypedData|eth_sendTransaction|signAndBroadcast|sendTransaction|signTransaction|broadcastTx|getOfflineSigner|experimentalSign|\bsign[A-Z]\w*\(/;

describe('Earn links come only from the verified link registry', () => {
  it('no Earn page file writes a URL, opens a new tab itself, frames a site or opens a popup', () => {
    for (const file of pageFiles) {
      const text = code(readFileSync(join(WEB, file), 'utf8'));
      expect(text, file).not.toMatch(/https?:\/\//);
      expect(text, file).not.toMatch(/<iframe|<frame|<embed|<object/i);
      expect(text, file).not.toMatch(/window\s*\.\s*open|\bopen\s*\(\s*['"`]/);
      expect(text, file).not.toMatch(/target\s*=\s*["'{]/);
      // Plain anchors only for this page's own sections; other pages through next/link with an app path.
      for (const href of text.match(/<a\b[^>]*\bhref=\{?["'`]?[^"'`}\s>]*/g) ?? []) expect(href, file).toMatch(/href=\{?["'`]#/);
      for (const href of text.match(/<Link\b[^>]*\bhref=\{?["'`][^"'`]*/g) ?? []) expect(href, file).toMatch(/href=\{?["'`]\/app/);
    }
  });
  it('no Earn file signs, sends or reaches the network except the app\'s own /api/ routes', () => {
    for (const file of allFiles) {
      const text = code(readFileSync(join(WEB, file), 'utf8'));
      expect(text, file).not.toMatch(FORBIDDEN_SIGNING);
      if (!file.startsWith('lib/server/earn')) for (const call of text.match(/\bfetch\(\s*[^,)]*/g) ?? []) expect(call, file).toMatch(/fetch\(\s*(?:`\/api\/|['"]\/api\/|url\b|request\b|input\b)/);
      expect(text, file).not.toMatch(/XMLHttpRequest|WebSocket|EventSource|sendBeacon/);
    }
  });
  it('the verified link opens the registry URL in a new tab, with noopener noreferrer and its dated mark', () => {
    const html = render('valdora', 'stake', 'Open Valdora');
    expect(html).toContain('href="https://valdora.finance/stake"');
    expect(html).toContain('target="_blank"');
    expect(html).toContain('rel="noopener noreferrer"');
    expect(html).toMatch(/verified link · Oct 18, 2026/);
    expect(html).not.toMatch(/<iframe/);
    const walled = render('zig-finance', 'hub-staking', 'Hub');
    expect(walled).toContain('href="https://hub.zigchain.com/staking"');
    expect(walled).toContain('turns away automated checks');
    expect(walled).toContain('github.com');
  });
  it('the component draws only registry URLs: every href it can make is a verified one', () => {
    for (const [provider, links] of Object.entries(VERIFIED_LINKS)) for (const link of links) {
      const html = render(provider, link.kind, 'x');
      const href = /href="([^"]+)"/.exec(html)?.[1]?.replaceAll('&amp;', '&');
      expect(href, `${provider}:${link.kind}`).toBe(link.url);
      expect(isVerifiedUrl(href!)).toBe(true);
    }
  });
  it('the guard reads the files it guards', () => {
    expect(pageFiles).toEqual(expect.arrayContaining(['components/earn/earn-view.tsx', 'components/earn/guide-panel.tsx', 'components/earn/validators-section.tsx', 'app/app/earn/page.tsx']));
    expect(allFiles).toEqual(expect.arrayContaining(['lib/server/earn/upstream.ts', 'lib/earn/client.ts', 'app/api/earn/chain/route.ts']));
    expect(relative(WEB, join(WEB, 'components/links/verified-link.tsx'))).toBe('components/links/verified-link.tsx');
    expect(code(readFileSync(join(WEB, 'components/links/verified-link.tsx'), 'utf8'))).not.toMatch(/https?:\/\//);
    expect(code(readFileSync(join(WEB, 'components/links/verified-link.tsx'), 'utf8'))).not.toMatch(/window\s*\.\s*open|<iframe/);
  });
});
