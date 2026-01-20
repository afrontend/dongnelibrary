[![NPM Version][npm-image]][npm-url]
[![MIT Licence](https://badges.frapsoft.com/os/mit/mit.svg?v=103)](https://opensource.org/licenses/mit-license.php)

# DongneLibrary

> 도서관 책을 빌릴 수 있는지 검색

도서관 이름을 생략하면 모든 도서관을 검색한다.

## install with git

    git clone https://github.com/afrontend/dongnelibrary
    cd dongnelibrary
    npm ci
    chmod a+x src/cli.js

    node ./src/cli.js -i
    node ./src/cli.js -a
    node ./src/cli.js -t javascript -l 남양
    node ./src/cli.js -t javascript -l 남양,판교
    npm test

## install with NPM

    npm install dongnelibrary -g
    dongnelibrary -i
    dongnelibrary -a
    dongnelibrary -t javascript -l 남양도서관
    dongnelibrary -t javascript -l 남양,판교

[![asciicast](https://asciinema.org/a/359304.svg)](https://asciinema.org/a/359304)

## Use Docker Hub image

### install

    docker pull frontendwordpress/dongnelibrary

### run examples

    docker run -it --rm frontendwordpress/dongnelibrary -i
    docker run --rm frontendwordpress/dongnelibrary -a
    docker run --rm frontendwordpress/dongnelibrary -l 여주,판교 -t 자바
    docker run --rm frontendwordpress/dongnelibrary -l 수지 -t 자바

## Build and Run Docker Locally

    docker build -t dongnelibrary .
    docker run -it dongnelibrary -i
    docker run dongnelibrary -a
    docker run dongnelibrary -t "javascript" -l "군포"
    docker run -it -v ~/.config/configstore:/root/.config/configstore dongnelibrary -i

## Deploy to Docker Hub

    # Log in to Docker Hub
    docker login

    # Build and tag
    docker build -t <dockerhub-username>/dongnelibrary:latest .

    # Push to Docker Hub
    docker push <dockerhub-username>/dongnelibrary:latest

    # Optional: tag with version
    docker tag <dockerhub-username>/dongnelibrary:latest <dockerhub-username>/dongnelibrary:0.2.12
    docker push <dockerhub-username>/dongnelibrary:0.2.12

## Using with JavaScript

    npm install dongnelibrary

```javascript
const dl = require("dongnelibrary");
dl.search(
  {
    title: "javascript",
    libraryName: ["여주", "판교"],
  },
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

## 검색 가능한 도서관

- [경기교육통합도서관][gg-url] (경기중앙교육도서관,경기평택교육도서관,경기광주교육도서관,경기여주가남교육도서관,경기포천교육도서관,경기김포교육도서관,경기과천교육도서관,경기성남교육도서관,경기화성교육도서관,경기의정부교육도서관,경기평생교육학습관)
- [군포시도서관][gunpo-url] (산본도서관,당동도서관,대야도서관,어린이도서관,이동도서관,군포중앙도서관,누리천문대,시청북카페밥상머리,부곡도서관,당정문화도서관,동화나무어린이도서관,금정작은도서관,재궁꿈나무도서관,궁내동작은도서관,노루목작은도서관,버드나무에부는바람작은도서관,꿈쟁이도서관,우리마을도서관,북카페사랑아이엔지,산본역도서관,하늘정원작은도서관,꿈이지,꿈드림작은도서관,여담작은도서관)
- [성남시도서관][snlib-url] (논골도서관,중원어린이도서관,성남중앙도서관,분당도서관,고등도서관,구미도서관,해오름도서관,중원도서관,무지개도서관,수내도서관,판교도서관,위례도서관,수정도서관,책테마파크도서관,운중도서관,서현도서관,복정도서관,판교어린이도서관)
- [오산시도서관][osan-url] (오산중앙도서관,꿈두레도서관,초평도서관,햇살마루도서관,청학도서관,양산도서관,소리울도서관,무지개도서관,고현초꿈키움도서관,쌍용예가시민개방도서관)
- [화성시립도서관][hscity-url] (남양도서관,태안도서관,삼괴도서관,병점도서관,샘내도서관,두빛나래어린이도서관,봉담도서관,둥지나래어린이도서관,목동이음터도서관,기아행복마루도서관,화성동탄중앙도서관,송산도서관,정남도서관,비봉도서관,진안도서관,중앙이음터도서관,양감도서관,다원이음터도서관,송린이음터도서관,팔탄도서관,마도도서관,봉담커피앤북도서관,왕배푸른숲도서관,노을빛도서관,서연이음터도서관,호연이음터도서관,향남복합문화센터도서관,봉담와우도서관,늘봄이음터도서관,달빛나래어린이도서관)
- [수원시도서관][suwon-url] (선경도서관,수원중앙도서관,창룡도서관,화서다산도서관,호매실도서관,서수원도서관,한림도서관,버드내도서관,북수원도서관,대추골도서관,일월도서관,광교홍재도서관,태장마루도서관,광교푸른숲도서관,매여울도서관,망포글빛도서관,슬기샘도서관,지혜샘어린이도서관,바른샘어린이도서관,한아름도서관,반달어린이도서관,사랑샘도서관,희망샘도서관)
- [용인시도서관][yongin-url] (수지도서관,구성도서관,기흥도서관,남사도서관,동백도서관,동천도서관,모현도서관,보라도서관,상현도서관,서농도서관,성복도서관,용인중앙도서관,양지해밀도서관,영덕도서관,죽전도서관,청덕도서관,포곡도서관,흥덕도서관)

## 마무리

[온라인에서][sample-url] 테스트 할 수 있으며 명령어가 불편하다면 [웹 서비스][web-ui-url]를 사용할 수 있다.
[Web API 서비스][web-api]도 지원한다.

## Test

    npm test
    npm run dongne  # 여러 도서관 검색
    npm run gg      # 경기도 도서관
    npm run gunpo   # 군포시 도서관
    npm run hscity  # 화성시 도서관
    npm run osan    # 오산시 도서관
    npm run snlib   # 성남시 도서관
    npm run suwon   # 수원시 도서관
    npm run yongin  # 용인시 도서관

[dongnelibraryspa]: https://github.com/afrontend/dongnelibraryspa "AngularJS, Foundation을 사용한 Web UI"
[npm-image]: https://img.shields.io/npm/v/dongnelibrary.svg
[npm-url]: https://npmjs.org/package/dongnelibrary
[web-ui-url]: https://dongne.onrender.com
[web-api]: https://github.com/afrontend/dlserver "같은 기능을 지원하는 Web API"
[gg-url]: https://lib.goe.go.kr
[gunpo-url]: https://www.gunpolib.go.kr
[hscity-url]: https://hscitylib.or.kr
[osan-url]: https://www.osanlibrary.go.kr
[snlib-url]: https://www.snlib.go.kr
[suwon-url]: https://www.suwonlib.go.kr
[yongin-url]: https://lib.yongin.go.kr
[sample-url]: https://npm.runkit.com/dongnelibrary
