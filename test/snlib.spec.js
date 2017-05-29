var snlib = require('../src/library/snlib');
var util = require('../src/dongnelibrary_util.js');

describe('snlib (20s)', function () {
  this.timeout(20000);
  it('search book', function (done) {
    snlib.search({
      title: 'javascript',
      startPage: 1
    }, function (result, booklist) {
      if(result.code === 0) {
        if(booklist.length > 0) {
          util.printBookList(booklist);
          util.printTotalBookCount(result.totalBookCount);
          done();
        } else {
          console.log('booklist.length: ' + booklist.length);
        }
      } else {
        console.log(result.msg);
      }
    });
  });
});
