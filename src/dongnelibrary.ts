// =============================================================================
// IMPORTS
// =============================================================================

// Local library modules
import * as cbelib from "./localLibraryModule/cbelib";
import * as gg from "./localLibraryModule/gg";
import * as gunpo from "./localLibraryModule/gunpo";
import * as jeju from "./localLibraryModule/jeju";
import * as hscity from "./localLibraryModule/hscity";
import * as ice from "./localLibraryModule/ice";
import * as osan from "./localLibraryModule/osan";
import * as snlib from "./localLibraryModule/snlib";
import * as suwon from "./localLibraryModule/suwon";
import * as wonju from "./localLibraryModule/wonju";
import * as yjlib from "./localLibraryModule/yjlib";
import * as yongin from "./localLibraryModule/yongin";
import * as yplib from "./localLibraryModule/yplib";
import * as yslib from "./localLibraryModule/yslib";

// Type definitions
import type {
  Book,
  DongneLibraryAPI,
  LibraryModule,
  LibraryRegistryEntry,
  SearchCallback,
  SearchCompleteCallback,
  SearchError,
  SearchOptionsMain,
  SearchResult,
} from "./types";

// =============================================================================
// CONFIGURATION
// =============================================================================

/**
 * List of all available library modules
 */
const LIBRARY_MODULES: LibraryModule[] = [
  cbelib,
  gg,
  gunpo,
  jeju,
  hscity,
  ice,
  osan,
  snlib,
  suwon,
  wonju,
  yjlib,
  yongin,
  yplib,
  yslib,
];

/**
 * Error object returned when an unknown library is requested
 */
const UNKNOWN_LIBRARY_ERROR: SearchError = { msg: "Unknown library name" };

/**
 * Default library entry for unknown/invalid library names
 */
const UNKNOWN_LIBRARY: LibraryRegistryEntry = {
  name: "Unknown",
  search: async (_opt, onResult) => {
    onResult?.(UNKNOWN_LIBRARY_ERROR);
  },
  homeUrl: "",
};

// =============================================================================
// LIBRARY REGISTRY
// =============================================================================

/**
 * Flatten all library names from modules into a single registry
 */
const ALL_LIBRARY_LIST: LibraryRegistryEntry[] = LIBRARY_MODULES.flatMap(
  (module) =>
    module.getLibraryNames().map((name) => ({
      name,
      search: module.search,
      homeUrl: module.homeUrl,
    })),
);

/**
 * Get all available library names
 * @returns Array of all library names
 */
export const getAllLibraryNames = (): string[] =>
  ALL_LIBRARY_LIST.map((lib) => lib.name);

/**
 * Get all module names
 * @returns Array of all module names
 */
export const getAllModuleNames = (): string[] =>
  LIBRARY_MODULES.map((module) => module.moduleName);

/**
 * Get home URLs for all modules
 * @returns Record mapping module names to their home URLs
 */
export const getModuleHomeUrls = (): Record<string, string> =>
  Object.fromEntries(LIBRARY_MODULES.map((module) => [module.moduleName, module.homeUrl]));

/**
 * Check if a name corresponds to a known module
 * @param name - Name to check
 * @returns True if the name is a valid module name
 */
export const isModuleName = (name: string): boolean =>
  LIBRARY_MODULES.some((module) => module.moduleName === name);

/**
 * Get all library names from a specific module
 * @param moduleName - Name of the module to get libraries from
 * @returns Array of library names in the specified module
 */
export const getLibraryNamesInModule = (moduleName: string): string[] =>
  LIBRARY_MODULES.find((module) => module.moduleName === moduleName)?.getLibraryNames() ??
  [];

/**
 * Get a library registry entry by name
 * @param libraryName - Name of the library to find
 * @returns Library registry entry or unknown library if not found
 */
const getLibraryRegistryEntryByName = (
  libraryName: string,
): LibraryRegistryEntry =>
  ALL_LIBRARY_LIST.find((lib) => lib.name === libraryName) ?? UNKNOWN_LIBRARY;

/**
 * Complete a partial library name to full name
 * @param str - Partial library name to complete
 * @returns Full library name if found, otherwise empty string
 */
const completeLibraryName = (str: string): string =>
  ALL_LIBRARY_LIST.find((lib) => lib.name.includes(str))?.name ?? "";

/**
 * Validate if a library name is valid
 * @param libraryName - Name to validate
 * @returns True if the library name is valid (exists or is a module name)
 */
const isValidLibraryName = (libraryName: string): boolean =>
  ALL_LIBRARY_LIST.some((lib) => lib.name === libraryName) ||
  isModuleName(libraryName);

/**
 * Expand module names to their constituent library names
 * @param libraryNameList - List of library names and/or module names
 * @returns Expanded list with module names replaced by their constituent libraries
 */
const expandModuleNames = (libraryNameList: string[]): string[] =>
  libraryNameList.flatMap((name) =>
    isModuleName(name) ? getLibraryNamesInModule(name) : [name],
  );

