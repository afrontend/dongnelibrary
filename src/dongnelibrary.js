const gg = require("./library/gg");
const gunpo = require("./library/gunpo");
const hscity = require("./library/hscity");
const osan = require("./library/osan");
const snlib = require("./library/snlib");
const suwon = require("./library/suwon");
const yongin = require("./library/yongin");
const util = require("./util.js");

const LIBRARY_MODULES = [gg, gunpo, hscity, osan, snlib, suwon, yongin];

const libraryList = LIBRARY_MODULES.flatMap((module) =>
  module.getLibraryNames().map((name) => ({
    name,
    search: module.search,
  })),
);

const getLibraryNames = () => util.getLibraryNames(libraryList);

const UNKNOWN_LIBRARY = {
  name: "Unknown",
  search: (opt, getBook) => getBook?.({ msg: "Unknown library name" }),
};

const getLibraryFunction = (libraryName) =>
  libraryList.find((lib) => lib.name === libraryName) ?? UNKNOWN_LIBRARY;

const completeLibraryName = (str) =>
  getLibraryNames().find((name) => name.includes(str)) ?? "";

const isValidLibraryName = (libraryName) =>
  libraryList.some((lib) => lib.name === libraryName);

const getLibArray = (libraryName) => {
  const names = Array.isArray(libraryName) ? libraryName : [libraryName];
  return names
    .map((name) => completeLibraryName(name))
    .filter((fullName) => isValidLibraryName(fullName))
    .map((fullName) => getLibraryFunction(fullName));
};

const getSortedBooks = (books) =>
  books
    .map(({ libraryName, title, exist, bookUrl }) => ({ libraryName, title, exist, bookUrl }))
    .sort((a, b) => (a.exist === b.exist ? 0 : a.exist ? -1 : 1));

const searchLibrary = (lib, title) =>
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
          totalBookCount: data.totalBookCount,
          startPage: data.startPage,
          booklist: getSortedBooks(data.booklist),
        },
      });
    });
  });

const search = (opt, getBook, getAllBooks) => {
  if (!opt || (!getBook && !getAllBooks)) {
    console.log("invalid search options");
    return;
  }

  const { title, libraryName } = opt;
  const libraries = getLibArray(libraryName);

  const promises = libraries.map(async (lib) => {
    const { error, result } = await searchLibrary(lib, title);
    if (error) {
      getBook?.(error);
      return null;
    }
    getBook?.(null, result);
    return result;
  });

  Promise.all(promises).then((results) => {
    const validResults = results.filter(Boolean);
    getAllBooks?.(null, validResults);
  });
};

module.exports = {
  search,
  getLibraryNames,
};
