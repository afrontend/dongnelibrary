const { describe, it } = require("node:test");
const assert = require("assert").strict;
const { request } = require("undici");
const { JSDOM } = require("jsdom");
const lib = require("../dist/localLibraryModule/gg");
const { createLibraryTestSuite } = require("./helpers/libraryTestSuite");

// Run the standard test suite
createLibraryTestSuite(lib, "경기교육도서관");

describe("경기교육도서관 buildBookUrl", () => {
  it("returns empty string for empty bookPath", () => {
    assert.strictEqual(lib.buildBookUrl(""), "");
  });

  it("returns empty string for falsy bookPath", () => {
    assert.strictEqual(lib.buildBookUrl(null), "");
    assert.strictEqual(lib.buildBookUrl(undefined), "");
  });

  it("extracts regNo, manageCode, booktype from bookPath", () => {
    const href =
      "detail.do?regNo=ABC123&manageCode=MA&booktype=BOOKANDNONBOOK";
    const result = lib.buildBookUrl(href);
    assert.ok(result.includes("regNo=ABC123"), `regNo missing: ${result}`);
    assert.ok(result.includes("manageCode=MA"), `manageCode missing: ${result}`);
    assert.ok(result.includes("booktype=BOOKANDNONBOOK"), `booktype missing: ${result}`);
    assert.ok(
      result.startsWith("https://lib.goe.go.kr/gg/intro/search/detail.do"),
      `unexpected base URL: ${result}`,
    );
  });
});

// Additional gg-specific tests
describe("경기교육도서관 bookUrl content verification", () => {
  it(
    "Verify bookUrl page contains book title",
    { timeout: 30000 },
    async () => {
      const libraryName = lib.getLibraryNames()[0];

      // Search for a book
      const result = await lib.search({
        title: "자바",
        libraryName,
        startPage: 1,
      });

      assert.ok(result.booklist.length > 0, "Need at least one book to test");

      const book = result.booklist.find((b) => b.bookUrl);
      assert.ok(book, "At least one book should have a bookUrl");

      // Fetch the detail page
      const response = await request(book.bookUrl, {
        method: "GET",
        maxRedirections: 5,
        headersTimeout: 20000,
        bodyTimeout: 20000,
        headers: {
          "User-Agent":
            "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          Referer: "https://lib.goe.go.kr/",
        },
      });

      const body = await response.body.text();

      assert.strictEqual(
        response.statusCode,
        200,
        `bookUrl page should return 200, got ${response.statusCode}`,
      );

      // Parse HTML and extract title from hidden input
      const dom = new JSDOM(body);
      const document = dom.window.document;

      const pageTitle = document.querySelector("#item_name")?.value;

      assert.ok(pageTitle, "Page should have #item_name hidden input");
      assert.ok(pageTitle.length > 0, "Book title should not be empty");

      console.log(`  ✓ bookUrl page title verified: "${pageTitle}"`);
      console.log(`  ✓ Search result title: "${book.title}"`);
    },
  );
});
