import type {Page} from '@playwright/test';

/**
 * Session AK X1 (RELEASE_REVIEW R2–R5; owner: "consumer first, chain invisible"): a new device speaks consumer words until
 * the person chooses the chain (lib/chain-choice.ts). A spec about a crypto module chooses it first, the way a person
 * does: this writes exactly the record Settings → Your pages & buttons writes when Earn is switched on
 * (`zigoals:earn-prefs:v1` `pageShown: true`), before the app's first script runs, keeping any other Earn choice the spec
 * stored. With it the app is as it was before Session AK X1: the crypto pages, the wallet buttons, the wallet card and
 * the ZIG goal default all show.
 */
export async function chooseChain(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const key = 'zigoals:earn-prefs:v1';
    try {
      const raw = window.localStorage.getItem(key);
      const record = raw ? JSON.parse(raw) as Record<string, unknown> : {version: 1};
      if (record && typeof record === 'object' && record.version === 1 && record.pageShown === undefined) window.localStorage.setItem(key, JSON.stringify({...record, pageShown: true}));
    } catch { /* storage refused: the spec sees a device that never chose */ }
  });
}
