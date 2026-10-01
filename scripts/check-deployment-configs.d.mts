// Types for check-deployment-configs.mjs, used by check-deployment-configs.test.ts.

/** A parsed wrangler.jsonc file. The validator treats every field as untrusted input
 * (tests feed it deliberately malformed shapes), so this stays the untyped JSON.parse result. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type WranglerConfig = Record<string, any>;

export interface DeploymentConfigPair {
  landing: WranglerConfig;
  alpha: WranglerConfig;
}

/** Returns one message per violated rule; an empty array means the pair is valid. */
export function validateDeploymentConfigs(input: Partial<DeploymentConfigPair> & { root?: string }): string[];
export function readDeploymentConfigs(root?: string): DeploymentConfigPair;
export function validateRepositoryDeploymentConfigs(root?: string): string[];

/** Paths, relative to the landing directory, that must never reach the public apex.
 * Directories are reported with a trailing slash; an empty array means the tree is clean. */
export function unpublishableLandingFiles(landingRoot: string, prefix?: string): string[];
