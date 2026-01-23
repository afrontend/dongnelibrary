#!/usr/bin/env node
const Configstore = require("configstore");
const colors = require("colors");
const figlet = require("figlet");
const { select, input } = require("@inquirer/prompts");
const program = require("commander");
const dl = require("./dongnelibrary");
const util = require("./util");
const pkg = require("../package.json");

// Constants
const DEFAULT_TITLE = "javascript";
const LIBRARY_SUFFIX = "도서관";

const conf = new Configstore(pkg.name, {});

/** Configuration helpers for persistent storage */
const config = {
  getLibrary: () => conf.get("library"),
  setLibrary: (name) => conf.set("library", name),
  getTitle: () => conf.get("title") ?? DEFAULT_TITLE,
  setTitle: (title) => conf.set("title", title),
};

/**
 * Display ASCII art intro message using figlet.
 * @param {string} msg - Message to display.
 */
const introMessage = (msg) => {
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
 * @param {string} str - Input string.
 * @param {string} substring - Where to truncate.
 * @returns {string} Truncated string, or original if substring not found.
 */
const truncateAt = (str, substring) => {
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
 * @param {Object} param - Book result object.
 * @param {Array} param.booklist - List of books found.
 * @param {string} [param.homeUrl] - Library home URL.
 */
const printBooks = ({ booklist, homeUrl }) => {
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
const printAllLibraryNames = () => {
  const libs = dl.getLibraryNames();
  libs.forEach((name) => console.log(name));
  console.log(colors.green(`모두 ${libs.length} 개의 도서관`));
};

/**
 * Find full library name from partial string.
 * @param {string} str - Partial library name.
 * @returns {string|undefined} Full library name if found.
 */
const getFullLibraryName = (str) =>
  dl.getLibraryNames().find((name) => name.includes(str));

/**
 * Count total books across all search results.
 * @param {Array} results - Array of search result objects.
 * @returns {number} Total book count.
 */
const getBookCount = (results) =>
  results.reduce((sum, book) => sum + (book?.booklist?.length ?? 0), 0);

/**
 * Convert comma-separated library names to full name list.
 * @param {string} libraryName - Comma-separated library names.
 * @returns {Array<string>} Array of full library names.
 */
const getLibraryFullNameList = (libraryName) =>
  util
    .getArrayFromCommaSeparatedString(libraryName)
    .filter((name) => getFullLibraryName(name));

/**
 * Get library names to search - either specified or all.
 * @param {string} [libraryName] - Optional comma-separated library names.
 * @returns {Array<string>} Array of library names to search.
 */
const getLibraries = (libraryName) =>
  libraryName ? getLibraryFullNameList(libraryName) : dl.getLibraryNames();

/**
 * Search libraries for books and print results.
 * @param {Object} options - Search options.
 * @param {string} options.title - Book title to search.
 * @param {string} [options.libraryName] - Optional library filter.
 * @returns {Promise<Array>} Search results.
 */
const searchLibraries = ({ title, libraryName }) =>
  new Promise((resolve) => {
    const results = [];
    dl.search(
      { title, libraryName: getLibraries(libraryName) },
      (err, book) => {
        if (err) {
          console.log(err.msg ?? "Unknown Error");
        } else {
          printBooks(book);
          results.push(book);
        }
      },
      (err, allBooks) => {
        if (err) {
          console.log("Error, Can't access detail information");
          resolve([]);
        } else {
          resolve(allBooks);
        }
      },
    );
  });

/**
 * Print search summary with library and book counts.
 * @param {Array} results - Array of search result objects.
 */
const printSearchSummary = (results) => {
  const bookCount = getBookCount(results);
  console.log(
    colors.green(`${results.length} 개의 도서관에서  ${bookCount} 권 검색됨`),
  );
};

/**
 * Interactive prompt for search options using inquirer.
 * @returns {Promise<{libraryName: string, title: string}>} Selected search options.
 */
const promptForSearchOptions = async () => {
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

/** Main entry point - parse CLI options and execute search */
const activate = async () => {
  const opts = program.opts();
  const { libraryList, interactive, libraryName, title } = opts;

  if (libraryList) {
    printAllLibraryNames();
    return;
  }

  let searchOptions;

  if (interactive) {
    searchOptions = await promptForSearchOptions();
  } else if (libraryName && title) {
    searchOptions = { libraryName, title };
  } else {
    return;
  }

  const results = await searchLibraries(searchOptions);
  printSearchSummary(results);
};

activate();
