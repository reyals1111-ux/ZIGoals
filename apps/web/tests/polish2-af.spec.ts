import {expect, test, type Locator, type Page} from '@playwright/test';
import {earnRoutes, seedShowcase} from './earn-fixtures';
import {seedChecklist, settled} from './checklist-fixtures';
import {addCustom} from '../lib/checklist/store';
import {emptyChecklist} from '../lib/checklist/schema';

/**
 * Session AF, critique round 2 (lane L5c): the design findings fixed at their cause, each measured. Earn: the option
 * titles at their designed size; "What's this?" taps that keep 44 px without growing their line or indenting a wrapped
 * line; links inside a sentence that stay in it on a phone and still measure 44 px; the validator links; distinct
 * disclosure titles; a name keeps its capital; no bare shields; Permapod's caution; balanced eyebrows; the decoy denom
 * broken only after its dots where it fits; developer words one tap down; no blank live box; the calculator's source.
 * The path engine: the jump bubble takes no room and never sits on a banner; ZIGi's line is one line over no label;
 * chests keep their colours. Today: the Universe's names under their planets and a lit planet that shows it; the
 * Checklist card's dots and the path's own "Next"; the timeline card's rail, nodes and "Now" pill. Fixtures only.
 */

async function openEarn(page: Page) {
  await seedShowcase(page);
  await earnRoutes(page);
  await page.goto('/app/earn');
  await expect(page.locator('[data-live-figure="native-apr"]')).toHaveAttribute('data-state', 'ok');
  await expect.poll(() => page.locator('[data-live-figure][data-state="loading"]').count()).toBe(0);
}

