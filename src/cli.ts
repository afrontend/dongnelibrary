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

/** UI messages */
const MESSAGES = {
  cancelSearch: "검색 취소 중...",
  libraryCount: (count: number) => `모두 ${count} 개의 도서관`,
  moduleCount: (count: number) => `모두 ${count} 개의 통합 도서관`,
  searchSummary: (libs: number, books: number) =>
    `${libs} 개의 도서관에서  ${books} 권 검색됨`,
  promptLibrary: "도서관 이름은?",
  promptModuleName: "통합도서관 이름은?",
  promptTitle: "책 이름은?",
  unknownError: "Unknown Error",
};

const conf = new Configstore(pkg.name, {});

/** Configuration helpers for persistent storage */
const config = {
  getModuleName: (): string | undefined =>
    conf.get("moduleName") as string | undefined,
  setModuleName: (name: string): void => conf.set("moduleName", name),
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
  .option("-a, --library-list", "Show all libraries")
  .option("-i, --interactive", "Search with library name")
  .option(
    "-m, --interactive-with-library-module",
    "Search with library module name (includes integrated libraries)",
  )
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
const printBooks = ({ booklist }: SearchResult): void => {
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
  const libs = dl.getAllLibraryNames();
  libs.forEach((name) => console.log(name));
  console.log(colors.green(MESSAGES.libraryCount(libs.length)));
};

/**
 * Find full library name from partial string.
 */
const getFullLibraryName = (str: string): string | undefined =>
  dl.getAllLibraryNames().find((name) => name.includes(str));

/**
 * Count total books across all search results.
 */
const getBookCount = (results: SearchResult[]): number =>
  results.reduce((sum, book) => sum + (book?.booklist?.length ?? 0), 0);

/**
 * Convert comma-separated library names to full name list.
 */
const getLibraryFullNameList = (libraryNameWithCommas: string): string[] => {
  const list = util
    .getArrayFromCommaSeparatedString(libraryNameWithCommas)
    .map((name) => getFullLibraryName(name) || "")
    .filter((name) => !dl.isModuleName(name) && name);
  return list;
};

/**
 * Prepend module names to library name list for search.
 */

const prependModuleNames = (libraryNameList: string[]): string[] => {
  return [...dl.getAllModuleNames(), ...libraryNameList];
};

/**
 * Set up SIGINT handler for graceful cancellation.
 * Returns cleanup function to remove the listener.
 */
const setupCancellation = (onCancel: () => void): (() => void) => {
  const handler = (): void => {
    console.log("\n" + colors.yellow(MESSAGES.cancelSearch));
    onCancel();
  };
  process.once("SIGINT", handler);
  return () => process.removeListener("SIGINT", handler);
};

/**
 * Animated dots spinner shown while waiting for search results.
 * Clears itself from the line when stopped.
 */
const createSpinner = (message: string) => {
  const frames = ["   ", ".  ", ".. ", "..."];
  let i = 0;
  const timer = setInterval(() => {
    process.stdout.write(`\r${message}${frames[i++ % frames.length]}`);
  }, 300);

  const stop = () => {
    clearInterval(timer);
    process.stdout.write("\r" + " ".repeat(message.length + 4) + "\r");
  };

  return { stop };
};

/**
 * Search libraries for books and print results.
 * Supports graceful cancellation with Ctrl+C.
 */
const searchBooks = ({
  title,
  libraryName,
}: {
  title: string;
  libraryName: string | string[];
}): Promise<SearchResult[]> =>
  new Promise((resolve) => {
    const controller = new AbortController();
    const results: SearchResult[] = [];
    const cleanup = setupCancellation(() => controller.abort());
    const spinner = createSpinner("검색 중");

    dl.search(
      { title, libraryName, signal: controller.signal },
      (err, book) => {
        spinner.stop();
        if (err) {
          if (err.msg?.toLowerCase().includes("abort")) return;
          console.log(err.msg ?? MESSAGES.unknownError);
        } else if (book) {
          printBooks(book);
          results.push(book);
        }
      },
      () => {
        spinner.stop();
        cleanup();
        resolve(results);
      },
    );
  });

/**
 * Print search summary with library and book counts.
 */
const printSearchSummary = (results: SearchResult[]): void => {
  const bookCount = getBookCount(results);
  console.log(colors.green(MESSAGES.searchSummary(results.length, bookCount)));
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
    message: MESSAGES.promptLibrary,
    choices: dl.getAllLibraryNames().map((name) => ({ name, value: name })),
    default: config.getLibrary(),
  });

  const title = await input({
    message: MESSAGES.promptTitle,
    default: config.getTitle(),
  });

  config.setLibrary(library);
  config.setTitle(title);

  return { libraryName: library, title };
};

/**
 * Interactive prompt for search options using inquirer with library module name.
 */
const promptForSearchOptionsWithLibraryModuleName = async (): Promise<{
  libraryName: string;
  title: string;
}> => {
  introMessage("Dongne Library");

  const moduleName = await select({
    message: MESSAGES.promptModuleName,
    choices: dl.getAllModuleNames().map((name) => ({ name, value: name })),
    default: config.getModuleName(),
  });

  const title = await input({
    message: MESSAGES.promptTitle,
    default: config.getTitle(),
  });

  config.setModuleName(moduleName);
  config.setTitle(title);

  return { libraryName: moduleName, title };
};

interface ProgramOptions {
  libraryList?: boolean;
  interactive?: boolean;
  interactiveWithLibraryModule?: boolean;
  libraryName?: string;
  title?: string;
}

/** Main entry point - parse CLI options and execute search */
const activate = async (): Promise<void> => {
  const opts = program.opts() as ProgramOptions;
  const {
    libraryList,
    interactive,
    interactiveWithLibraryModule,
    libraryName,
    title,
  } = opts;

  if (libraryList) {
    printAllLibraryNames();
    return;
  }

  let searchOptions:
    | { title: string; libraryName: string | string[] }
    | undefined;
  if (interactive) {
    searchOptions = await promptForSearchOptions();
  } else if (interactiveWithLibraryModule) {
    searchOptions = await promptForSearchOptionsWithLibraryModuleName();
  } else if (libraryName && title) {
    const libraryNames = prependModuleNames(
      getLibraryFullNameList(libraryName),
    );
    searchOptions = {
      title,
      libraryName: libraryNames,
    };
  } else if (title) {
    searchOptions = { title, libraryName: "" };
  } else {
    return;
  }

  const results = await searchBooks(searchOptions);
  printSearchSummary(results);
};

activate();
