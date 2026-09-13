import { expect, test } from "vitest";
import {
  deployment,
  deployedManifest,
  requireConfiguredDeployment,
} from "./deployment-config";
test("shipped public configuration is valid prepared evidence with no financial execution authority", () => {
  expect(deployment.success).toBe(true);
  expect(deployedManifest).toBeNull();
  expect(() => requireConfiguredDeployment()).toThrow(/not deployed/i);
});
