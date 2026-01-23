import * as gg from "./library/gg";
import * as gunpo from "./library/gunpo";
import * as hscity from "./library/hscity";
import * as osan from "./library/osan";
import * as snlib from "./library/snlib";
import * as suwon from "./library/suwon";
import * as yongin from "./library/yongin";
import * as util from "./util";
import type { Book, LibraryModule, LibraryRegistryEntry, SearchError, SearchResult } from "./types";

// =============================================================================
// Configuration
// =============================================================================

const LIBRARY_MODULES: LibraryModule[] = [gg, gunpo, hscity, osan, snlib, suwon, yongin];

const UNKNOWN_LIBRARY_ERROR: SearchError = { msg: "Unknown library name" };

const UNKNOWN_LIBRARY: LibraryRegistryEntry = {
  name: "Unknown",
  search: async (_opt, onResult) => { onResult?.(UNKNOWN_LIBRARY_ERROR); },
  homeUrl: "",
};

// =============================================================================
// Library Registry
// =============================================================================

const libraryList: LibraryRegistryEntry[] = LIBRARY_MODULES.flatMap((module) =>
  module.getLibraryNames().map((name) => ({
    name,
    search: module.search,
    homeUrl: module.homeUrl,
  })),
);

export const getLibraryNames = (): string[] => libraryList.map((lib) => lib.name);

const getLibraryByName = (libraryName: string): LibraryRegistryEntry =>
  libraryList.find((lib) => lib.name === libraryName) ?? UNKNOWN_LIBRARY;

const completeLibraryName = (str: string): string =>
  getLibraryNames().find((name) => name.includes(str)) ?? "";

const isValidLibraryName = (libraryName: string): boolean =>
  libraryList.some((lib) => lib.name === libraryName);

const resolveLibraries = (libraryName: string | string[]): LibraryRegistryEntry[] => {
  const names = Array.isArray(libraryName) ? libraryName : [libraryName];
  return names
    .map((name) => completeLibraryName(name))
    .filter((fullName) => isValidLibraryName(fullName))
    .map((fullName) => getLibraryByName(fullName));
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

const processBooklist = (books: Book[]): Book[] => sortByAvailability(books.map(normalizeBook));

// =============================================================================
// Search Logic
// =============================================================================

interface SearchLibraryResult {
  error?: SearchError;
  result?: SearchResult;
}

const searchLibrary = (lib: LibraryRegistryEntry, title: string): Promise<SearchLibraryResult> =>
  new Promise((resolve) => {
    lib.search({ title, libraryName: lib.name }, (err, data) => {
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

export type SearchCallback = (err: SearchError | null, result?: SearchResult) => void;
export type SearchCompleteCallback = (err: SearchError | null, results?: SearchResult[]) => void;

export interface SearchOptionsMain {
  title: string;
  libraryName: string | string[];
}

export const search = (
  opt: SearchOptionsMain | undefined | null,
  onResult?: SearchCallback,
  onComplete?: SearchCompleteCallback
): void => {
  if (!opt || (!onResult && !onComplete)) {
    console.log("invalid search options");
    return;
  }

  const { title, libraryName } = opt;
  const libraries = resolveLibraries(libraryName);

  const promises = libraries.map(async (lib) => {
    const { error, result } = await searchLibrary(lib, title);
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

// Re-export types for consumers
export type { SearchResult, SearchError, Book } from "./types";
