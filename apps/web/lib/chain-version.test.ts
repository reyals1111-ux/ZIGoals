import {expect, test} from 'vitest';
import {REVIEWED_TESTNET_VERSIONS} from '@zigoals/chain-config';
import {deploymentSchema} from '@zigoals/shared-types/deployment';
import {deployedFixture} from '../../../packages/shared-types/src/deployment.fixture';
import prepared from '../config/deployment.json' with {type: 'json'};

// Session X Part 1: the manifest schema accepts the repository's prepared manifest (made on v5.0.0-patch-1, 2026-09-13)
// and exactly the reviewed v5.1 versions, the list @zigoals/chain-config verifies live nodes against.
test('the manifest accepts the reviewed versions and the prepared manifest’s own, nothing else', () => {
  const accepted = deploymentSchema.options.flatMap(option => option.shape.chainVersion.options);
  expect([...new Set(accepted)].sort()).toEqual(['v5.0.0-patch-1', ...REVIEWED_TESTNET_VERSIONS].sort());
  expect(deploymentSchema.safeParse(prepared).success).toBe(true);
  expect(prepared.chainVersion).toBe('v5.0.0-patch-1');
  for (const chainVersion of REVIEWED_TESTNET_VERSIONS) expect(deploymentSchema.safeParse({...deployedFixture(), chainVersion}).success).toBe(true);
});
