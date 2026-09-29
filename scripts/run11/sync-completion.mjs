// Waits for an encrypted account sync that completes after the wait was armed.
// The success message stays on screen after a sync, so reading it alone can
// accept an older completion in the moment between a click and the busy
// state. A MutationObserver counts a completion only when the status line shows
// the success message after a different message; old text never counts.
const SUCCESS = 'Account records synced and acknowledged';

export async function armSyncCompletion(page) {
  const mark = await page.evaluate(success => {
    const w = window;
    if (w.__zigoalsSyncCompletions === undefined) {
      w.__zigoalsSyncCompletions = 0;
      // Count a completion only when the panel's status line shows the success message after it
      // showed a different, non-success message ("Syncing…", "Vault unlocked…", …) observed since
      // the last counted completion. A removed or re-created status element never resets that state,
      // so re-rendering the old success text can never count; a panel that mounts only sets it.
      let region = null, sawOther = false;
      const check = () => {
        const current = document.querySelector('[aria-label="Encrypted account sync"]');
        const status = current?.querySelector('[role="status"]');
        if (current !== region) { region = current; sawOther = !!status && !(status.textContent ?? '').includes(success); return; }
        if (!status) return;
        if (!(status.textContent ?? '').includes(success)) { sawOther = true; return; }
        if (sawOther) { w.__zigoalsSyncCompletions++; sawOther = false; }
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
