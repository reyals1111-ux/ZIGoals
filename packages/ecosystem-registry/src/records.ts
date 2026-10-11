import records from "./providers.json";
import { parseProvider } from "./index";
/** Checked-in research snapshot, parsed once (Session X Part 5a: providers.ts and directory.ts each parsed it before). */
export const ecosystemProviders = records.map(parseProvider);
