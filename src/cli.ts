#!/usr/bin/env node
import Configstore from "configstore";
import colors from "colors";
import figlet from "figlet";
import { select, input, search } from "@inquirer/prompts";
import { Command } from "commander";
import * as dl from "./dongnelibrary";
import * as util from "./util";
import { parseQueryString } from "./queryParser";
import type { SearchResult } from "./types";

// Read package.json
const pkg = require("../package.json") as { name: string; version: string };

// Constants
const LIBRARY_SUFFIX = "도서관";

/** UI messages */
const MESSAGES = {
  cancelSearch: "검색 취소 중...",
  libraryCount: (count: number) => `모두 ${count} 개의 도서관`,
  moduleCount: (count: number) => `모두 ${count} 개의 통합 도서관`,
  searchSummary: (libs: number, books: number, available: number) =>
    `${libs} 개의 도서관에서 ${books} 권 검색됨 (대출가능 ${available}권)`,
  promptTitle: "책 이름은?",
  promptModuleName: "통합도서관 이름은?",
  promptSearchScope: "검색 범위를 선택하세요",
  promptLibrarySearch: "도서관 이름을 입력하세요",
  unknownError: "Unknown Error",
  titleRequired: "책 이름을 입력해 주세요.",
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
  getTitle: (): string | undefined => conf.get("title") as string | undefined,
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

const program = new Command();

program
  .name("dongnelibrary")
  .version(pkg.version)
  .description("동네 도서관에서 책을 검색합니다.")
  .option("-a, --library-list", "도서관 목록 보기")
  .option("-i, --interactive", "대화형 모드로 검색")
  .option(
    "-l, --library-name [name,name]",
    "도서관 이름 지정 (콤마로 복수 지정 가능)",
  )
  .option("-t, --title [title]", "책 이름으로 검색")
  .option(
    "-q, --query [query]",
    '도서관과 책 이름을 한 번에 입력 (예: "판교 해리포터")',
  )
  .option("-u, --url", "검색 결과에 도서 URL 표시")
  .addHelpText(
    "after",
    `
Examples:
  $ dongnelibrary                         대화형 모드로 검색
  $ dongnelibrary -i                      대화형 모드로 검색
  $ dongnelibrary -a                      도서관 목록 보기
  $ dongnelibrary -t 해리포터 -l 판교     도서관과 책 이름 지정
  $ dongnelibrary -q "판교 해리포터"      한 줄 검색
  $ dongnelibrary -q "판교,정자 해리포터" 여러 도서관 검색
  $ dongnelibrary -q                      대화형 한 줄 검색`,
  )
  .parse(process.argv);

/**
 * Truncate string at first occurrence of substring.
 */
const truncateAt = (str: string, substring: string): string => {
  const index = str.indexOf(substring);
  return index === -1 ? str : str.substring(0, index);
};

/**
 * Print book search results grouped by library with header.
 */
const printBooks = (
  { booklist, libraryName }: SearchResult,
  showUrl: boolean,
): void => {
  const available = booklist.filter((b) => b.exist).length;
  const total = booklist.length;
  const name = libraryName ?? "알 수 없음";

  // Library header with summary
  const header = `${name} (${total}권, 대출가능 ${available}권)`;
  const lineLen = Math.max(0, 54 - header.length);
  console.log(colors.cyan(`\n── ${header} ${"─".repeat(lineLen)}`));

  // Book list without repeating library name
  for (const { exist, title, bookUrl } of booklist) {
    const mark = exist ? colors.green("  ✓") : colors.red("  ✖");
    console.log(`${mark}  ${title}`);
    if (showUrl && bookUrl) {
      console.log(`     → ${colors.cyan(bookUrl)}`);
    }
  }
};

/** Print all available library names grouped by module */
const printAllLibraryNames = (): void => {
  const moduleNames = dl.getAllModuleNames();
  let totalCount = 0;

  for (const moduleName of moduleNames) {
    const libs = dl.getLibraryNamesInModule(moduleName);
    totalCount += libs.length;
    console.log(colors.cyan(`\n[${moduleName}] (${libs.length}개)`));
    for (const name of libs) {
      console.log(`  ${name}`);
    }
  }

  console.log(colors.green(`\n${MESSAGES.libraryCount(totalCount)}`));
  console.log(colors.green(MESSAGES.moduleCount(moduleNames.length)));
};

/**
 * Find full library name from partial string.
 */
const getFullLibraryName = (str: string): string | undefined =>
  dl.getAllLibraryNames().find((name) => name.includes(str));

/**
 * Find all library names that contain the given partial string.
 */
const getAllMatchingLibraryNames = (str: string): string[] =>
  dl.getAllLibraryNames().filter((name) => name.includes(str));

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
 * Animated dots spinner with optional progress count.
 * Clears itself from the line when stopped.
 */
const createSpinner = (message: string, total?: number) => {
  const frames = ["   ", ".  ", ".. ", "..."];
  let frameIndex = 0;
  let completed = 0;

  const render = () => {
    const progress = total !== undefined ? ` (${completed}/${total})` : "";
    process.stdout.write(
      `\r${message}${progress}${frames[frameIndex++ % frames.length]}`,
    );
  };

  const timer = setInterval(render, 300);

  return {
    tick: () => {
      completed++;
    },
    stop: () => {
      clearInterval(timer);
      const clearLen = message.length + 20;
      process.stdout.write("\r" + " ".repeat(clearLen) + "\r");
    },
  };
};

/**
 * Search libraries for books and print results.
 * Shows progress count during search.
 */
const searchBooks = ({
  title,
  libraryName,
  showUrl = false,
}: {
  title: string;
  libraryName: string | string[];
  showUrl?: boolean;
}): Promise<SearchResult[]> =>
  new Promise((resolve) => {
    const controller = new AbortController();
    const results: SearchResult[] = [];
    const cleanup = setupCancellation(() => controller.abort());
    const total = dl.resolveLibraryCount(libraryName);
    const spinner = createSpinner("검색 중", total);

    dl.search(
      { title, libraryName, signal: controller.signal },
      (err, book) => {
        spinner.tick();
        spinner.stop();
        if (err) {
          if (err.msg?.toLowerCase().includes("abort")) return;
          console.log(err.msg ?? MESSAGES.unknownError);
        } else if (book) {
          printBooks(book, showUrl);
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
 * Print search summary with library, book, and availability counts.
 */
const printSearchSummary = (results: SearchResult[]): void => {
  const bookCount = getBookCount(results);
  const availableCount = results.reduce(
    (sum, r) => sum + r.booklist.filter((b) => b.exist).length,
    0,
  );
  console.log(colors.green(`\n${"━".repeat(58)}`));
  console.log(
    colors.green(
      MESSAGES.searchSummary(results.length, bookCount, availableCount),
    ),
  );
};

// =============================================================================
// INTERACTIVE PROMPTS
// =============================================================================

/** Search scope options for interactive mode */
const SEARCH_SCOPES = {
  all: "all",
  module: "module",
  search: "search",
} as const;

/**
 * Unified interactive prompt.
 * Flow: 책 이름 → 검색 범위 선택 → (도서관 선택)
 */
const promptInteractive = async (): Promise<{
  libraryName: string | string[];
  title: string;
}> => {
  introMessage("Dongne Library");

  // Step 1: Book title first
  const title = await input({
    message: MESSAGES.promptTitle,
    default: config.getTitle(),
    validate: (v) => (v.trim() ? true : MESSAGES.titleRequired),
  });
  config.setTitle(title);

  // Step 2: Search scope
  const scope = await select({
    message: MESSAGES.promptSearchScope,
    choices: [
      {
        name: `전체 도서관 검색 (${dl.getAllLibraryNames().length}개)`,
        value: SEARCH_SCOPES.all,
      },
      {
        name: `통합도서관별 검색 (${dl.getAllModuleNames().length}개)`,
        value: SEARCH_SCOPES.module,
      },
      {
        name: "도서관 이름으로 검색",
        value: SEARCH_SCOPES.search,
      },
    ],
  });

  // All libraries
  if (scope === SEARCH_SCOPES.all) {
    return { title, libraryName: "" };
  }

  // Module selection
  if (scope === SEARCH_SCOPES.module) {
    const moduleName = await select({
      message: MESSAGES.promptModuleName,
      choices: dl.getAllModuleNames().map((name) => ({ name, value: name })),
      default: config.getModuleName(),
    });
    config.setModuleName(moduleName);
    return { title, libraryName: moduleName };
  }

  // Library name autocomplete search
  const allLibraryNames = dl.getAllLibraryNames();
  const libraryName = await search({
    message: MESSAGES.promptLibrarySearch,
    source: async (term) => {
      if (!term) {
        return allLibraryNames.map((name) => ({ name, value: name }));
      }
      return allLibraryNames
        .filter((name) => name.includes(term))
        .map((name) => ({ name, value: name }));
    },
  });
  config.setLibrary(libraryName);

  return { title, libraryName };
};

/**
 * Interactive prompt for a single query string (library + title combined).
 */
const promptForQueryString = async (): Promise<{
  libraryName: string | string[];
  title: string;
} | null> => {
  introMessage("Dongne Library");

  const query = await input({
    message:
      "도서관과 책 이름을 함께 입력하세요 (예: 판교도서관 해리포터, 판교,정자 해리포터)",
  });

  const parsed = parseQueryString(query.trim(), dl.getAllLibraryNames());
  if (!parsed) {
    console.log(
      colors.yellow(
        "도서관 이름을 찾을 수 없습니다. 도서관 이름을 포함해서 다시 입력해주세요.",
      ),
    );
    return null;
  }
  return parsed;
};

interface ProgramOptions {
  libraryList?: boolean;
  interactive?: boolean;
  libraryName?: string;
  title?: string;
  query?: string | boolean;
  url?: boolean;
}

/** Main entry point - parse CLI options and execute search */
const activate = async (): Promise<void> => {
  const opts = program.opts() as ProgramOptions;
  const {
    libraryList,
    interactive,
    libraryName,
    title,
    query,
    url: showUrl,
  } = opts;

  if (libraryList) {
    printAllLibraryNames();
    return;
  }

  let searchOptions:
    | { title: string; libraryName: string | string[] }
    | undefined;

  if (interactive) {
    searchOptions = await promptInteractive();
  } else if (query !== undefined) {
    // -q without a value → interactive prompt; -q "string" → parse directly
    const queryStr = typeof query === "string" ? query : undefined;
    if (queryStr) {
      const parsed = parseQueryString(queryStr.trim(), dl.getAllLibraryNames());
      if (!parsed) {
        console.log(
          colors.yellow(
            "도서관 이름을 찾을 수 없습니다. -a 옵션으로 도서관 목록을 확인하세요.",
          ),
        );
        return;
      }
      searchOptions = parsed;
    } else {
      const parsed = await promptForQueryString();
      if (!parsed) return;
      searchOptions = parsed;
    }

    if (searchOptions) {
      const libDisplay = Array.isArray(searchOptions.libraryName)
        ? searchOptions.libraryName.map((n) => colors.cyan(n)).join(", ")
        : colors.cyan(searchOptions.libraryName);
      console.log(`${libDisplay}에서 "${searchOptions.title}" 검색`);
    }
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
    // No arguments → default to interactive mode
    searchOptions = await promptInteractive();
  }

  const results = await searchBooks({ ...searchOptions, showUrl: !!showUrl });
  printSearchSummary(results);
};

activate();
