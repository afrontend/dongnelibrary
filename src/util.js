/**
 * Strip HTML tags from a string.
 * @param {string} str - Input string containing HTML tags.
 * @returns {string} String with HTML tags removed.
 */
function stripTags(str) {
  return str.replace(/<\/?[^>]+(>|$)/g, "");
}

/**
 * Print book list as formatted JSON to console.
 * @param {Array<Object>} booklist - Array of book objects.
 */
function printBookList(booklist) {
  console.log(JSON.stringify(booklist, null, 2));
}

/**
 * Print total book count and current page information.
 * @param {Object} book - Book result object with totalBookCount and optional startPage.
 */
function printTotalBookCount(book) {
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
 * @param {string} libs - Comma-separated string like "str1,str2,str3".
 * @returns {Array<string>} Array of trimmed strings.
 */
function getArrayFromCommaSeparatedString(libs) {
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
 * @param {Array<{code: string, name: string}>} lst - Array of library objects.
 * @returns {Array<string>} Array of library names.
 */
function getLibraryNames(lst) {
  return lst.map(function (item) {
    return item.name;
  });
}

/**
 * Create a library code lookup function for a given library list.
 * Factory pattern to avoid duplicating getLibraryCode() in each module.
 * @param {Array<{code: string, name: string}>} libraryList - Array of library objects.
 * @returns {function(string): string} Function that takes a library name and returns its code.
 */
function createLibraryCodeLookup(libraryList) {
  return function getLibraryCode(libraryName) {
    const found = libraryList.find((lib) => lib.name === libraryName);
    return found ? found.code : "";
  };
}

/**
 * Extract the first number from a string.
 * Useful for parsing count values from text like "총 123건".
 * @param {string} text - Input string containing a number.
 * @param {string} [defaultValue="0"] - Default value if no number found.
 * @returns {string} The extracted number as a string, or defaultValue.
 */
function extractNumber(text, defaultValue = "0") {
  const match = (text ?? "").match(/\d+/);
  return match ? match[0] : defaultValue;
}

/**
 * Validate search options. Throws an error if validation fails.
 * @param {Object} opt - Search options object.
 * @param {string} opt.title - Book title to search for.
 * @param {string} opt.libraryName - Library name to search in.
 * @throws {Error} If title or libraryName is missing.
 */
function validateSearchOptions(opt) {
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
 * @param {function(Object): Promise<Object>} asyncFn - Async function that takes options and returns a Promise.
 * @returns {function(Object, function?): Promise<Object>|void} Wrapped function supporting both patterns.
 */
function wrapWithCallback(asyncFn) {
  return async function (opt, callback) {
    if (!callback) {
      return asyncFn(opt);
    }
    try {
      const result = await asyncFn(opt);
      callback(null, result);
    } catch (err) {
      callback({ msg: err.message || err.toString() });
    }
  };
}

module.exports = {
  stripTags,
  printBookList,
  printTotalBookCount,
  getArrayFromCommaSeparatedString,
  getLibraryNames,
  createLibraryCodeLookup,
  extractNumber,
  validateSearchOptions,
  wrapWithCallback,
};
