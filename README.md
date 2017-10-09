[![NPM Version][npm-image]][npm-url]
[![Travis Build][travis-build-image]][travis-build-url]

# DongneLibrary
도서관 책을 빌릴 수 있는지 확인하는 노드 모듈이다. 도서관 이름을 생략하면 모든 도서관을 검색한다.

https://agvim.wordpress.com/2017/01/20/check-if-a-library-book-was-rented/

## 1. Npm

*Installation*

    $ npm install dongnelibrary -g

*Usage*

    $ dongnelibrary
    $ dongnelibrary -a
    $ dongnelibrary -t javascript -l 남양도서관
    $ dongnelibrary -t javascript -l 남양,판교
    $ dongnelibrary -t javascript -l 남양 -j

[![asciicast](https://asciinema.org/a/SEKhEJKZet5dLNFFLMWMCF4pF.png)](https://asciinema.org/a/SEKhEJKZet5dLNFFLMWMCF4pF)

## 2. Docker

*Installation*

    $ docker pull frontendwordpress/dongnelibrary

*Usage*

    $ docker run --rm frontendwordpress/dongnelibrary dongnelibrary -a
    $ docker run --rm frontendwordpress/dongnelibrary dongnelibrary -l 여주,판교 -t 자바
    $ docker run --rm frontendwordpress/dongnelibrary dongnelibrary -l 여주도서관 -t 자바

아래 함수를 `~/.bashrc` 파일에 추가하여 간편하게 사용할 수 있다.

```bash
dongne () {
    docker run --rm frontendwordpress/dongnelibrary dongnelibrary "$@"
}
```

    $ dongne -l 여주,판교 -t 자바
    $ dongne -l 여주도서관 -t 자바

## 3. JavaScript

*Installation*

    $ npm install dongnelibrary

*Usage*

```javascript
var dl = require('dongnelibrary');
dl.search({
  title: 'javascript',
  libraryName: ['여주','판교']
}, function (err, book) {
  console.log(book.libraryName + ' "' + book.title + '"');
  book.booklist.forEach(function (book) {
    console.log((book.exist?' ✓  ':' ✖  ') +' '+ book.title);
  });
}, function (err, books) {
  console.log(books.length + ' 개의 도서관을 검색했습니다.');
});
```

## 4. Git

*Installation*

    $ git clone https://github.com/afrontend/dongnelibrary
    $ cd dongnelibrary
    $ npm install
    $ chmod a+x src/dongnelibrary_cli.js

*Usage*

    $ ./src/dongnelibrary_cli.js -t javascript -l 남양
    $ ./src/dongnelibrary_cli.js -t javascript -l 남양,판교
    $ ./src/dongnelibrary_cli.js -t javascript -l 남양도서관 -j
    $ npm test

----

**현재 아래 도서관들을 검색할 수 있다.**

* [경기도립도서관][gg-url] (중앙, 평택, 광주, 여주, 포천, 김포)
* [성남시도서관][snlib-url] (중앙, 분당, 구미, 중원, 무지개, 판교, 수정, 운중, 중원어린이, 판교어린이)
* [수원시도서관][suwon-url] (선경, 중앙, 영통, 슬기샘, 바른샘, 지혜샘, 서수원, 북수원, 태장마루, 한아름, 반달어린이, 사랑샘, 희망샘, 대추골, 한림, 창룡, 버드내, 광교홍재, 호매실, 일월, 화서다산)
* [오산시도서관][osan-url] (오산중앙, 청학, 햇살마루, 양산, 초평, 꿈두레)
* [화성시립도서관][hscity-url] (남양, 태안, 삼괴, 병점, 샘내작은, 두빛나래어린이, 봉담, 둥지나래어린이, 기아행복마루, 동탄복합문화센터, 송산, 정남)
* [군포시도서관][gunpo-url] (산본, 당동, 대야, 어린이, 이동, 중앙, 부곡, 당정문화, 동화나무어린이, 금정작은, 재궁꿈나무, 궁내동작은, 노루목작은, 버드나무에부는바람작은, 꿈쟁이, 우리마을, 북카페사랑아이엔지, 산본역, 하늘정원작은, 꿈이지, 꿈드림작은, 여담작은)

[온라인에서][sample-url] 바로 테스트 할 수 있으며 명령어가 불편하다면 [웹 서비스][web-ui-url]를 사용할 수 있다. 웹 서비스가 느리다면 검색 서버를 [로컬에 설치][dongnelibraryspa] 할 수 있다.

[dongnelibraryspa]: https://github.com/afrontend/dongnelibraryspa "AngularJS, Foundation을 사용한 Web UI"
[hscity-url]: https://hscitylib.or.kr
[npm-image]: https://img.shields.io/npm/v/dongnelibrary.svg
[npm-url]: https://npmjs.org/package/dongnelibrary
[travis-build-image]: https://travis-ci.org/afrontend/dongnelibrary.svg?branch=master
[travis-build-url]: https://travis-ci.org/afrontend/dongnelibrary
[web-ui-url]: https://dongne.herokuapp.com "무료 서버라서 느리게 로딩될 수 있어요"

[daum-url]: http://book.daum.net
[gg-url]: http://www.gglib.or.kr
[gunpo-url]: http://www.gunpolib.go.kr
[osan-url]: http://www.osanlibrary.go.kr
[sample-url]: https://npm.runkit.com/dongnelibrary
[snlib-url]: http://www.snlib.net
[suwon-url]: http://www.suwonlib.go.kr

