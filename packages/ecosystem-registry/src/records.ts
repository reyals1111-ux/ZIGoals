import records from "./providers.json";
import { parseProvider } from "./index";
/** Checked-in research snapshot, parsed once (Session X Part 5a: providers.ts and directory.ts each parsed it before). */
const parsed = records.map(parseProvider);
/**
 * Session AF (ADR-028 H25): records that only hold verified links and are not an ecosystem app. `zig-finance` carries the
 * links that belong to no single app (the ZIG Finance and ZIGChain sites, the Hub, the faucet, ZIGScan, Keplr); it is never
 * a directory entry, so the provider list and the Ecosystem directory stay exactly the research participants.
 */
// Session AF (L2b, moved by the lead): the wallet menu, phone paths, Add money and its guides keep their links here too.
export const LINK_REGISTRY_ONLY: readonly string[] = Object.freeze(["zig-finance", "wallets-and-money"]);
export const ecosystemProviders = parsed.filter((record) => !LINK_REGISTRY_ONLY.includes(record.id));
/** Every parsed record with its verified links, the link-only ones included (the registry tests read this). */
export const registryRecords = parsed;
