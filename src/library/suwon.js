const getLibraryNames = require("../util.js").getLibraryNames;
const req = require("request");

const libraryList = [
  { code: "141025", name: "선경도서관" },
  { code: "141024", name: "중앙도서관" },
  { code: "141549", name: "창룡도서관" },
  { code: "141572", name: "화서다산도서관" },
  { code: "141552", name: "호매실도서관" },
  { code: "141093", name: "서수원도서관" },
  { code: "141542", name: "한림도서관" },
  { code: "141550", name: "버드내도서관" },
  { code: "141092", name: "북수원도서관" },
  { code: "141537", name: "대추골도서관" },
  { code: "141557", name: "일월도서관" },
  { code: "141551", name: "광교홍재도서관" },
  { code: "141301", name: "태장마루도서관" },
  { code: "141595", name: "광교푸른숲도서관" },
  { code: "141596", name: "매여울도서관" },
  { code: "141612", name: "망포글빛도서관" },
  { code: "141085", name: "슬기샘도서관" },
  { code: "141086", name: "지혜샘어린이도서관" },
  { code: "141087", name: "바른샘어린이도서관" },
  { code: "141064", name: "한아름도서관" },
  { code: "141138", name: "반달어린이도서관" },
  { code: "341147", name: "사랑샘도서관" },
  { code: "141107", name: "희망샘도서관" },
];

function getLibraryCode(libraryName) {
  const found = libraryList.find((lib) => lib.name === libraryName);
  return found ? found.code : "";
}

function getAllLibraryCodes() {
  return libraryList.map((lib) => lib.code).join(",");
}

function stripHtml(str) {
  return str ? str.replace(/<[^>]*>/g, "") : "";
}

function getBookList(data) {
  if (!data.SEARCH_RESULT || !data.SEARCH_RESULT.SEARCH_LIST) {
    return [];
  }
  return data.SEARCH_RESULT.SEARCH_LIST.map(function (book) {
    return {
      title: stripHtml(book.TITLE_INFO || ""),
      exist: book.LOAN_CODE === "OK",
      libraryName: book.LIB_NAME || "",
    };
  });
}

function search(opt, getBook) {
  let title = opt.title;
  let libraryName = opt.libraryName;

  if (!title) {
    if (getBook) {
      getBook({ msg: "Need a book name" });
    }
    return;
  }

  const lcode = libraryName
    ? getLibraryCode(libraryName)
    : getAllLibraryCodes();

  // Create a cookie jar to maintain session
  const jar = req.jar();

  // First, visit the search page to initialize session
  req.get(
    {
      url: "https://search.suwonlib.go.kr/search",
      jar: jar,
      timeout: 20000,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
    },
    function (err1, res1, body1) {
      if (err1) {
        if (getBook) {
          getBook({ msg: err1.toString() });
        }
        return;
      }

      // Now make the API call with the session cookies
      // Requires 'ajax: true' header and full parameter set including empty facet parameters
      req.post(
        {
          url: "https://search.suwonlib.go.kr/getSearchResult/normal",
          jar: jar,
          timeout: 20000,
          headers: {
            "User-Agent":
              "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
            Referer: "https://search.suwonlib.go.kr/search",
            "X-Requested-With": "XMLHttpRequest",
            ajax: "true",
          },
          form: {
            searchTxt: title,
            kCid: "",
            kdcValue: "",
            searchKind: "book",
            manageCode: lcode,
            isInnerSearch: "F",
            innerSearchTxt: "",
            keywordSearch: false,
            displayNo: "1000",
            orderbyItem: "ACCURACY_SORT",
            orderby: "DESC",
            pageNo: "1",
            facetLib: "",
            facetLibName: "",
            facetAuthor: "",
            facetPublisher: "",
            facetPubYear: "",
            facetSubject: "",
            facetSubjectName: "",
            facetMedia: "",
            facetMediaName: "",
          },
        },
        function (err, res, body) {
          if (err || (res && res.statusCode !== 200)) {
            let msg = "";

            if (err) {
              msg = err;
            }

            if (res && res.statusCode) {
              msg = msg + " " + res.statusCode;
            }

            if (getBook) {
              getBook({ msg: msg });
            }
          } else {
            try {
              const data = JSON.parse(body);
              const booklist = getBookList(data);
              const totalCount =
                data.SEARCH_RESULT && data.SEARCH_RESULT.SEARCH_COUNT
                  ? data.SEARCH_RESULT.SEARCH_COUNT
                  : booklist.length;
              getBook(null, {
                totalBookCount: totalCount,
                booklist,
              });
            } catch (e) {
              getBook({ msg: "Failed to parse response: " + e.message });
            }
          }
        },
      );
    },
  );
}

module.exports = {
  search,
  getLibraryNames: function () {
    return getLibraryNames(libraryList);
  },
};
