[![NPM Version][npm-image]][npm-url]
[![Travis Build][travis-build-image]][travis-build-url]

# DongneLibrary
도서관 책이 대출되었는지 확인하는 노드 모듈이다.
명령어로도 사용할 수 있으며 자바스크립트 코드에서도 사용할 수 있다.
현재 아래 도서관들을 검색할 수 있다.

* [경기도립도서관][gg-url] (중앙, 평택, 광주, 여주, 포천, 김포)
* [성남시도서관][snlib-url] (중앙, 분당, 구미, 중원, 무지개, 판교, 수정, 운중, 중원어린이, 판교어린이)
* [수원시도서관][suwon-url] (선경, 중앙, 영통, 슬기샘, 바른샘, 지혜샘, 서수원, 북수원, 태장마루, 한아름, 반달어린이, 사랑샘, 희망샘, 대추골, 한림, 창룡, 버드내, 광교홍재, 호매실, 일월, 화서다산)
* [오산시도서관][osan-url] (오산중앙, 청학, 햇살마루, 양산, 초평, 꿈두레)
* [화성시립도서관][hscity-url] (남양, 태안, 삼괴, 병점, 샘내작은, 두빛나래어린이, 봉담, 둥지나래어린이, 기아행복마루, 동탄복합문화센터, 송산, 정남)

검색할 때 도서관 이름을 생략하면 모든 도서관을 검색한다.
도서관 이름을 , (콤마) 로 이어붙이면 여러 도서관을 동시에 검색한다.
명령어가 불편하다면 [웹 서비스][web-ui-url]를 사용할 수 있으며
아래 링크를 참조하여 검색 서버를 로컬에 설치할 수도 있다.
https://github.com/afrontend/dongnelibraryspa

## 1. Docker

    $ docker pull frontendwordpress/dongnelibrary
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

## 2. Npm

    $ npm install dongnelibrary -g
    $ dongnelibrary
    $ dongnelibrary -a
    $ dongnelibrary -t javascript -l 남양도서관
    $ dongnelibrary -t javascript -l 남양,판교
    $ dongnelibrary -t javascript -l 남양 -j

[![asciicast](https://asciinema.org/a/SEKhEJKZet5dLNFFLMWMCF4pF.png)](https://asciinema.org/a/SEKhEJKZet5dLNFFLMWMCF4pF)

## 3. [JavaScript][sample-url]

    $ npm install dongnelibrary

```javascript
require("dongnelibrary").search({
    title: 'javascript',
    libraryName: '여주'
  }, function (err, book) {
    console.log(book.libraryName + ' "' + book.title + '"');
    book.booklist.forEach(function (book) {
        console.log((book.exist?' ✓  ':' ✖  ') +' '+ book.title);
    });
});
```

## 4. Git

    $ git clone https://github.com/afrontend/dongnelibrary
    $ cd dongnelibrary
    $ npm install
    $ chmod a+x src/dongnelibrary_cli.js
    $ ./src/dongnelibrary_cli.js -t javascript -l 남양
    $ ./src/dongnelibrary_cli.js -t javascript -l 남양,판교
    $ ./src/dongnelibrary_cli.js -t javascript -l 남양도서관 -j
    $ npm test

[npm-image]: https://img.shields.io/npm/v/dongnelibrary.svg
[npm-url]: https://npmjs.org/package/dongnelibrary
[travis-build-image]: https://travis-ci.org/afrontend/dongnelibrary.svg?branch=master
[travis-build-url]: https://travis-ci.org/afrontend/dongnelibrary
[daum-url]: http://book.daum.net
[gg-url]: http://www.gglib.or.kr
[hscity-url]: https://hscitylib.or.kr
[osan-url]: http://www.osanlibrary.go.kr
[snlib-url]: http://www.snlib.net
[suwon-url]: http://www.suwonlib.go.kr/
[web-ui-url]: https://dongne.herokuapp.com
[sample-url]: https://npm.runkit.com/dongnelibrary
[dongnelibraryspa]: https://github.com/afrontend/dongnelibraryspa

