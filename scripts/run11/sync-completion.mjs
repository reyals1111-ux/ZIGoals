// Waits for an encrypted account sync that completes after the wait was armed.
// The success message stays on screen after a sync, so reading it alone can
// accept an older completion in the moment between a click and the busy
// state. A MutationObserver counts each time the status text changes into the
// success message; mounting the panel with an old message does not count.
const SUCCESS = 'Account records synced and acknowledged';

export async function armSyncCompletion(page) {
  const mark = await page.evaluate(success => {
    const w = window;
    if (w.__zigoalsSyncCompletions === undefined) {
      w.__zigoalsSyncCompletions = 0;
      new MutationObserver(records => {
        for (const record of records) {
          const region = record.target.parentElement?.closest('[aria-label="Encrypted account sync"]');
          if (region && record.target.data.includes(success) && !record.oldValue?.includes(success)) w.__zigoalsSyncCompletions++;
        }
      }).observe(document, { subtree: true, characterData: true, characterDataOldValue: true });
    }
    return w.__zigoalsSyncCompletions;
  }, SUCCESS);
  return async () => {
    await page.waitForFunction(mark => window.__zigoalsSyncCompletions > mark && [...document.querySelectorAll('button')].some(b => b.textContent === 'Sync now' && !b.disabled), mark);
    await page.getByRole('region', { name: 'Encrypted account sync', exact: true }).getByText(SUCCESS).waitFor();
  };
}
