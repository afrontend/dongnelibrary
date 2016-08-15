[![NPM Version][npm-image]][npm-url]
[![Travis Build][travis-build-image]][travis-build-url]

## DongneLibrary
도서관 책이 대출되었는지 확인하는 Command Line 프로그램이다. 아래 도서관들을 검색할 수 있다. [웹 인터페이스][web-ui-url]도 사용할 수 있다.

### 검색 가능 도서관
* [경기도립도서관][gg-url] (중앙, 평택, 광주, 여주, 포천, 김포)
* [화성시립도서관][hscitylib-url] (남양, 태안, 삼괴, 병점, 샘내작은, 두빛나래어린이, 봉담, 둥지나래어린이, 기아행복마루, 동탄복합문화센터, 송산, 정남)
* [오산시도서관][osanlibrary-url] (오산중앙, 청학, 햇살마루, 양산, 초평, 꿈두레)
* [성남시도서관][snlib-url] (중앙, 분당, 구미, 중원, 무지개, 판교, 수정, 운중, 중원어린이, 판교어린이)

### 설치
```sh
$ npm install dongnelibrary -g
```

### 사용 예
```sh
$ dongnelibrary
$ dongnelibrary -t javascript -l 남양도서관
```

### JavaScript Example (example.js)
```javascript
require("dongnelibrary").search({
    title: 'javascript',
    libraryName: '남양도서관'
  }, function (books) {
    books.forEach(function (book) {
        console.log((book.exist?'책있음':'책없음') +' '+ book.title);
    });
});
```

### Git를 사용한 설치
```sh
$ git clone https://github.com/afrontend/dongnelibrary
$ cd dongnelibrary
$ npm install
$ chmod a+x dongnelibrary_cli.js
$ ./dongnelibrary_cli.js -t javascript -l 남양도서관
```

[npm-image]: https://img.shields.io/npm/v/dongnelibrary.svg
[npm-url]: https://npmjs.org/package/dongnelibrary
[travis-build-image]: https://travis-ci.org/afrontend/dongnelibrary.svg?branch=master
[travis-build-url]: https://travis-ci.org/afrontend/dongnelibrary
[daum-url]: http://book.daum.net
[gg-url]: http://www.gglib.or.kr
[hscitylib-url]: https://hscitylib.or.kr
[osanlibrary-url]: http://www.osanlibrary.go.kr
[snlib-url]: http://www.snlib.net
[web-ui-url]: https://dongne.herokuapp.com
