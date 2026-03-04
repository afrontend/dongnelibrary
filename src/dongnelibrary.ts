import * as gg from "./localLibraryModule/gg";
import * as gunpo from "./localLibraryModule/gunpo";
import * as hscity from "./localLibraryModule/hscity";
import * as osan from "./localLibraryModule/osan";
import * as snlib from "./localLibraryModule/snlib";
import * as suwon from "./localLibraryModule/suwon";
import * as yjlib from "./localLibraryModule/yjlib";
import * as yongin from "./localLibraryModule/yongin";
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
// Configuration
// =============================================================================

const LIBRARY_MODULES: LibraryModule[] = [
  gg,
  gunpo,
  hscity,
  osan,
  snlib,
  suwon,
  yjlib,
  yongin,
];

const UNKNOWN_LIBRARY_ERROR: SearchError = { msg: "Unknown library name" };

const UNKNOWN_LIBRARY: LibraryRegistryEntry = {
  name: "Unknown",
  search: async (_opt, onResult) => {
    onResult?.(UNKNOWN_LIBRARY_ERROR);
  },
  homeUrl: "",
};

// =============================================================================
// Library Registry
// =============================================================================

const allLibraryList: LibraryRegistryEntry[] = LIBRARY_MODULES.flatMap(
  (module) =>
    module.getLibraryNames().map((name) => ({
      name,
      search: module.search,
      homeUrl: module.homeUrl,
    })),
);

export const getAllLibraryNames = (): string[] =>
  allLibraryList.map((lib) => lib.name);

export const getAllModuleNames = (): string[] =>
  LIBRARY_MODULES.map((m) => m.moduleName);

export const getModuleHomeUrls = (): Record<string, string> =>
  Object.fromEntries(LIBRARY_MODULES.map((m) => [m.moduleName, m.homeUrl]));

export const isModuleName = (name: string): boolean =>
  LIBRARY_MODULES.some((m) => m.moduleName === name);

const getLibraryNamesInModule = (moduleName: string): string[] =>
  LIBRARY_MODULES.find((m) => m.moduleName === moduleName)?.getLibraryNames() ??
  [];

const getLibraryRegistryEntryByName = (
  libraryName: string,
): LibraryRegistryEntry =>
  allLibraryList.find((lib) => lib.name === libraryName) ?? UNKNOWN_LIBRARY;

const completeLibraryName = (str: string): string =>
  getAllLibraryNames().find((name) => name.includes(str)) ?? "";

const isValidLibraryName = (libraryName: string): boolean =>
  allLibraryList.some((lib) => lib.name === libraryName) ||
  getAllModuleNames().some((moduleName) => moduleName === libraryName);

const expandModuleNames = (libraryNameList: string[]): string[] =>
  libraryNameList.flatMap((name) =>
    isModuleName(name) ? getLibraryNamesInModule(name) : [name],
  );

const resolveNameList = (libraryName: string | string[]): string[] => {
  if (libraryName === "") return getAllLibraryNames();
  if (Array.isArray(libraryName)) return expandModuleNames(libraryName);
  if (isModuleName(libraryName)) return getLibraryNamesInModule(libraryName);
  return [libraryName];
};

const resolveLibraryRegistryEntry = (
  libraryName: string | string[],
): LibraryRegistryEntry[] =>
  resolveNameList(libraryName)
    .map(completeLibraryName)
    .filter(isValidLibraryName)
    .map(getLibraryRegistryEntryByName);

// =============================================================================
// Book Result Helpers
// =============================================================================

const normalizeBook = ({ libraryName, title, exist, bookUrl }: Book): Book => ({
  libraryName,
  title,
  exist,
  bookUrl,
});

const sortByAvailability = (books: Book[]): Book[] =>
  books.sort((a, b) => (a.exist === b.exist ? 0 : a.exist ? -1 : 1));

const processBooklist = (books: Book[]): Book[] =>
  sortByAvailability(books.map(normalizeBook));

// =============================================================================
// Search Logic
// =============================================================================

interface SearchLibraryResult {
  error?: SearchError;
  result?: SearchResult;
}

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

// Re-export types for consumers
export type {
  SearchResult,
  SearchError,
  SearchOptionsMain,
  SearchCallback,
  SearchCompleteCallback,
  Book,
} from "./types";

({
  getAllLibraryNames,
  getAllModuleNames,
  getModuleHomeUrls,
  isModuleName,
  searchAsync,
  search,
}) satisfies DongneLibraryAPI;
