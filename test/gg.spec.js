var gg = require('../src/library/gg');
var util = require('../src/dongnelibrary_util.js');

describe('gg (20s)', function () {
  this.timeout(20000);
  it('search book', function (done) {
    gg.search({
      title: 'javascript',
      startPage: 2
    }, function (result, booklist) {
      if(result.code === 0) {
        if(booklist.length > 0) {
          util.printBookList(booklist);
          util.printTotalBookCount(result);
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
