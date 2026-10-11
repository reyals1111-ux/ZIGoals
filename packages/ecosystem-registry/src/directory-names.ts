/**
 * Each directory entry's name and category by id, and nothing else (Session X P2.3): what Today's pinned ecosystem widget
 * shows, without the registry's descriptions, sources, logos and schemas on every Today load. Kept equal to
 * `directoryEntries` by directory.test.ts; add an entry there and here together.
 */
export const DIRECTORY_NAMES: Readonly<Record<string, {name: string; category: string}>> = {
 "valdora": {name: "Valdora", category: "Staking & vaults"},
 "oroswap": {name: "OroSwap", category: "Trading"},
 "permapod": {name: "PermaPod", category: "Lending & real assets"},
 "nawa": {name: "Nawa", category: "Staking & vaults"},
 "zig-markets": {name: "ZIG Markets", category: "Lending & real assets"},
 "zignaly": {name: "Zignaly", category: "Trading"},
 "wme": {name: "ZIGChain Wealth Management Engine (WME)", category: "Institutional infrastructure"},
 "zamanat": {name: "Zamanat", category: "Lending & real assets"},
 "defa-invoicemate": {name: "DeFa / InvoiceMate", category: "Lending & real assets"},
 "beehive": {name: "Beehive", category: "Lending & real assets"},
 "ondo": {name: "Ondo Finance", category: "Lending & real assets"},
 "taurus": {name: "Taurus", category: "Institutional infrastructure"},
 "apex-group": {name: "Apex Group", category: "Institutional infrastructure"},
 "noble": {name: "Noble", category: "Funding rails"},
 "axelar": {name: "Axelar", category: "Funding rails"},
 "range": {name: "Range", category: "Network tools"},
 "zigscan": {name: "ZIGScan", category: "Network tools"},
 "zigchain-hub": {name: "ZIGChain Hub", category: "Network tools"},
};