/**
 * Resolve library names to their actual names
 * @param libraryName - Single library name or array of names
 * @returns Array of resolved library names
 */
const resolveNameList = (libraryName: string | string[]): string[] => {
  if (libraryName === "") return getAllLibraryNames();
  if (Array.isArray(libraryName)) return expandModuleNames(libraryName);
  if (isModuleName(libraryName)) return getLibraryNamesInModule(libraryName);
  return [libraryName];
};

/**
 * Resolve library names to their registry entries
 * @param libraryName - Single library name or array of names
 * @returns Array of registry entries for the requested libraries
 */
const resolveLibraryRegistryEntry = (
  libraryName: string | string[],
): LibraryRegistryEntry[] =>
  resolveNameList(libraryName)
    .map(completeLibraryName)
    .filter(isValidLibraryName)
    .map(getLibraryRegistryEntryByName);

// =============================================================================
// BOOK RESULT HELPERS
// =============================================================================

/**
 * Normalize book data to ensure consistent structure
 * @param book - Book object with potentially missing fields
 * @returns Normalized book object with all required fields
 */
const normalizeBook = ({ libraryName, title, exist, bookUrl }: Book): Book => ({
  libraryName,
  title,
  exist,
  bookUrl,
});

/**
 * Sort books by availability (available books first)
 * @param books - Array of books to sort
 * @returns Sorted array with available books first
 */
const sortByAvailability = (books: Book[]): Book[] =>
  books.sort((a, b) => (a.exist === b.exist ? 0 : a.exist ? -1 : 1));

/**
 * Process a list of books by normalizing and sorting them
 * @param books - Array of book objects to process
 * @returns Processed and sorted array of books
 */
const processBooklist = (books: Book[]): Book[] =>
  sortByAvailability(books.map(normalizeBook));

// =============================================================================
// SEARCH LOGIC
// =============================================================================

/**
 * Result structure for individual library searches
 */
interface SearchLibraryResult {
  error?: SearchError;
  result?: SearchResult;
}

/**
 * Perform a search on a single library
 * @param lib - Library registry entry to search
 * @param title - Search term
 * @param signal - AbortSignal for cancellation support
 * @returns Promise resolving to search result or error
 */
const searchLibrary = (
  lib: LibraryRegistryEntry,
  title: string,
  signal?: AbortSignal,
): Promise<SearchLibraryResult> =>
  new Promise((resolve) => {
    lib.search({ title, libraryName: lib.name, signal }, (err, data) => {
      if (err) {
        resolve({ error: err });
        return;
      }
      if (!data?.booklist) {
        resolve({ error: { msg: "invalid Data response" } });
        return;
      }
      resolve({
        result: {
          title,
          libraryName: lib.name,
          homeUrl: lib.homeUrl,
          totalBookCount: data.totalBookCount,
          startPage: data.startPage,
          booklist: processBooklist(data.booklist),
        },
      });
    });
  });

/**
 * Asynchronously search across multiple libraries
 * @param opt - Search options including title and library names
 * @param onResult - Callback for individual search results
 * @returns Promise resolving to array of search results
 */
export const searchAsync = (
  opt: SearchOptionsMain,
  onResult?: SearchCallback,
): Promise<SearchResult[]> => {
  const { title, libraryName, signal } = opt;
  const libraries = resolveLibraryRegistryEntry(libraryName);

  const promises = libraries.map(async (lib) => {
    if (signal?.aborted) return null;
    const { error, result } = await searchLibrary(lib, title, signal);
    if (error) {
      onResult?.(error);
      return null;
    }
    onResult?.(null, result);
    return result;
  });

  return Promise.all(promises).then((r) =>
    r.filter((v): v is SearchResult => v !== null),
  );
};

/**
 * Synchronous search wrapper that calls completion callback
 * @param opt - Search options or null/undefined
 * @param onResult - Callback for individual search results
 * @param onComplete - Callback for final search results
 */
export const search = (
  opt: SearchOptionsMain | undefined | null,
  onResult?: SearchCallback,
  onComplete?: SearchCompleteCallback,
): void => {
  if (!opt || (!onResult && !onComplete)) {
    console.log("invalid search options");
    return;
  }
  searchAsync(opt, onResult).then((results) => onComplete?.(null, results));
};

// =============================================================================
// TYPE EXPORTS
// =============================================================================

// Re-export types for consumers
export type {
  SearchResult,
  SearchError,
  SearchOptionsMain,
  SearchCallback,
  SearchCompleteCallback,
  Book,
} from "./types";

// =============================================================================
// API EXPORT
// =============================================================================

/**
 * Get the number of libraries that will be searched for a given name/names.
 */
export const resolveLibraryCount = (
  libraryName: string | string[],
): number => resolveLibraryRegistryEntry(libraryName).length;

// Default export object implementing DongneLibraryAPI
export const dongneLibrary: DongneLibraryAPI = {
   getAllLibraryNames,
   getAllModuleNames,
   getModuleHomeUrls,
   isModuleName,
   resolveLibraryCount,
   searchAsync,
   search,
};

export default dongneLibrary;
