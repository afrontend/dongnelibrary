#!/usr/bin/env node
const Configstore = require("configstore");
const colors = require("colors");
const figlet = require("figlet");
const { select, input } = require("@inquirer/prompts");
const program = require("commander");
const dl = require("./dongnelibrary");
const util = require("./util");
const pkg = require("../package.json");

const conf = new Configstore(pkg.name, {});

const config = {
  getLibrary: () => conf.get("library"),
  setLibrary: (name) => conf.set("library", name),
  getTitle: () => conf.get("title") ?? "javascript",
  setTitle: (title) => conf.set("title", title),
};

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

const cutTail = (str, tail) => {
  const index = str.indexOf(tail);
  return index === -1 ? str : str.substring(0, index);
};

const MARKS = {
  ok: "✓ ",
  notOk: "✖ ",
};

const printBooks = ({ booklist, homeUrl }) => {
  if (homeUrl) {
    console.log(colors.yellow(`[${homeUrl}]`));
  }
  for (const { libraryName, exist, title, bookUrl } of booklist) {
    const mark = exist ? ` ${MARKS.ok} ` : ` ${colors.red(MARKS.notOk)} `;
    console.log(`${cutTail(libraryName, "도서관")}${mark}${title}`);
    if (bookUrl) {
      console.log(`  → ${colors.cyan(bookUrl)}`);
    }
  }
};

const printAllLibraryNames = () => {
  const libs = dl.getLibraryNames();
  libs.forEach((name) => console.log(name));
  console.log(colors.green(`모두 ${libs.length} 개의 도서관`));
};

const getFullLibraryName = (str) =>
  dl.getLibraryNames().find((name) => name.includes(str));

const getBookCount = (results) =>
  results.reduce((sum, book) => sum + (book?.booklist?.length ?? 0), 0);

const getLibraryFullNameList = (libraryName) =>
  util
    .getArrayFromCommaSeparatedString(libraryName)
    .filter((name) => getFullLibraryName(name));

const getLibraries = (libraryName) =>
  libraryName ? getLibraryFullNameList(libraryName) : dl.getLibraryNames();

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

const printSearchSummary = (results) => {
  const bookCount = getBookCount(results);
  console.log(
    colors.green(`${results.length} 개의 도서관에서  ${bookCount} 권 검색됨`),
  );
};

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

const activate = async () => {
  const { libraryList, interactive, libraryName, title } = program;

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
