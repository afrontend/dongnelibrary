import type { Book, LibraryInfo, SearchCallback, SearchError, SearchOptions, SearchResult } from "./types";

/**
 * Strip HTML tags from a string.
 */
export function stripTags(str: string): string {
  return str.replace(/<\/?[^>]+(>|$)/g, "");
}

/**
 * Print book list as formatted JSON to console.
 */
export function printBookList(booklist: Book[]): void {
  console.log(JSON.stringify(booklist, null, 2));
}

/**
 * Print total book count and current page information.
 */
export function printTotalBookCount(book: SearchResult): void {
  if (book.totalBookCount) {
    console.log("TotalCount: " + book.totalBookCount);
    if (book.startPage) {
      console.log("CurrentPage: " + book.startPage);
    }
  } else {
    console.log("TotalCount is not defined.");
  }
}

/**
 * Convert comma separated strings to Array.
 */
export function getArrayFromCommaSeparatedString(libs: string | undefined | null): string[] {
  if (!libs) return [];
  const a = libs.split(",").filter(function (lib) {
    if (lib && lib.length > 0) {
      return true;
    } else {
      return false;
    }
  });

  return a.map(function (lib) {
    return lib.trim();
  });
}

/**
 * Extract library names from a library list.
 */
export function getLibraryNames(lst: LibraryInfo[]): string[] {
  return lst.map(function (item) {
    return item.name;
  });
}

/**
 * Create a library code lookup function for a given library list.
 * Factory pattern to avoid duplicating getLibraryCode() in each module.
 */
export function createLibraryCodeLookup(libraryList: LibraryInfo[]): (libraryName: string) => string {
  return function getLibraryCode(libraryName: string): string {
    const found = libraryList.find((lib) => lib.name === libraryName);
    return found ? found.code : "";
  };
}

/**
 * Extract the first number from a string.
 * Useful for parsing count values from text like "총 123건".
 */
export function extractNumber(text: string | undefined | null, defaultValue: string = "0"): string {
  const match = (text ?? "").match(/\d+/);
  return match ? match[0] : defaultValue;
}

/**
 * Validate search options. Throws an error if validation fails.
 */
export function validateSearchOptions(opt: SearchOptions): void {
  const { title, libraryName } = opt;

  if (!title) {
    throw new Error("Need a book name");
  }

  if (!libraryName) {
    throw new Error("Need a library name");
  }
}

/**
 * Wrap an async function to support both Promise and callback patterns.
 */
export function wrapWithCallback<T extends SearchOptions>(
  asyncFn: (opt: T) => Promise<SearchResult>
): (opt: T, callback?: SearchCallback) => Promise<SearchResult | void> {
  return async function (opt: T, callback?: SearchCallback): Promise<SearchResult | void> {
    if (!callback) {
      return asyncFn(opt);
    }
    try {
      const result = await asyncFn(opt);
      callback(null, result);
    } catch (err) {
      const error = err as Error;
      callback({ msg: error.message || error.toString() } as SearchError);
    }
  };
}
