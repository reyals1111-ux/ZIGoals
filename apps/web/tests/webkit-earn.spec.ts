import {expect, test} from '@playwright/test';
import {earnRoutes, seedShowcase} from './earn-fixtures';

/**
 * Session AF (L1): the Earn hub on a phone in WebKit (390 × 844; evidence label: WebKit, never "Safari on an iPhone").
 * The chip index is a rail under the top bar that scrolls sideways on its own while the page never does; every chip is
 * a 44 px target; the guide opens as a bottom sheet above the tab bar and leaves the page usable.
 */
test.use({viewport: {width: 390, height: 844}});
test.beforeEach(async ({browserName}, info) => {
  test.skip(browserName !== 'webkit', 'WebKit only: the Chrome suite covers the phone layout in earn-hub.spec.ts (mobile).');
  test.skip(info.project.name !== 'mobile', 'A phone check: the iPhone project only.');
});

test('the Earn hub at 390 px in WebKit: chip rail, no sideways scroll, 44 px targets, the guide as a bottom sheet', async ({page, context, baseURL}) => {
  const errors: string[] = [];
  page.on('pageerror', e => errors.push(e.message));
  // Session AF (diagnostic only; WebKit runs only in CI, ADR-028 H114): CI's WebKit reported "This assignment requires a
  // TrustedHTML" while Earn loads; the browser's own violation reports (the sink, the first characters of the value and the
  // script position) are kept so a failure names what assigned the HTML. The assertion below is unchanged.
  await page.addInitScript(() => { document.addEventListener('securitypolicyviolation', e => { const w = window as unknown as {afViolations?: string[]}; (w.afViolations ??= []).push(`${e.violatedDirective} | ${e.sample} | ${e.sourceFile}:${e.lineNumber}:${e.columnNumber}`); }); });
  // WebKit sent no violation event (CI on d7684949), so the HTML sinks themselves note each string assigned to them, with
  // the element and the first frames of the caller, before the browser refuses it (diagnostic only; nothing is changed).
  await page.addInitScript(() => {
    // CI on 1251d142: the probes were installed on Earn and caught nothing there, while the page error was recorded — it can
    // come from the page before (the Showcase lands on Today, and the test leaves it at once). Every note is therefore also
    // kept in this tab's sessionStorage with the page it came from, so the last read sees the earlier document's notes too.
    const keep = (line: string) => { try { const all = JSON.parse(sessionStorage.getItem('afViolations') ?? '[]') as string[]; all.push(`${location.pathname}: ${line}`); sessionStorage.setItem('afViolations', JSON.stringify(all.slice(-40))); } catch { /* storage refused */ } };
    const note = (where: string, value: unknown) => { if (typeof value !== 'string') return; keep(`${where} ← "${value.slice(0, 60)}"`); const w = window as unknown as {afViolations?: string[]}; (w.afViolations ??= []).push(`${where} ← "${value.slice(0, 60)}" @ ${(new Error().stack ?? '').split('\n').slice(2, 6).map(l => l.trim().slice(0, 90)).join(' < ')}`); };
    for (const [proto, prop] of [[Element.prototype, 'innerHTML'], [Element.prototype, 'outerHTML'], [ShadowRoot.prototype, 'innerHTML']] as const) {
      const d = Object.getOwnPropertyDescriptor(proto, prop); if (!d?.set) continue;
      Object.defineProperty(proto, prop, {...d, set(this: Element, v: unknown) { note(`${(this as Element).tagName ?? 'shadow'}.${prop}`, v); return d.set!.call(this, v); }});
    }
    const adjacent = Element.prototype.insertAdjacentHTML; Element.prototype.insertAdjacentHTML = function (pos: InsertPosition, v: string) { note(`${this.tagName}.insertAdjacentHTML`, v); return adjacent.call(this, pos, v); };
    const fragment = Range.prototype.createContextualFragment; Range.prototype.createContextualFragment = function (v: string) { note('Range.createContextualFragment', v); return fragment.call(this, v); };
    const parse = DOMParser.prototype.parseFromString; DOMParser.prototype.parseFromString = function (v: string, type: DOMParserSupportedType) { note('DOMParser.parseFromString', v); return parse.call(this, v, type); };
    // CI on 72d9178a: none of the sinks above was reached, and the page error's stack starts in WebKit's own reportError
    // (web-inspector://bootstrap.js), called by React's uncaught-error path through Next's global reporter. So the original
    // error React reported is noted here, before WebKit's reportError handles it, and the remaining HTML sinks are wrapped;
    // a marker proves these probes were installed in the page.
    type Sinks = Record<string, ((this: unknown, ...a: unknown[]) => unknown) | undefined>;
    const wrapMethod = (owner: unknown, name: string, label: string) => { const o = owner as Sinks | undefined; const f = o?.[name]; if (typeof f !== 'function') return; o![name] = function (this: unknown, ...a: unknown[]) { note(label, a.find(x => typeof x === 'string')); return f.apply(this, a); }; };
    wrapMethod(Element.prototype, 'setHTMLUnsafe', 'Element.setHTMLUnsafe');
    wrapMethod(ShadowRoot.prototype, 'setHTMLUnsafe', 'ShadowRoot.setHTMLUnsafe');
    wrapMethod(Document, 'parseHTMLUnsafe', 'Document.parseHTMLUnsafe');
    wrapMethod(Document.prototype, 'write', 'document.write');
    wrapMethod(Document.prototype, 'writeln', 'document.writeln');
    const srcdoc = Object.getOwnPropertyDescriptor(HTMLIFrameElement.prototype, 'srcdoc'); if (srcdoc?.set) Object.defineProperty(HTMLIFrameElement.prototype, 'srcdoc', {...srcdoc, set(this: HTMLIFrameElement, v: unknown) { note('IFRAME.srcdoc', v); return srcdoc.set!.call(this, v); }});
    const report = window.reportError?.bind(window);
    if (report) window.reportError = (e: unknown) => { const w = window as unknown as {afViolations?: string[]}; keep(`reportError ← ${e instanceof Error ? `${e.name}: ${e.message}` : String(e)}`); (w.afViolations ??= []).push(`reportError ← ${(e instanceof Error ? `${e.name}: ${e.message} @ ${(e.stack ?? '').split('\n').slice(0, 8).join(' | ')}` : String(e)).slice(0, 900)}`); return report(e); };
    // CI on 42ec357c: on /app/settings, five load failures (error events without a message), then the framework's own error
    // screen writing its styles through innerHTML (refused by Trusted Types). Each failed load now names its element and
    // address, and console.error (where the framework logs an error a boundary caught) is noted, so the first error is named.
    window.addEventListener('error', e => { const t = e.target as (Element & {src?: string; href?: string}) | null; keep(e.message === undefined && t && t !== (window as unknown) ? `load failed ← <${t.tagName?.toLowerCase()}> ${(t.src || t.href || '').slice(0, 120)}` : `error event ← ${e.message} @ ${e.filename}:${e.lineno}:${e.colno}`); }, true);
    window.addEventListener('unhandledrejection', e => { const r = e.reason as Error | undefined; keep(`unhandled rejection ← ${r instanceof Error ? `${r.name}: ${r.message} @ ${(r.stack ?? '').split('\n').slice(0, 4).join(' | ')}` : String(r)}`); });
    const consoleError = console.error.bind(console);
    console.error = (...args: unknown[]) => { const first = args[0]; keep(`console.error ← ${first instanceof Error ? `${first.name}: ${first.message} @ ${(first.stack ?? '').split('\n').slice(0, 5).join(' | ')}` : String(first).slice(0, 300)}`); consoleError(...args); };
    window.addEventListener('pagehide', () => keep('pagehide'));
    (window as unknown as {afProbes?: string}).afProbes = 'installed';
  });
  const origin = new URL(baseURL!).origin;
  await context.route(url => url.origin !== origin, route => route.fulfill({status: 200, contentType: 'text/html', body: '<!doctype html><title>stub</title>'}));
  await seedShowcase(page);
  await earnRoutes(page);
  await page.goto('/app/earn');
  await expect(page.locator('main h1').first()).toHaveText('Make your money work');
  await expect(page.locator('[data-live-figure="native-apr"]')).toHaveAttribute('data-state', 'ok');
  await page.waitForLoadState('networkidle', {timeout: 10_000}).catch(() => undefined);
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(0);
  const rail = page.locator('.earn-chips-rail');
  expect(await rail.evaluate(el => el.scrollWidth > el.clientWidth)).toBe(true);
  for (const chip of await rail.getByRole('link').all()) expect((await chip.boundingBox())!.height).toBeGreaterThanOrEqual(44);
  await page.locator('#safety').scrollIntoViewIfNeeded();
  const top = (await page.locator('.earn-chips').boundingBox())!.y;
  expect(top).toBeGreaterThanOrEqual(0);
  expect(top).toBeLessThan(140);
  // The guide: a sheet at the bottom, above the tab bar, with 44 px buttons.
  const open = page.locator('#valdora').getByRole('link', {name: /^Open Valdora/});
  await open.scrollIntoViewIfNeeded();
  const [tab] = await Promise.all([context.waitForEvent('page'), open.click()]);
  await tab.close();
  const sheet = page.getByRole('region', {name: 'Guide: Stake ZIG on Valdora for stZIG'});
  await expect(sheet).toBeVisible();
  const box = (await sheet.boundingBox())!;
  expect(box.x).toBeLessThanOrEqual(1);
  expect(box.width).toBeGreaterThanOrEqual(388);
  expect(box.y + box.height).toBeLessThanOrEqual(844);
  for (const button of await sheet.getByRole('button').all()) expect((await button.boundingBox())!.height).toBeGreaterThanOrEqual(44);
  await sheet.getByRole('button', {name: 'Close the guide'}).click();
  await expect(sheet).toHaveCount(0);
  const {violations, probes} = await page.evaluate(() => { const w = window as unknown as {afViolations?: string[]; afProbes?: string}; let kept: string[] = []; try { kept = JSON.parse(sessionStorage.getItem('afViolations') ?? '[]') as string[]; } catch { /* storage refused */ } return {violations: [...kept, ...(w.afViolations ?? [])], probes: w.afProbes ?? 'missing'}; }).catch(e => ({violations: [] as string[], probes: `unreadable (${String(e).slice(0, 80)})`}));
  expect(errors, `probes ${probes}; Trusted Types reports, HTML assignments and reported errors: ${violations.length ? violations.join(' ;; ') : 'none'}`).toEqual([]);
});
