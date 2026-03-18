[![NPM Version][npm-image]][npm-url]
[![MIT Licence](https://badges.frapsoft.com/os/mit/mit.svg?v=103)](https://opensource.org/licenses/mit-license.php)

# DongneLibrary

> 도서관 책을 빌릴 수 있는지 검색

도서관 이름을 생략하면 모든 도서관을 검색한다.

## Requirements

- Node.js >= 22.22.0

## Install with git and Run

    git clone https://github.com/afrontend/dongnelibrary
    cd dongnelibrary
    npm ci
    npm run build

    node ./dist/cli.js
    node ./dist/cli.js -i
    node ./dist/cli.js -a
    node ./dist/cli.js -t 별 -l 남양
    node ./dist/cli.js -t 별 -l 흥천,판교
    node ./dist/cli.js -q "판교 별"
    node ./dist/cli.js -q "판교,정자 별"
    node ./dist/cli.js -q
    npm test

## Install with npm and Run

    npm install dongnelibrary@latest -g
    dongnelibrary
    dongnelibrary -i
    dongnelibrary -a
    dongnelibrary -t 별 -l 남양
    dongnelibrary -t 별 -l 흥천,판교
    dongnelibrary -q "판교 별"
    dongnelibrary -q "판교,정자 별"
    dongnelibrary -q

[![asciicast](https://asciinema.org/a/359304.svg)](https://asciinema.org/a/359304)

## Run with npx

    npx dongnelibrary
    npx dongnelibrary -i
    npx dongnelibrary -a
    npx dongnelibrary -t 별 -l 남양
    npx dongnelibrary -t 별 -l 흥천,판교
    npx dongnelibrary -q "판교 별"
    npx dongnelibrary -q "판교,정자 별"
    npx dongnelibrary -q

## Use GitHub Container Registry image

### install

    docker pull ghcr.io/afrontend/dongnelibrary

### run examples

    docker run -it --rm ghcr.io/afrontend/dongnelibrary
    docker run -it --rm ghcr.io/afrontend/dongnelibrary -i
    docker run --rm ghcr.io/afrontend/dongnelibrary -a
    docker run --rm ghcr.io/afrontend/dongnelibrary -t 별 -l 남양
    docker run --rm ghcr.io/afrontend/dongnelibrary -t 별 -l 흥천,판교
    docker run --rm ghcr.io/afrontend/dongnelibrary -q "판교 별"
    docker run --rm ghcr.io/afrontend/dongnelibrary -q "판교,정자 별"

## Build and Run Docker Locally

### build

    docker build -t dongnelibrary .

### run examples

    docker run -it dongnelibrary
    docker run -it dongnelibrary -i
    docker run dongnelibrary -a
    docker run dongnelibrary -t 별 -l "남양"
    docker run dongnelibrary -t 별 -l "흥천,판교"
    docker run dongnelibrary -q "판교 별"
    docker run dongnelibrary -q "판교,정자 별"
    docker run -it -v ~/.config/configstore:/root/.config/configstore dongnelibrary -i

## Deploy to GitHub Container Registry

Docker images are automatically published to GitHub Container Registry via GitHub Actions when:

- Pushing to the `master` branch (tagged as `master`)
- Creating version tags like `v1.0.0` (tagged with version number)

No manual deployment steps are required. The workflow handles authentication using `GITHUB_TOKEN`.

## Using with JavaScript

    npm install dongnelibrary

### Callback Style

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

### Promise Style (async/await)

```javascript
const dl = require("dongnelibrary");

const results = await dl.searchAsync({
  title: "javascript",
  libraryName: ["여주", "판교"],
});

results.forEach((result) => {
  console.log(result.libraryName + ' "' + result.title + '"');
  result.booklist.forEach((book) => {
    console.log((book.exist ? " ✓  " : " ✖  ") + " " + book.title);
  });
});

console.log(results.length + " 개의 도서관을 검색했습니다.");
```

## 검색 가능한 도서관

- [경기교육통합도서관][gg-url] (경기중앙교육도서관,경기평택교육도서관,경기광주교육도서관,경기여주가남교육도서관,경기포천교육도서관,경기김포교육도서관,경기과천교육도서관,경기성남교육도서관,경기화성교육도서관,경기의정부교육도서관,경기평생교육학습관)
- [군포시도서관][gunpo-url] (산본도서관,당동도서관,대야도서관,어린이도서관,이동도서관,군포중앙도서관,누리천문대,시청북카페밥상머리,부곡도서관,당정문화도서관,동화나무어린이도서관,금정작은도서관,재궁꿈나무도서관,궁내동작은도서관,노루목작은도서관,버드나무에부는바람작은도서관,꿈쟁이도서관,우리마을도서관,북카페사랑아이엔지,산본역도서관,하늘정원작은도서관,꿈이지,꿈드림작은도서관,여담작은도서관)
- [성남시도서관][snlib-url] (논골도서관,중원어린이도서관,성남중앙도서관,분당도서관,고등도서관,구미도서관,해오름도서관,중원도서관,무지개도서관,수내도서관,판교도서관,위례도서관,수정도서관,책테마파크도서관,운중도서관,서현도서관,복정도서관,판교어린이도서관)
- [인천광역시교육청통합공공도서관][ice-url] (인천광역시교육청계양도서관,인천광역시교육청부평도서관,인천광역시교육청서구도서관,인천광역시교육청신트리도서관,인천광역시교육청연수도서관,인천광역시교육청주안도서관,인천광역시교육청중앙도서관,인천광역시교육청평생학습관도서관,인천광역시교육청화도진도서관)
- [오산시도서관][osan-url] (오산중앙도서관,꿈두레도서관,초평도서관,햇살마루도서관,청학도서관,양산도서관,소리울도서관,무지개도서관,고현초꿈키움도서관,쌍용예가시민개방도서관)
- [화성시립도서관][hscity-url] (남양도서관,태안도서관,삼괴도서관,병점도서관,샘내도서관,두빛나래어린이도서관,봉담도서관,둥지나래어린이도서관,목동이음터도서관,기아행복마루도서관,화성동탄중앙도서관,송산도서관,정남도서관,비봉도서관,진안도서관,중앙이음터도서관,양감도서관,다원이음터도서관,송린이음터도서관,팔탄도서관,마도도서관,봉담커피앤북도서관,왕배푸른숲도서관,노을빛도서관,서연이음터도서관,호연이음터도서관,향남복합문화센터도서관,봉담와우도서관,늘봄이음터도서관,달빛나래어린이도서관)
- [수원시도서관][suwon-url] (선경도서관,수원중앙도서관,창룡도서관,화서다산도서관,호매실도서관,서수원도서관,한림도서관,버드내도서관,북수원도서관,대추골도서관,일월도서관,광교홍재도서관,태장마루도서관,광교푸른숲도서관,매여울도서관,망포글빛도서관,슬기샘도서관,지혜샘어린이도서관,바른샘어린이도서관,한아름도서관,반달어린이도서관,사랑샘도서관,희망샘도서관)
- [용인시도서관][yongin-url] (수지도서관,구갈희망누리도서관,구성도서관,기흥도서관,남사도서관,동백도서관,동천도서관,모현도서관,보라도서관,상현도서관,서농도서관,성복도서관,용인중앙도서관,양지해밀도서관,영덕도서관,이동꿈틀도서관,죽전도서관,청덕도서관,포곡도서관,흥덕도서관,기흥동행정복지센터스마트도서관,기흥역스마트도서관,동천동행정복지센터스마트도서관,마북동행정복지센터스마트도서관,보정동행정복지센터스마트도서관,상갈동행정복지센터스마트도서관,상하동행정복지센터스마트도서관,성복역스마트도서관,시청스마트도서관,신봉동행정복지센터스마트도서관,역북동행정복지센터스마트도서관,용인중앙시장역스마트도서관,원삼면스마트도서관,유방어린이공원스마트도서관,죽전역스마트도서관,고림다온작은도서관,남사맑은누리작은도서관,백암면작은도서관,상현1동작은도서관,상현2동작은도서관,이동천리작은도서관)
- [여주시립도서관][yjlib-url] (여주도서관,세종도서관,점동도서관,여주기적의도서관,흥천도서관,금사도서관,대신도서관,산북작은도서관,북내작은도서관,여주역스마트도서관,이마트스마트도서관)
- [제주시도서관][jeju-url] (한라도서관,우당도서관,탐라도서관,제주시기적의도서관,애월도서관,조천읍도서관,한경도서관,삼매봉도서관,중앙도서관,동부도서관,서부도서관,서귀포기적의도서관,성산일출도서관,안덕산방도서관,표선도서관,꿈바당어린이도서관)
- [원주시립통합도서관][wonju-url] (시립중앙도서관,중천철학도서관,미리내도서관,태장도서관,샘마루도서관,그림책도서관,생각자람어린이도서관,귀래면작은도서관,원주한도시한책읽기도서관,개운동작은도서관,치악산새마을문고작은도서관,무실동작은도서관,문막읍작은도서관,봉산동작은도서관,도란도란청소년도서관,부론면작은도서관)
- [여수시립도서관][yslib-url] (여수이순신도서관,여수시립쌍봉도서관,여수시립현암도서관,여수시립환경도서관,여수시립돌산도서관,여수시립소라도서관,여수시립율촌도서관,거문도은빛바다도서관,치매안심센터작은도서관,청솔글누리작은도서관,동부도시보건작은도서관,화양열린작은도서관,여문늘벗작은도서관,국동작은도서관,아주타운아파트작은도서관,책이랑나랑작은도서관,현천작은도서관,꿈꾸는영어전문작은도서관,학마을작은도서관,웅천지웰작은도서관,한려작은도서관,주은금호작은도서관,광림작은도서관,민들레작은도서관,원앙작은도서관,푸른정원작은도서관,로얄골드빌작은도서관,꿈을키우는작은도서관,신기부영작은도서관,국동365열린도서관,지웰2차 작은도서관,이편한 작은도서관,채움늘 작은도서관,웅천글꽃 작은도서관,포레나여수웅천더테라스작은도서관)

## 마무리

설치 대신 [웹 서비스][web-ui-url]를 사용할 수 있다.
[Web API 서비스][web-api]도 지원한다.

## Test

    npm test
    npm run dongne  # 여러 도서관 검색
    npm run gg      # 경기도 도서관
    npm run gunpo   # 군포시 도서관
    npm run hscity  # 화성시 도서관
    npm run ice     # 인천시 도서관
    npm run osan    # 오산시 도서관
    npm run snlib   # 성남시 도서관
    npm run suwon   # 수원시 도서관
    npm run yjlib   # 여주시 도서관
    npm run yongin  # 용인시 도서관
    npm run jeju    # 제주시 도서관
    npm run wonju   # 원주시 도서관
    npm run yslib   # 여수시 도서관

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
[yjlib-url]: https://www.yjlib.go.kr
[ice-url]: https://lib.ice.go.kr/
[jeju-url]: https://www.jeju.go.kr/
[wonju-url]: https://lib.wonju.go.kr/
[yslib-url]: https://yslib.yeosu.go.kr/
