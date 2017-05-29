var hscity = require('../src/library/hscity');
var util = require('../src/dongnelibrary_util.js');

describe('hscity (20s)', function () {
    this.timeout(20000);
    it('search book', function (done) {
        hscity.search({
            title: 'javascript'
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
