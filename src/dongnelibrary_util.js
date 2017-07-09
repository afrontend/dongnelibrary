var S = require('string');
var fs = require('fs');

function stripTags(str) {
  return S(str).decodeHTMLEntities().stripTags().replaceAll(/[,()]/,"").s;
}

var jquery = fs.readFileSync(__dirname + '/jquery.min.js').toString();

function getJqueryString() {
  return jquery;
}

function printBookList(booklist) {
  console.log(JSON.stringify(booklist, null, 2));
}

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
 * Convert comma separated strings to Array
 * @param {string} libs - "str1,str2,str3"
 */
function getArrayFromCommaSeparatedString(libs) {
  if (!libs) return [];
  var a = libs.split(',').filter(function (lib) {
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

module.exports = {
  stripTags: stripTags,
  getJqueryString: getJqueryString,
  printBookList: printBookList,
  printTotalBookCount: printTotalBookCount,
  getArrayFromCommaSeparatedString: getArrayFromCommaSeparatedString
};


