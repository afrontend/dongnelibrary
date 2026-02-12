import * as gg from "./library/gg";
import * as gunpo from "./library/gunpo";
import * as hscity from "./library/hscity";
import * as osan from "./library/osan";
import * as snlib from "./library/snlib";
import * as suwon from "./library/suwon";
import * as yjlib from "./library/yjlib";
import * as yongin from "./library/yongin";
import type {
  Book,
  LibraryModule,
  LibraryRegistryEntry,
  SearchError,
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

export const getModuleHomeUrls = (): Record<string, string> =>
  Object.fromEntries(LIBRARY_MODULES.map((m) => [m.moduleName, m.homeUrl]));

const isModuleName = (name: string): boolean =>
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
  allLibraryList.some((lib) => lib.name === libraryName);

const resolveLibraryRegistryEntry = (
  libraryName: string | string[],
): LibraryRegistryEntry[] => {
  const names =
    libraryName === ""
      ? getAllLibraryNames()
      : Array.isArray(libraryName)
        ? libraryName
        : isModuleName(libraryName)
          ? getLibraryNamesInModule(libraryName)
          : [libraryName];
  return names
    .map((name) => completeLibraryName(name))
    .filter((fullName) => isValidLibraryName(fullName))
    .map((fullName) => getLibraryRegistryEntryByName(fullName));
};

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

export type SearchCallback = (
  err: SearchError | null,
  result?: SearchResult,
) => void;

export type SearchCompleteCallback = (
  err: SearchError | null,
  results?: SearchResult[],
) => void;

export interface SearchOptionsMain {
  title: string;
  libraryName: string | string[];
  signal?: AbortSignal;
}

export const search = (
  opt: SearchOptionsMain | undefined | null,
  onResult?: SearchCallback,
  onComplete?: SearchCompleteCallback,
): void => {
  if (!opt || (!onResult && !onComplete)) {
    console.log("invalid search options");
    return;
  }

  const { title, libraryName, signal } = opt;
  const libraries = resolveLibraryRegistryEntry(libraryName);

  const promises = libraries.map(async (lib) => {
    if (signal?.aborted) {
      return null;
    }
    const { error, result } = await searchLibrary(lib, title, signal);
    if (error) {
      onResult?.(error);
      return null;
    }
    onResult?.(null, result);
    return result;
  });

  Promise.all(promises).then((results) => {
    const validResults = results.filter((r): r is SearchResult => r !== null);
    onComplete?.(null, validResults);
  });
};

export const searchAsync = (
  opt: SearchOptionsMain,
  onResult?: SearchCallback,
): Promise<SearchResult[]> => {
  return new Promise((resolve, reject) => {
    if (!opt) {
      reject(new Error("invalid search options"));
      return;
    }

    const { title, libraryName, signal } = opt;
    const libraries = resolveLibraryRegistryEntry(libraryName);

    const promises = libraries.map(async (lib) => {
      if (signal?.aborted) {
        return null;
      }
      const { error, result } = await searchLibrary(lib, title, signal);
      if (error) {
        onResult?.(error);
        return null;
      }
      onResult?.(null, result);
      return result;
    });

    Promise.all(promises).then((results) => {
      const validResults = results.filter((r): r is SearchResult => r !== null);
      resolve(validResults);
    });
  });
};

// Re-export types for consumers
export type { SearchResult, SearchError, Book } from "./types";
