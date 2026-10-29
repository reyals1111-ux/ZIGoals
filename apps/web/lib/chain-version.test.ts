import {expect, test} from 'vitest';
import {REVIEWED_TESTNET_VERSIONS, isReviewedVersion} from '@zigoals/chain-config';
import {MANIFEST_CHAIN_VERSION, deploymentSchema} from '@zigoals/shared-types/deployment';
import {deployedFixture} from '../../../packages/shared-types/src/deployment.fixture';
import prepared from '../config/deployment.json' with {type: 'json'};

// Session X Part 1, Session AJ (ADR-035 D1): the manifest schema accepts the repository's prepared manifest (made on
// v5.0.0-patch-1, 2026-09-13) and any patch of zig-test-2's reviewed lines — the same rule @zigoals/chain-config verifies
// live nodes with — and nothing else.
const SAMPLES = ['v5.1.0', 'v5.1.2', 'v5.1.3', 'v5.1.10', 'v6.0.0', 'v6.0.3', 'v6.1.0', 'v7.0.0', 'v5.0.9', 'v5.2.0', 'v6.0.0-rc1', 'v6.0', '6.0.0', 'v5.0.0-patch-1', ''];
test('the manifest accepts the reviewed lines and the prepared manifest’s own version, nothing else', () => {
  for (const version of SAMPLES) expect(MANIFEST_CHAIN_VERSION.test(version), version).toBe(version === 'v5.0.0-patch-1' || isReviewedVersion('zig-test-2', version));
  expect(deploymentSchema.safeParse(prepared).success).toBe(true);
  expect(prepared.chainVersion).toBe('v5.0.0-patch-1');
  for (const chainVersion of REVIEWED_TESTNET_VERSIONS) expect(deploymentSchema.safeParse({...deployedFixture(), chainVersion}).success).toBe(true);
  for (const chainVersion of ['v6.1.0', 'v5.0.9']) expect(deploymentSchema.safeParse({...deployedFixture(), chainVersion}).success).toBe(false);
});
