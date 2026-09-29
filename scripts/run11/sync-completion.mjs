// Waits for an encrypted account sync that completes after the wait was armed.
// The success message stays on screen after a sync, so reading it alone can
// accept an older completion in the moment between a click and the busy
// state. A MutationObserver counts each time the sync panel starts showing the
// success message; mounting the panel with an old message does not count.
const SUCCESS = 'Account records synced and acknowledged';

export async function armSyncCompletion(page) {
  const mark = await page.evaluate(success => {
    const w = window;
    if (w.__zigoalsSyncCompletions === undefined) {
      w.__zigoalsSyncCompletions = 0;
      // Track, per sync panel, whether the success message is shown, and count each change from
      // not shown to shown: an edited status text or a re-created status element alike. A panel
      // that mounts (for example when opening Settings) only sets the baseline.
      let region = null, shown = false;
      const check = () => {
        const current = document.querySelector('[aria-label="Encrypted account sync"]');
        const now = !!current && (current.textContent ?? '').includes(success);
        if (current !== region) { region = current; shown = now; return; }
        if (now && !shown) w.__zigoalsSyncCompletions++;
        shown = now;
      };
      check();
      new MutationObserver(check).observe(document, { subtree: true, childList: true, characterData: true });
    }
    return w.__zigoalsSyncCompletions;
  }, SUCCESS);
  return async () => {
    await page.waitForFunction(mark => window.__zigoalsSyncCompletions > mark && [...document.querySelectorAll('button')].some(b => b.textContent === 'Sync now' && !b.disabled), mark);
    await page.getByRole('region', { name: 'Encrypted account sync', exact: true }).getByText(SUCCESS).waitFor();
  };
}
