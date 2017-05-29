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

function printTotalBookCount(result) {
  if(result.totalBookCount) {
    console.log("TotalCount: " + result.totalBookCount);
    if(result.startPage) {
      console.log("CurrentPage: " + result.startPage);
    }
  } else {
    console.log("TotalCount is not defined.");
  }
}

module.exports = {
  stripTags: stripTags,
  getJqueryString: getJqueryString,
  printBookList: printBookList,
  printTotalBookCount: printTotalBookCount
};