test.describe('Earn', () => {
  test('titles at their designed size, taps that never grow their line, sentence links that stay in the sentence', async ({page}, info) => {
    test.setTimeout(90_000);
    await openEarn(page);
    // 1. Every option's title, and every other Earn section's, is at least 24 px (earn.css: clamp(24px, …, 32px)), never
    //    the app's 19–22 px in-panel heading.
    const sizes = await page.locator('.earn-option-title h2').evaluateAll(hs => hs.map(h => parseFloat(getComputedStyle(h).fontSize)));
    expect(sizes).toHaveLength(11);
    for (const s of sizes) expect(s).toBeGreaterThanOrEqual(24);
    const sectionSizes = await page.locator('.earn-sections > .panel > .aa-section-heading h2').evaluateAll(hs => hs.map(h => [h.id, parseFloat(getComputedStyle(h).fontSize)] as const));
    expect(sectionSizes.map(([id]) => id)).toEqual(expect.arrayContaining(['start-here-title', 'validators-title', 'academy-title', 'calculator-title', 'safety-title']));
    for (const [id, size] of sectionSizes) expect(size, id).toBeGreaterThanOrEqual(24);
    // 9. Eyebrows balance their lines.
    for (const wrap of await page.locator('.earn-option-title > .eyebrow').evaluateAll(es => es.map(e => (getComputedStyle(e) as CSSStyleDeclaration & {textWrapStyle?: string}).textWrapStyle ?? getComputedStyle(e).getPropertyValue('text-wrap')))) expect(wrap).toContain('balance');
    // 2. A tap is 44 × 44 px, but a line holding one is no taller than its paragraph's line-height, and a tap starting a line
    //    starts at the text's edge.
    const taps = await page.locator('.earn-page .whats-this').evaluateAll(buttons => buttons.filter(b => (b as HTMLElement).offsetParent && !b.closest('.whats-this-row')).map(b => {
      const parent = b.parentElement!, style = getComputedStyle(parent), lh = parseFloat(style.lineHeight);
      // Each line's text, as glyph boxes (the taps' own words included, their answers excluded), clustered by line.
      const bottoms: number[] = [], walker = document.createTreeWalker(parent, NodeFilter.SHOW_TEXT);
      for (let n = walker.nextNode(); n; n = walker.nextNode()) {
        if ((n.parentElement as Element).closest('.whats-this-def')) continue;
        const r = document.createRange(); r.selectNodeContents(n);
        for (const rect of r.getClientRects()) if (rect.width > 0 && rect.height > 0) bottoms.push(rect.bottom);
      }
      bottoms.sort((x, y) => x - y);
      const lines = bottoms.reduce<number[]>((acc, y) => (acc.length && y - acc.at(-1)! < 5 ? acc : [...acc, y]), []);
      const gaps = lines.slice(1).map((t, i) => t - lines[i]!);
      const box = b.getBoundingClientRect(), content = parent.getBoundingClientRect().left + parseFloat(style.paddingLeft);
      const text = document.createRange(); text.selectNodeContents(b); const glyphs = text.getBoundingClientRect();
      return {term: (b as HTMLElement).dataset.whatsThis, w: box.width, h: box.height, lh, maxGap: gaps.length ? Math.max(...gaps) : 0, atLineStart: box.left < content + 4, textDx: glyphs.left - content};
    }));
    expect(taps.length).toBeGreaterThan(40);
    for (const t of taps) {
      expect(t.h, t.term).toBeGreaterThanOrEqual(44);
      expect(t.w, t.term).toBeGreaterThanOrEqual(44);
      if (Number.isFinite(t.lh)) expect(t.maxGap, `${t.term}: a line with a tap is no taller than the line-height`).toBeLessThanOrEqual(t.lh + 1.5);
      if (t.atLineStart) expect(Math.abs(t.textDx), `${t.term}: a tap that starts a line is not indented`).toBeLessThanOrEqual(1.5);
    }
    // In a risk, the tap comes after "Source: …", and "Source:" is glued to the first word it names.
    for (const li of await page.locator('.earn-risks li:has(.whats-this)').all()) {
      expect(await li.evaluate(el => { const src = el.querySelector('.earn-risk-source')!, tap = el.querySelector('.whats-this')!; return !!(src.compareDocumentPosition(tap) & Node.DOCUMENT_POSITION_FOLLOWING); })).toBe(true);
      expect(await li.locator('.earn-risk-source').textContent()).toMatch(/^Source:\u00a0\S/);
    }
    // A risk's closing stop never starts a line: it sits on the line of its last link's mark.
    const stops = await page.locator('.earn-risks .earn-risk-end').evaluateAll(ends => ends.map(end => {
      const mark = end.querySelector('.verified-mark svg')!.getBoundingClientRect(), stop = end.lastChild as Text, r = document.createRange();
      r.setStart(stop, stop.length - 1); r.setEnd(stop, stop.length); const dot = r.getBoundingClientRect();
      return {t: end.textContent!.slice(0, 40), dy: Math.abs((dot.top + dot.height / 2) - (mark.top + mark.height / 2)), dx: dot.left - mark.right};
    }));
    expect(stops.length).toBeGreaterThan(30);
    for (const s of stops) { expect(s.dy, `${s.t}: the stop on its mark's line`).toBeLessThan(8); expect(s.dx, s.t).toBeGreaterThanOrEqual(-1); }
    // 3. On a phone, a link inside a sentence stays inline; every link on the page is at least 44 px tall, line by line.
    if (info.project.name === 'mobile') {
      const links = await page.locator('.earn-page a').evaluateAll(as => as.filter(a => a.getClientRects().length && getComputedStyle(a).visibility === 'visible' && !a.closest('details:not([open])')).map(a => ({t: a.textContent!.trim().slice(0, 40), heights: [...a.getClientRects()].map(r => r.height)})));
      expect(links.length).toBeGreaterThan(30);
      for (const l of links) for (const h of l.heights) expect(h, `${l.t}: 44 px tall`).toBeGreaterThanOrEqual(44);
      const inSentence = await page.locator('.earn-page :is(p, li, dd, span, small) > a.text-link').evaluateAll(as => as.map(a => getComputedStyle(a).display));
      expect(inSentence.length).toBeGreaterThan(10);
      for (const d of inSentence) expect(d).toBe('inline');
      // Stablecoins' "What exists": "(" sits on the line where its link starts, ")" or ":" on the line where it ends.
      const marks = await page.locator('#stablecoins .earn-facts dd a.text-link').evaluateAll(as => as.map(a => {
        const charRect = (node: Node | null, at: 'end' | 'start') => { if (!node || node.nodeType !== 3) return null; const t = node as Text, r = document.createRange(), i = at === 'end' ? t.length - 1 : 0; r.setStart(t, i); r.setEnd(t, i + 1); return r.getBoundingClientRect(); };
        const first = a.getClientRects()[0]!, last = [...a.getClientRects()].at(-1)!, before = charRect(a.previousSibling, 'end'), after = charRect(a.nextSibling, 'start');
        const mid = (r: DOMRect) => r.top + r.height / 2;
        return {t: a.textContent, before: before ? Math.abs(mid(before) - mid(first)) : 0, after: after ? Math.abs(mid(after) - mid(last)) : 0};
      }));
      expect(marks).toHaveLength(3);
      for (const m of marks) { expect(m.before, `${m.t}: "(" with its link`).toBeLessThan(6); expect(m.after, `${m.t}: ")" with its link`).toBeLessThan(6); }
    }
  });

  test('links, titles, names and marks: #validators, two disclosure titles, Circle, full marks, Permapod’s caution, the decoy denom', async ({page}, info) => {
    await openEarn(page);
    // 4. Native staking's step 2 and its risk link to the validator list on this page.
    const native = page.locator('#native-staking');
    await expect(native.locator('.earn-steps li').nth(1).getByRole('link', {name: 'the list on this page'})).toHaveAttribute('href', '#validators');
    await expect(native.locator('.earn-risks').getByRole('link', {name: 'see the list below'})).toHaveAttribute('href', '#validators');
    await native.locator('.earn-steps li').nth(1).getByRole('link', {name: 'the list on this page'}).click();
    await expect(page).toHaveURL(/#validators$/);
    // 5. OroSwap's two disclosures, each with its own title.
    await expect(page.locator('#oroswap .earn-illustration-slot > summary')).toHaveText([/^What you’ll see on OroSwap’s page when you swap/, /^What you’ll see on OroSwap’s page when you add to a pool/]);
    // 6. A name keeps its capital inside a sentence.
    await expect(page.locator('#stablecoins [data-notice]')).toContainText('but Circle stopped new minting');
    await expect(page.locator('#stablecoins')).not.toContainText('but circle stopped');
    // 7. No bare shield: each standalone link in the actions says "verified link · <date>".
    await expect(page.locator('.earn-option-actions .verified-link[data-mark="compact"]')).toHaveCount(0);
    for (const label of ['On DefiLlama', 'All of Valdora’s vaults', 'All closure articles']) {
      for (const link of await page.locator('.earn-option-actions .verified-link').filter({has: page.getByRole('link', {name: new RegExp(`^${label}`)})}).all()) await expect(link.locator('.verified-mark')).toContainText(/verified link · \w+/);
    }
    // 8. Permapod's site link carries a plain caution beside it.
    const permapod = page.locator('#permapod .earn-option-actions');
    await expect(permapod.locator('[data-caution="permapod"]')).toHaveText('Read only: do not connect a wallet or sign anything there while it is halted.');
    const order = await permapod.evaluate(el => [...el.children].map(c => c.matches('.verified-link') ? c.textContent!.split('↗')[0]!.trim() : c.getAttribute('data-caution')));
    expect(order.indexOf('permapod')).toBe(order.indexOf('Permapod’s site') + 1);
    // 10. The decoy denom: never `break-all`, a break opportunity after each dot, the words intact; where the tile is wide
    //     enough (a computer), every line break falls right after a dot.
    const denom = page.locator('.earn-denom-decoy');
    await expect(denom).toHaveText('coin.zig153u6vhv4ds6x95chdnqmsduwxzpt0teh43alsk.zig');
    expect(await denom.evaluate(e => getComputedStyle(e).wordBreak)).not.toBe('break-all');
    expect(await denom.locator('wbr').count()).toBe(2);
    const breaks = await denom.evaluate(code => { const out: string[] = []; let last: number | null = null, prev = ''; const walker = document.createTreeWalker(code, NodeFilter.SHOW_TEXT); let n: Node | null; while ((n = walker.nextNode())) { const t = n as Text; for (let i = 0; i < t.length; i++) { const r = document.createRange(); r.setStart(t, i); r.setEnd(t, i + 1); const top = Math.round(r.getBoundingClientRect().top); if (last !== null && top > last + 4) out.push(prev); last = top; prev = t.data[i]!; } } return out; });
    if (info.project.name === 'desktop') for (const b of breaks) expect(b, 'a line break inside the denom falls after a dot').toBe('.');
    await expect(page.locator('#safety code', {hasText: /^azig$/})).toHaveCount(1);
    expect(await page.locator('#safety code', {hasText: /^azig$/}).evaluate(e => e.getClientRects().length)).toBe(1);
  });

  test('developer words one tap down, no blank live box, the calculator’s source, the Academy’s end chest', async ({page}) => {
    await openEarn(page);
    // 11. The surface reads in plain words; the method, unit and message names are kept behind "How this is read".
    const surface = await page.locator('.earn-page').innerText();
    for (const word of ['reverse_st_zig_price', '18-decimal', 'read as stZIG with 6 decimals', 'read as dollars with 6 decimals', 'fee number', 'MsgDelegate', 'MsgVote']) expect(surface, word).not.toContain(word);
    const behind = (await page.locator('.earn-page [data-how-read]').allTextContents()).join(' ');
    for (const word of ['reverse_st_zig_price', 'read as 18-decimal ZIG in and 6-decimal stZIG out', 'Read as stZIG with 6 decimals', 'Read as dollars with 6 decimals', 'a fee number of 1,000', 'MsgDelegate', 'MsgVote']) expect(behind, word).toContain(word);
    const rate = page.locator('[data-live-figure="valdora-rate"] [data-how-read]');
    await rate.locator('summary').click();
    await expect(rate).toContainText('reverse_st_zig_price');
    await expect(rate.getByText(/reverse_st_zig_price/)).toBeVisible();
    // 12. Governance says where its numbers are and why they are not here; Goal Vaults shows a real count with its source.
    const gov = page.locator('#governance .earn-figures');
    await expect(gov.locator('.earn-value')).toHaveText('On the Governance page');
    await expect(gov).toContainText('Earn does not read ZIGChain’s proposals itself, so it has no count to show here.');
    await expect(gov.getByRole('link', {name: 'Governance'})).toHaveAttribute('href', '/app/governance');
    const vaults = page.locator('[data-device-figure="goal-vaults-linked"]');
    await expect(vaults).toHaveAttribute('data-state', 'ok');
    await expect(vaults.locator('.earn-value')).toHaveText(/^(None yet|\d+ goals?( \(\d+ links\))?)$/);
    await expect(vaults.locator('.earn-source')).toContainText(/this device’s Goal Vault record, read on this device · as of /);
    // 13. The calculator's rate carries the same source line as the native figures.
    const calc = page.locator('#calculator [data-live-figure="calculator"]');
    await expect(calc).toHaveAttribute('data-state', 'ok');
    await expect(calc.locator('.earn-source').first()).toContainText('ZIGChain mainnet LCD (official)');
    await expect(calc.locator('.earn-source').first()).toContainText(/ · as of /);
    // 15. The Academy's end chest is named like Start here's.
    await expect(page.locator('#start-here .path-chest[data-milestone="start-complete"]')).toContainText('Start here, complete');
    await expect(page.locator('#academy .path-chest[data-milestone="academy-done"]')).toContainText(/Academy, complete|Every lesson passed/);
    await expect(page.locator('#academy .path-chest[data-milestone="academy-done"]')).not.toContainText('Earn Academy');
  });
});

/** The jump bubble's rules, read while sweeping the page past a path: shown only whole on the screen, inside its path,
 *  over no banner or chest, pointing at the next dot; and the path keeps no room for it at its end. */
async function sweepJump(page: Page, stage: Locator) {
  const tail = await stage.evaluate(s => { const b = s.getBoundingClientRect(), kids = [...s.children].filter(k => getComputedStyle(k).position !== 'absolute'); return b.bottom - kids.at(-1)!.getBoundingClientRect().bottom - parseFloat(getComputedStyle(s).paddingBottom); });
  expect(tail, 'nothing below the last orbit but the stage’s own padding').toBeLessThanOrEqual(1);
  const box = (await stage.boundingBox())!, y0 = await page.evaluate(() => scrollY), seen: string[] = [];
  for (let y = box.y + y0 - 900; y < box.y + y0 + box.height + 300; y += 90) {
    await page.evaluate(v => window.scrollTo(0, v), y);
    await page.waitForTimeout(90);
    const state = await stage.evaluate(s => {
      const b = s.querySelector<HTMLElement>('.path-jump'), next = s.querySelector('[data-next] [data-path-point]');
      if (!b) return {shown: false};
      const r = b.getBoundingClientRect(), shown = b.hasAttribute('data-clear') && getComputedStyle(b).visibility === 'visible';
      const blockers = [...s.querySelectorAll('.path-banner, .path-chest')].some(el => { const o = el.getBoundingClientRect(); return o.left < r.right && o.right > r.left && o.top < r.bottom && o.bottom > r.top; });
      const n = next?.getBoundingClientRect(), stageBox = s.getBoundingClientRect();
      return {shown, inView: r.top >= 0 && r.bottom <= innerHeight, inStage: r.top >= stageBox.top && r.bottom <= stageBox.bottom, blockers, dir: b.dataset.direction, nextAbove: !!n && n.top < 0, nextBelow: !!n && n.bottom > innerHeight};
    });
    if (!state.shown) continue;
    seen.push(state.dir!);
    expect(state.inView, 'whole on the screen').toBe(true);
    expect(state.inStage, 'inside its own path').toBe(true);
    expect(state.blockers, 'over no banner or chest').toBe(false);
    if (state.nextAbove) expect(state.dir).toBe('up');
    if (state.nextBelow) expect(state.dir).toBe('down');
  }
  return seen;
}

test.describe('the path engine', () => {
  test('Start here: the jump bubble takes no room, never sits on a banner, points the right way; ZIGi’s line is one line over no label; chests keep their colours', async ({page}) => {
    test.setTimeout(90_000);
    await openEarn(page);
    const stage = page.locator('.earn-start-path');
    await expect(stage.locator('.path-dot').first()).toBeVisible();
    const seen = await sweepJump(page, stage);
    expect(seen.length, 'the bubble shows somewhere while the next dot is off screen').toBeGreaterThan(0);
    // 17. ZIGi's "Next: …" is one line and covers no label.
    const say = stage.locator('.path-zigi-say');
    await say.scrollIntoViewIfNeeded();
    const s = await say.evaluate(el => { const r = el.getBoundingClientRect(), lh = parseFloat(getComputedStyle(el).lineHeight); return {h: r.height, lh, white: getComputedStyle(el).whiteSpace, hits: [...document.querySelectorAll('.path-label')].filter(l => { const o = l.getBoundingClientRect(); return o.left < r.right && o.right > r.left && o.top < r.bottom && o.bottom > r.top; }).map(l => l.textContent)}; });
    expect(s.white).toBe('nowrap');
    expect(s.h).toBeLessThan(s.lh * 2);
    expect(s.hits).toEqual([]);
    // 18. A chest not reached yet is dimmed by opacity only: no desaturating or darkening filter.
    for (const f of await page.locator('.path-chest:not([data-reached]) .path-chest-art').evaluateAll(es => es.map(e => ({filter: getComputedStyle(e).filter, opacity: Number(getComputedStyle(e).opacity)})))) {
      expect(f.filter).not.toMatch(/saturate|brightness|grayscale/);
      expect(f.opacity).toBeLessThan(1);
    }
  });

  test('the Checklist: the bubble shows only while the next dot is off screen, whole and clear, and jumps to it', async ({page}) => {
    await seedChecklist(page);
    await page.setViewportSize({width: 1280, height: 520});
    await page.goto('/app/checklist'); await settled(page);
    const stage = page.getByRole('group', {name: "Today's path"});
    await expect(stage.locator('.path-dot').first()).toBeVisible();
    // With the next dot on screen, no bubble.
    await stage.locator('[data-next] [data-path-point]').scrollIntoViewIfNeeded();
    await expect(page.getByRole('button', {name: /^Jump to next/})).toHaveCount(0);
    expect((await sweepJump(page, stage)).length, 'the bubble shows somewhere while the next dot is off screen').toBeGreaterThan(0);
  });
});

test.describe('Today', () => {
  test('My universe: each name under its planet; a lit planet wears a strong halo', async ({page}) => {
    await page.goto('/app/settings');
    await page.getByRole('button', {name: 'Load Showcase Demo', exact: true}).click();
    await page.waitForURL('**/app');
    const card = page.locator('.today-universe-card');
    const more = page.getByRole('button', {name: /^Show more/});
    if (await card.count() === 0 || !(await card.isVisible())) { if (await more.count()) await more.first().click(); }
    await expect(card.locator('.universe-row svg')).toHaveCount(4);
    await card.scrollIntoViewIfNeeded();
    const xs = await card.evaluate(c => ({planets: [...c.querySelectorAll('.universe-row .universe-planet-core')].map(p => { const r = p.getBoundingClientRect(); return r.left + r.width / 2; }), names: [...c.querySelectorAll('.today-universe-names li')].map(l => { const r = document.createRange(); r.selectNodeContents(l); const b = r.getBoundingClientRect(); return b.left + b.width / 2; })}));
    expect(xs.names).toHaveLength(4);
    xs.planets.forEach((x, i) => expect(Math.abs(x - xs.names[i]!), `planet ${i} sits over its name`).toBeLessThanOrEqual(3));
    const lit = card.locator('.universe-planet[data-lit]');
    for (const planet of await lit.all()) {
      expect(Number(await planet.locator('.universe-planet-halo').getAttribute('stroke-width'))).toBeGreaterThanOrEqual(2.4);
      await expect(planet.locator('.universe-planet-corona')).toHaveCount(1);
      expect(Number(await planet.locator('.universe-planet-core').getAttribute('opacity'))).toBe(1);
    }
  });

  test('the Checklist card: today’s dots in their colours, and "Next" is the step the path’s ZIGi points at', async ({page}) => {
    // A path whose stored order (evening item first) differs from its orbits' order (morning first).
    let r = emptyChecklist();
    r = addCustom(r, {label: 'Fictional evening sketch', colour: 'gold', section: 'evening'}, {id: 'ck_fixture-a', at: new Date(Date.now() - 2 * 86_400_000)});
    r = addCustom(r, {label: 'Fictional morning note', colour: 'cyan', section: 'morning'}, {id: 'ck_fixture-b', at: new Date(Date.now() - 86_400_000)});
    await seedChecklist(page, {path: r});
    await page.goto('/app/checklist'); await settled(page);
    const pathNext = await page.locator('[data-next] .path-label-text').textContent();
    expect(pathNext).toBe('Fictional morning note');
    await page.goto('/app'); await settled(page);
    const card = page.locator('.today-checklist-card');
    await expect(card.locator('.today-checklist-line strong')).toHaveText(pathNext!);
    const dots = card.locator('.today-checklist-dots > li');
    await expect(dots).toHaveCount(2);
    await expect(dots.first()).toHaveAttribute('data-next', 'true');
    const colours = await dots.evaluateAll(ds => ds.map(d => getComputedStyle(d).borderTopColor));
    expect(new Set(colours).size, 'each dot in its own item’s colour').toBe(2);
  });

  test('the Day timeline card: a short rail, a node in each block’s colour, and the "Now" pill among the rows', async ({page}) => {
    await page.goto('/app/settings');
    await page.getByRole('button', {name: 'Load Showcase Demo', exact: true}).click();
    await page.waitForURL('**/app');
    const card = page.locator('.today-timeline-card');
    const more = page.getByRole('button', {name: /^Show more/});
    if (!(await card.isVisible().catch(() => false)) && await more.count()) await more.first().click();
    await expect(card).toBeVisible();
    const list = card.getByRole('list', {name: 'Next on your timeline'});
    await expect(card.locator('.today-timeline-next, .today-timeline-line').first()).toBeVisible();
    if (await list.count() === 0) return;
    await expect(list.locator('li[data-now]')).toHaveCount(1);
    await expect(list.locator('li[data-now] span')).toHaveText(/^Now · /);
    expect(await list.evaluate(l => getComputedStyle(l, '::before').backgroundImage)).toContain('gradient');
    for (const row of await list.locator('li[data-block]').all()) {
      const node = await row.evaluate(li => ({w: parseFloat(getComputedStyle(li, '::before').width), border: getComputedStyle(li, '::before').borderTopColor}));
      expect(node.w).toBe(12);
      expect(node.border).not.toBe('rgba(0, 0, 0, 0)');
    }
    expect(await list.locator('li[data-now] span').evaluate(s => getComputedStyle(s).backgroundImage)).toContain('gradient');
  });
});
