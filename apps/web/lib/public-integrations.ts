import * as z from 'zod';
import configured from '../config/public-integrations.json';

/**
 * Session AF (L2b, ADR-028 H22, H90; owner rule 2026-10-03): the one committed file of PUBLIC identifiers ZIGoals hands
 * to outside services, `apps/web/config/public-integrations.json`, every value `null` until the owner fills it in a commit:
 * - `reownProjectId`: WalletConnect's project ID (public by design: the protection is Reown's domain allowlist); null keeps
 *   the WalletConnect module unloaded and phones show "available soon" (H6, H38);
 * - `rampHostApiKey` + `rampHostAppName`: Ramp Network's hosted-mode key (public by design, sent in the page address);
 * - `banxaPartnerRef`: the subdomain Banxa assigns (`<ref>.banxa.com`).
 * No secret ever goes here: the names say what is public, the values are never key-shaped, and
 * lib/public-integrations.test.ts runs the repository's secret scan on the file. An empty ID makes its provider link to
 * its plain consumer page with nothing pre-filled. Read at build time; a file that fails the schema stops the build.
 */
const publicId = z.string().regex(/^[A-Za-z0-9_-]{4,64}$/, 'A public identifier is letters, digits, - and _ only (4 to 64).');
export const publicIntegrationsSchema = z.object({
  schemaVersion: z.literal(1),
  reownProjectId: z.string().regex(/^[0-9a-f]{32}$/, 'A Reown project ID is 32 hexadecimal digits.').nullable(),
  rampHostApiKey: publicId.nullable(),
  rampHostAppName: z.string().regex(/^[A-Za-z0-9 ._-]{1,40}$/),
  banxaPartnerRef: z.string().regex(/^[a-z0-9-]{2,40}$/, 'A Banxa partner reference is the lower-case subdomain Banxa assigns.').nullable(),
}).strict();
export type PublicIntegrations = z.infer<typeof publicIntegrationsSchema>;
export const PUBLIC_INTEGRATIONS: PublicIntegrations = Object.freeze(publicIntegrationsSchema.parse(configured));
/** WalletConnect is offered only with the owner's project ID (H6, H38). */
export const walletConnectConfigured = (config: PublicIntegrations = PUBLIC_INTEGRATIONS) => config.reownProjectId !== null;
