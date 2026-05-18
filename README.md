[![NPM Version][npm-image]][npm-url]
[![MIT Licence](https://badges.frapsoft.com/os/mit/mit.svg?v=103)](https://opensource.org/licenses/mit-license.php)

# DongneLibrary

> 동네 도서관에서 책을 빌릴 수 있는지 검색

## 빠르게 시작하기

설치 없이 바로 실행할 수 있습니다.

    npx dongnelibrary

처음 실행하면 대화형 모드로 도서관과 책 이름을 입력할 수 있습니다.

[![asciicast](https://asciinema.org/a/359304.svg)](https://asciinema.org/a/575436)

## 주요 옵션

    npx dongnelibrary                              대화형 모드 (기본값)
    npx dongnelibrary -a                           검색 가능한 도서관 목록 보기
    npx dongnelibrary -t 채식주의자 -l 판교        도서관과 책 이름 지정
    npx dongnelibrary -t 채식주의자 -l 흥천,판교   여러 도서관 동시 검색
    npx dongnelibrary -q "판교 채식주의자"         한 줄로 검색
    npx dongnelibrary -q "판교,정자 채식주의자"    여러 도서관 한 줄 검색

> **도서관 이름은 부분 입력도 가능합니다.** `-l 판교`라고 입력하면 "판교도서관"을 자동으로 찾습니다.
> 전체 도서관 목록은 `dongnelibrary -a`로 확인하세요.

## 자주 쓴다면 — 전역 설치

    npm install dongnelibrary@latest -g
    dongnelibrary

이후에는 `npx` 없이 `dongnelibrary` 명령어만으로 실행할 수 있습니다.

## Docker로 실행

Node.js 설치 없이 Docker로 바로 실행할 수 있습니다.

    docker run -it --rm ghcr.io/afrontend/dongnelibrary
    docker run --rm ghcr.io/afrontend/dongnelibrary -a
    docker run --rm ghcr.io/afrontend/dongnelibrary -t 채식주의자 -l 판교
    docker run --rm ghcr.io/afrontend/dongnelibrary -q "판교 채식주의자"

대화형 모드에서 이전 검색 기록을 유지하려면:

    docker run -it --rm -v ~/.config/configstore:/root/.config/configstore ghcr.io/afrontend/dongnelibrary -i

## 검색 가능한 도서관

전체 목록은 `dongnelibrary -a`로 확인할 수 있습니다.

현재 지원하는 통합도서관 시스템:

- [아산시도서관][asan-url] — 15개 도서관
- [부천시립도서관][bcl-url] — 16개 도서관 (시립도서관, 상동, 원미, 심곡, 북부, 꿈빛, 책마루, 한울빛, 꿈여울, 송내, 오정, 도당, 동화, 역곡, 별빛마루, 수주, 역곡밝은)
- [충청북도교육도서관][cbelib-url] — 15개 도서관
- [대구광역시통합도서관][daegu-url] — 57개 도서관 (시립/구군립 48개 + 사립공공·전문 9개)
- [강남구통합도서관][gangnam-url] — 27개 도서관
- [강서구통합도서관][gangseo-url] — 36개 도서관
- [경기교육통합도서관][gg-url] — 11개 도서관
- [거제시도서관][geoje-url] — 5개 도서관 (장평, 장승포, 수양, 하청, 아주)
- [경기광주시도서관][gjcity-url] — 17개 도서관
- [김해통합도서관][gimhae-url] — 7개 도서관 (칠암, 장유, 화정글샘, 진영한빛, 기적, 율하, 어린이영어)
- [군포시도서관][gunpo-url] — 24개 도서관
- [관악구통합도서관][gwanak-url] — 31개 도서관
- [하남시도서관][hanamlib-url] — 11개 도서관
- [노원구립도서관][nowon-url] — 36개 도서관
- [성남시도서관][snlib-url] — 18개 도서관
- [인천광역시교육청통합공공도서관][ice-url] — 9개 도서관
- [오산시도서관][osan-url] — 10개 도서관
- [평택시도서관][ptlib-url] — 15개 도서관
- [포항시립도서관][pohang-url] — 10개 도서관 (포은중앙, 대잠, 영암, 포은오천, 동해석곡, 연일, 구룡포, 포은흥해 등)
- [화성시립도서관][hscity-url] — 30개 도서관
- [시흥시도서관][siheung-url] — 13개 도서관 (중앙, 대야, 소래빛, 월곶, 정왕어린이, 군자, 능곡, 신천, 매화, 장곡, 목감, 배곧, 은계)
- [수원시도서관][suwon-url] — 23개 도서관
- [용인시도서관][yongin-url] — 40개 도서관
- [의왕시도서관][uwlib-url] — 24개 도서관
- [양평군도서관][yplib-url] — 13개 도서관
- [여주시립도서관][yjlib-url] — 11개 도서관
- [제주시도서관][jeju-url] — 16개 도서관
- [원주시립통합도서관][wonju-url] — 16개 도서관
- [여수시립도서관][yslib-url] — 35개 도서관
- [영등포구립도서관][ydplib-url] — 28개 도서관

## 웹 서비스

설치 없이 브라우저에서 사용하려면 [웹 서비스][web-ui-url]를 이용하세요.
[Web API][web-api]도 지원합니다.

---

## JavaScript API

    npm install dongnelibrary

### Promise 스타일 (권장)

```javascript
const dl = require("dongnelibrary");

const results = await dl.searchAsync({
  title: "채식주의자",
  libraryName: ["여주", "판교"],
});

results.forEach((result) => {
  console.log(result.libraryName + ' "' + result.title + '"');
  result.booklist.forEach((book) => {
    console.log((book.exist ? " ✓  " : " ✖  ") + " " + book.title);
  });
});
```

### Callback 스타일

```javascript
const dl = require("dongnelibrary");

dl.search(
  { title: "채식주의자", libraryName: ["여주", "판교"] },
  function (err, book) {
    console.log(book.libraryName + ' "' + book.title + '"');
    book.booklist.forEach(function (book) {
      console.log((book.exist ? " ✓  " : " ✖  ") + " " + book.title);
    });
  },
  function (err, books) {
    console.log(books.length + " 개의 도서관을 검색했습니다.");
  },
);
```

---

## 개발자용

### Requirements

- Node.js >= 22.22.0

### 로컬 실행

    git clone https://github.com/afrontend/dongnelibrary
    cd dongnelibrary
    npm ci
    npm run build
    node ./dist/cli.js

### 테스트

    npm test
    npm run dongne  # 여러 도서관 검색
    npm run asan    # 아산시 도서관
    npm run bcl     # 부천시 도서관
    npm run cbelib  # 충청북도 도서관
    npm run daegu   # 대구광역시 도서관
    npm run gangnam # 강남구 도서관
    npm run gangseo # 강서구 도서관
    npm run gg      # 경기도 도서관
    npm run geoje   # 거제시 도서관
    npm run gjcity  # 광주시 도서관
    npm run gimhae  # 김해시 도서관
    npm run gunpo   # 군포시 도서관
    npm run gwanak  # 관악구 도서관
    npm run hanamlib # 하남시 도서관
    npm run hscity  # 화성시 도서관
    npm run nowon   # 노원구 도서관
    npm run ice     # 인천시 도서관
    npm run osan    # 오산시 도서관
    npm run ptlib   # 평택시 도서관
    npm run pohang  # 포항시 도서관
    npm run siheung # 시흥시 도서관
    npm run snlib   # 성남시 도서관
    npm run suwon   # 수원시 도서관
    npm run uwlib   # 의왕시 도서관
    npm run yjlib   # 여주시 도서관
    npm run yongin  # 용인시 도서관
    npm run ydplib  # 영등포구 도서관
    npm run yplib   # 양평군 도서관
    npm run cancel  # 취소 기능 테스트
    npm run util    # 유틸리티 테스트
    npm run cli     # CLI 기능 테스트
    npm run jeju    # 제주시 도서관
    npm run wonju   # 원주시 도서관
    npm run yslib   # 여수시 도서관

### Docker 로컬 빌드

    docker build -t dongnelibrary .
    docker run -it dongnelibrary
    docker run dongnelibrary -a
    docker run dongnelibrary -q "판교 채식주의자"

Docker 이미지는 `master` 브랜치 푸시 또는 버전 태그(`v1.0.0`) 생성 시 GitHub Actions를 통해 GitHub Container Registry에 자동 배포됩니다.

[npm-image]: https://img.shields.io/npm/v/dongnelibrary.svg
[npm-url]: https://npmjs.org/package/dongnelibrary
[web-ui-url]: https://dongne.onrender.com
[web-api]: https://github.com/afrontend/dlserver "같은 기능을 지원하는 Web API"
[asan-url]: https://ascl.asan.go.kr
[bcl-url]: https://bcl.go.kr
[cbelib-url]: https://www.cbelib.go.kr
[daegu-url]: https://library.daegu.go.kr
[gangnam-url]: https://library.gangnam.go.kr
[gangseo-url]: https://lib.gangseo.seoul.kr
[gg-url]: https://lib.goe.go.kr
[geoje-url]: https://lib.geoje.go.kr
[gjcity-url]: https://lib.gjcity.go.kr
[gimhae-url]: https://lib.gimhae.go.kr
[gunpo-url]: https://www.gunpolib.go.kr
[gwanak-url]: https://lib.gwanak.go.kr
[hanamlib-url]: https://www.hanamlib.go.kr
[nowon-url]: https://www.nowonlib.kr
[hscity-url]: https://hscitylib.or.kr
[osan-url]: https://www.osanlibrary.go.kr
[ptlib-url]: https://www.ptlib.go.kr
[pohang-url]: https://phlib.pohang.go.kr
[siheung-url]: https://lib.siheung.go.kr
[snlib-url]: https://www.snlib.go.kr
[suwon-url]: https://www.suwonlib.go.kr
[uwlib-url]: https://uwlib.or.kr
[yongin-url]: https://lib.yongin.go.kr
[yjlib-url]: https://www.yjlib.go.kr
[ice-url]: https://lib.ice.go.kr/
[jeju-url]: https://www.jeju.go.kr/
[wonju-url]: https://lib.wonju.go.kr/
[ydplib-url]: https://ydplib.or.kr
[yplib-url]: https://www.yplib.go.kr
[yslib-url]: https://yslib.yeosu.go.kr/
