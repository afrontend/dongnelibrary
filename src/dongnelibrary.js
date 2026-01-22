const gg = require("./library/gg");
const gunpo = require("./library/gunpo");
const hscity = require("./library/hscity");
const osan = require("./library/osan");
const snlib = require("./library/snlib");
const suwon = require("./library/suwon");
const yongin = require("./library/yongin");
const util = require("./util.js");

// =============================================================================
// Configuration
// =============================================================================

const LIBRARY_MODULES = [gg, gunpo, hscity, osan, snlib, suwon, yongin];

const UNKNOWN_LIBRARY_ERROR = { msg: "Unknown library name" };

const UNKNOWN_LIBRARY = {
  name: "Unknown",
  search: (opt, onResult) => onResult?.(UNKNOWN_LIBRARY_ERROR),
};

// =============================================================================
// Library Registry
// =============================================================================

const libraryList = LIBRARY_MODULES.flatMap((module) =>
  module.getLibraryNames().map((name) => ({
    name,
    search: module.search,
    homeUrl: module.homeUrl,
  })),
);

const getLibraryNames = () => util.getLibraryNames(libraryList);

const getLibraryByName = (libraryName) =>
  libraryList.find((lib) => lib.name === libraryName) ?? UNKNOWN_LIBRARY;

const completeLibraryName = (str) =>
  getLibraryNames().find((name) => name.includes(str)) ?? "";

const isValidLibraryName = (libraryName) =>
  libraryList.some((lib) => lib.name === libraryName);

const resolveLibraries = (libraryName) => {
  const names = Array.isArray(libraryName) ? libraryName : [libraryName];
  return names
    .map((name) => completeLibraryName(name))
    .filter((fullName) => isValidLibraryName(fullName))
    .map((fullName) => getLibraryByName(fullName));
};

// =============================================================================
// Book Result Helpers
// =============================================================================

const normalizeBook = ({ libraryName, title, exist, bookUrl }) => ({
  libraryName,
  title,
  exist,
  bookUrl,
});

const sortByAvailability = (books) =>
  books.sort((a, b) => (a.exist === b.exist ? 0 : a.exist ? -1 : 1));

const processBooklist = (books) => sortByAvailability(books.map(normalizeBook));

// =============================================================================
// Search Logic
// =============================================================================

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
          homeUrl: lib.homeUrl,
          totalBookCount: data.totalBookCount,
          startPage: data.startPage,
          booklist: processBooklist(data.booklist),
        },
      });
    });
  });

const search = (opt, onResult, onComplete) => {
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
    const validResults = results.filter(Boolean);
    onComplete?.(null, validResults);
  });
};

// =============================================================================
// Exports
// =============================================================================

module.exports = {
  search,
  getLibraryNames,
};
