import {expect, test} from '@playwright/test';
import {governanceRelay, openGovernance, proposalsWire} from '../../governance-chain';
import {chooseChain} from '../../chain-choice';

// Session AL (lane L6): Governance cards, Berlin BN-008/BN-180 (test and template proposals unflagged, the quorum
// paragraph on every card), BN-177 (Rejected with Yes and no word on turnout), BN-178 (deposit period read as voting)
// and BN-179 (raw Markdown in the proposer's words). Desktop 1280; the relay is the recorded double plus one fictional
// template proposal shaped like Berlin's "[COMPANY_NAME]_Test".
test.use({viewport: {width: 1280, height: 900}});
test.beforeEach(async ({page}) => { await chooseChain(page); });
const TEMPLATE = {id: '110', state: 'rejected', title: '[COMPANY_NAME]_Test', summary: '## Summary\n\n**What**: a template body.\n- one point', messageTypes: [], submitTime: '2026-09-01T10:00:00.000Z', depositEndTime: '2026-09-15T10:00:00.000Z', votingStartTime: '2026-09-02T10:00:00.000Z', votingEndTime: '2026-09-02T10:10:00.000Z', totalDeposit: '100000000000000000000', expedited: false, failedReason: 'proposal did not get enough votes to pass', tally: {yes: '1000', no: '0', abstain: '0', noWithVeto: '0'}, tallyKind: 'final'};

test('BN-008/BN-180/BN-177/BN-178/BN-179: template flagged, rules once, turnout honesty, deposit apart, Markdown as words', async ({page}) => {
  await governanceRelay(page, 'practice', {proposals: () => { const w = proposalsWire('practice'); return {...w, proposals: [...w.proposals, TEMPLATE]}; }});
  const view = await openGovernance(page);
  const card = view.locator('article[data-proposal="110"]');
  await expect(card).toContainText('Looks like a test or template');
  await expect(view.locator('article[data-proposal="119"]')).toContainText('Looks like a test or template');
  await expect(view.locator('article[data-proposal="121"]')).not.toContainText('Looks like a test or template');
  // The passing rules in full once on the page; the other cards point to them.
  await expect(view.getByText(/^To pass, at least/)).toHaveCount(1);
  await expect(card).toContainText('The passing rules (quorum, threshold and veto) are under the first proposal’s votes above.');
  await expect(card).toContainText('ZIGoals cannot show this proposal’s turnout');
  await expect(card).toContainText('Voting started');
  await expect(card).toContainText('the deposit period, not voting');
  await card.locator('details.governance-summary summary').click();
  await expect(card.locator('.governance-summary-text')).toHaveText('Summary What: a template body. • one point');
});
