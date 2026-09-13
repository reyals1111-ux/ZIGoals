import configured from "../config/deployment.json";
import {
  deploymentSchema,
  requireDeployedManifest,
} from "@zigoals/shared-types/deployment";
export const deployment = deploymentSchema.safeParse(configured);
export const deployedManifest =
  deployment.success && deployment.data.status === "DEPLOYED"
    ? deployment.data
    : null;
export function requireConfiguredDeployment() {
  return requireDeployedManifest(configured);
}
