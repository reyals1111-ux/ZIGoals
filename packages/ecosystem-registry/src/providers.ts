import records from "./providers.json";
import { parseProvider } from "./index";
/** Checked-in research snapshot; never remote executable configuration. */
export const ecosystemProviders = records.map(parseProvider);
export {directoryEntries,directoryResources,directoryCategories,directoryReviewedAt,filterDirectory,type DirectoryEntry,type DirectoryCategory} from './directory';
