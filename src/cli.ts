#!/usr/bin/env node
import Configstore from "configstore";
import colors from "colors";
import figlet from "figlet";
import { select, input } from "@inquirer/prompts";
import program from "commander";
import * as dl from "./dongnelibrary";
import * as util from "./util";
import type { SearchResult } from "./types";

// Read package.json
const pkg = require("../package.json") as { name: string; version: string };

// Constants
const DEFAULT_TITLE = "javascript";
const LIBRARY_SUFFIX = "도서관";

const conf = new Configstore(pkg.name, {});

/** Configuration helpers for persistent storage */
const config = {
  getLibrary: (): string | undefined =>
    conf.get("library") as string | undefined,
  setLibrary: (name: string): void => conf.set("library", name),
  getTitle: (): string =>
    (conf.get("title") as string | undefined) ?? DEFAULT_TITLE,
  setTitle: (title: string): void => conf.set("title", title),
};

/**
 * Display ASCII art intro message using figlet.
 */
const introMessage = (msg: string): void => {
  console.log(
    figlet.textSync(msg, {
      font: "Standard",
      horizontalLayout: "default",
      verticalLayout: "default",
    }),
  );
};

program
  .version(pkg.version)
  .option("-a, --library-list", "Show libraries")
  .option("-i, --interactive", "Use menu")
  .option("-l, --library-name [name,name]", "library name")
  .option("-t, --title [title]", "a part of book title")
  .parse(process.argv);

/**
 * Truncate string at first occurrence of substring.
 */
const truncateAt = (str: string, substring: string): string => {
  const index = str.indexOf(substring);
  return index === -1 ? str : str.substring(0, index);
};

/** Status marks for book availability display */
const MARKS = {
  ok: "✓ ",
  notOk: "✖ ",
};

/**
 * Print book search results to console.
 */
const printBooks = ({ booklist, homeUrl }: SearchResult): void => {
  if (homeUrl) {
    console.log(colors.yellow(`[${homeUrl}]`));
  }
  for (const { libraryName, exist, title, bookUrl } of booklist) {
    const mark = exist ? ` ${MARKS.ok} ` : ` ${colors.red(MARKS.notOk)} `;
    console.log(`${truncateAt(libraryName, LIBRARY_SUFFIX)}${mark}${title}`);
    if (bookUrl) {
      console.log(`  → ${colors.cyan(bookUrl)}`);
    }
  }
};

/** Print all available library names to console */
const printAllLibraryNames = (): void => {
  const libs = dl.getLibraryNames();
  libs.forEach((name) => console.log(name));
  console.log(colors.green(`모두 ${libs.length} 개의 도서관`));
};

/**
 * Find full library name from partial string.
 */
const getFullLibraryName = (str: string): string | undefined =>
  dl.getLibraryNames().find((name) => name.includes(str));

/**
 * Count total books across all search results.
 */
const getBookCount = (results: SearchResult[]): number =>
  results.reduce((sum, book) => sum + (book?.booklist?.length ?? 0), 0);

/**
 * Convert comma-separated library names to full name list.
 */
const getLibraryFullNameList = (libraryName: string): string[] =>
  util
    .getArrayFromCommaSeparatedString(libraryName)
    .filter((name) => getFullLibraryName(name));

/**
 * Get library names to search - either specified or all.
 */
const getLibraries = (libraryName?: string): string[] =>
  libraryName ? getLibraryFullNameList(libraryName) : dl.getLibraryNames();

/**
 * Search libraries for books and print results.
 */
const searchBooks = ({
  title,
  libraryName,
}: {
  title: string;
  libraryName?: string;
}): Promise<SearchResult[]> =>
  new Promise((resolve) => {
    const results: SearchResult[] = [];
    dl.search(
      { title, libraryName: getLibraries(libraryName) },
      (err, book) => {
        if (err) {
          console.log(err.msg ?? "Unknown Error");
        } else if (book) {
          printBooks(book);
          results.push(book);
        }
      },
      (err, allBooks) => {
        if (err) {
          console.log("Error, Can't access detail information");
          resolve([]);
        } else {
          resolve(allBooks ?? []);
        }
      },
    );
  });

/**
 * Print search summary with library and book counts.
 */
const printSearchSummary = (results: SearchResult[]): void => {
  const bookCount = getBookCount(results);
  console.log(
    colors.green(`${results.length} 개의 도서관에서  ${bookCount} 권 검색됨`),
  );
};

/**
 * Interactive prompt for search options using inquirer.
 */
const promptForSearchOptions = async (): Promise<{
  libraryName: string;
  title: string;
}> => {
  introMessage("Dongne Library");

  const library = await select({
    message: "도서관 이름은?",
    choices: dl.getLibraryNames().map((name) => ({ name, value: name })),
    default: config.getLibrary(),
  });

  const title = await input({
    message: "책 이름은?",
    default: config.getTitle(),
  });

  config.setLibrary(library);
  config.setTitle(title);

  return { libraryName: library, title };
};

interface ProgramOptions {
  libraryList?: boolean;
  interactive?: boolean;
  libraryName?: string;
  title?: string;
}

/** Main entry point - parse CLI options and execute search */
const activate = async (): Promise<void> => {
  const opts = program.opts() as ProgramOptions;
  const { libraryList, interactive, libraryName, title } = opts;

  if (libraryList) {
    printAllLibraryNames();
    return;
  }

  let searchOptions: { libraryName?: string; title: string } | undefined;

  if (interactive) {
    searchOptions = await promptForSearchOptions();
  } else if (libraryName && title) {
    searchOptions = { libraryName, title };
  } else {
    return;
  }

  const results = await searchBooks(searchOptions);
  printSearchSummary(results);
};

activate();
