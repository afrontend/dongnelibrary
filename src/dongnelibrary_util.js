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

function printTotalBookCount(count) {
  if(count) {
    console.log("TotalCount: " + count);
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

