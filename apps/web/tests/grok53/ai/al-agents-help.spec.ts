import {expect, test} from '@playwright/test';
import {seed} from './helpers';

/**
 * Session AL (lane L7; Berlin BN-111/BN-167, P-BN-42): the bots' harness flagged "text people can't see, addressed to AI
 * agents" on /app/help. What it found: Help's own answer "Can an AI agent in my browser use ZIGoals?" (written to people)
 * sits in a closed <details>. Nothing else hidden mentions agents, and no tool is registered for browser AI agents while
 * "Let browser AI agents use ZIGoals tools" is off (the default), even in a browser that offers them (a fake WebMCP here).
 */
test.use({viewport: {width: 1440, height: 900}});
test('no WebMCP tool is offered while the switch is off, and no hidden element outside Help\'s questions mentions AI agents', async ({page}) => {
  await page.addInitScript(() => { const calls: string[] = []; (window as unknown as {__registered: string[]}).__registered = calls; Object.defineProperty(document, 'modelContext', {value: {registerTool: (tool: {name: string}) => { calls.push(tool.name); }}, configurable: true}); });
  await seed(page);
  await page.goto('/app/help');
  await page.waitForLoadState('networkidle');
  expect(await page.evaluate(() => (window as unknown as {__registered: string[]}).__registered)).toEqual([]);
  const hidden = await page.evaluate(() => [...document.querySelectorAll('body *')].filter(el => {
    if (el.closest('details:not([open])') || el.closest('script, style, template, noscript, svg')) return false;
    const style = getComputedStyle(el), rect = el.getBoundingClientRect();
    const invisible = style.display === 'none' || style.visibility === 'hidden' || Number(style.opacity) === 0 || (rect.width <= 1 && rect.height <= 1);
    return invisible && /\b(?:AI agents?|LLMs?|language models?|assistants?)\b/i.test(el.textContent ?? '') && el.children.length === 0;
  }).map(el => (el.textContent ?? '').slice(0, 80)));
  expect(hidden).toEqual([]);
});
