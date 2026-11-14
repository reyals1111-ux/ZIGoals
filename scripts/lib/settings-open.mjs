/**
 * Session AP (D-088 completed, ADR-040): on a computer or a tablet the app's Settings now starts with its groups folded. A
 * script that works inside Settings opens them as a person does, with "Open all" in the sections bar, and only when one is
 * folded: on a build from before (every group open, the button reads "Fold all") this does nothing, so the hosted
 * verifier behaves exactly as before on Alpha #54 (TIER 3 release verifier, behaviour-preserving). Phones keep their own list.
 * @param {import('playwright').Page} page
 */
export async function openSettingsGroups(page) {
  const folded = page.locator('.settings-page .settings-group[data-folded]');
  // The groups fold right after the page hydrates; give that moment, then open them if any is folded.
  await page.locator('html[data-app-hydrated]').waitFor({state: 'attached', timeout: 20_000}).catch(() => undefined);
  for (let i = 0; i < 30; i++) {
    if (await folded.count() === 0) { if (i >= 2) return; await page.waitForTimeout(100); continue; }
    const all = page.locator('.settings-page .settings-fold-all');
    if (((await all.textContent().catch(() => '')) ?? '').trim() === 'Open all') await all.click().catch(() => undefined);
    await page.waitForTimeout(150);
  }
  if (await folded.count() > 0) throw new Error('Settings: a group stayed folded after "Open all".');
}
