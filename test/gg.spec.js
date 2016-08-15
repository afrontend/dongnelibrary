var gg = require('../gg');
describe('gg (20s)', function () {
    this.timeout(20000);
    it('search book', function (done) {
        gg.search({
            title: 'javascript'
          }, function (error, booklist) {
            if(error.code === 0) {
              if(booklist.length > 0) {
                done();
              } else {
                console.log('booklist.length: ' + booklist.length);
              }
            } else {
              console.log(error.msg);
            }
        });
    });
});
