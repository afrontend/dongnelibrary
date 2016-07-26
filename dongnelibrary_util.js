var S = require('string');
var fs = require('fs');

function stripTags(str) {
  return S(str).decodeHTMLEntities().stripTags().replaceAll(/[,()]/,"").s;
}

var jquery = fs.readFileSync(__dirname + '/jquery.min.js').toString();

function getJqueryString() {
  return jquery;
}

module.exports = {
  stripTags: stripTags,
  getJqueryString: getJqueryString
};

