# DongneLibrary API Reference

A JavaScript/TypeScript library for checking book availability across 100+ Korean public library branches in Gyeonggi Province (경기도).

## Installation

```bash
npm install dongnelibrary
```

## Quick Start

```javascript
import dongnelibrary from "dongnelibrary";

dongnelibrary.search(
  { title: "해리포터", libraryName: "판교도서관" },
  (err, result) => {
    if (err) return console.error(err.msg);
    console.log(`Found ${result.totalBookCount} books`);
    result.booklist.forEach((book) => {
      console.log(`${book.title} - ${book.exist ? "대출가능" : "대출중"}`);
    });
  },
);
```

## API

### search(options, onResult?, onComplete?)

Search for books across one or more libraries.

#### Parameters

| Parameter    | Type                     | Required | Description                       |
| ------------ | ------------------------ | -------- | --------------------------------- |
| `options`    | `SearchOptionsMain`      | Yes      | Search configuration              |
| `onResult`   | `SearchCallback`         | No       | Called for each library's results |
| `onComplete` | `SearchCompleteCallback` | No       | Called when all searches complete |

#### SearchOptionsMain

| Property      | Type                 | Required | Description                                         |
| ------------- | -------------------- | -------- | --------------------------------------------------- |
| `title`       | `string`             | Yes      | Book title to search (Korean or English)            |
| `libraryName` | `string \| string[]` | Yes      | Library name(s). Use `''` or `[]` for all libraries |
| `signal`      | `AbortSignal`        | No       | For cancelling in-progress searches                 |

#### Example: Single Library

```javascript
dongnelibrary.search(
  { title: "코스모스", libraryName: "판교도서관" },
  (err, result) => {
    if (result) {
      console.log(result.booklist);
    }
  },
);
```

#### Example: Multiple Libraries

```javascript
dongnelibrary.search(
  { title: "코스모스", libraryName: ["판교", "분당"] },
  (err, result) => {
    // Called once per library
    if (result) {
      console.log(`${result.libraryName}: ${result.totalBookCount} books`);
    }
  },
  (err, results) => {
    // Called once when all searches complete
    console.log(`Total libraries searched: ${results.length}`);
  },
);
```

#### Example: All Libraries

```javascript
dongnelibrary.search({ title: "해리포터", libraryName: "" }, (err, result) => {
  if (result) {
    console.log(`${result.libraryName}: ${result.booklist.length} results`);
  }
});
```

#### Example: With AbortSignal

```javascript
const controller = new AbortController();

dongnelibrary.search(
  { title: "해리포터", libraryName: "", signal: controller.signal },
  (err, result) => {
    /* ... */
  },
  (err, results) => {
    /* ... */
  },
);

// Cancel after 5 seconds
setTimeout(() => controller.abort(), 5000);
```

---

### searchAsync(options, onResult?)

Promise-based search for books across one or more libraries.

#### Parameters

| Parameter  | Type                | Required | Description                       |
| ---------- | ------------------- | -------- | --------------------------------- |
| `options`  | `SearchOptionsMain` | Yes      | Search configuration              |
| `onResult` | `SearchCallback`    | No       | Called for each library's results |

#### Returns

`Promise<SearchResult[]>` - Array of search results from all libraries

#### Example: Basic Usage

```javascript
const results = await dongnelibrary.searchAsync({
  title: "해리포터",
  libraryName: "판교도서관",
});

results.forEach((result) => {
  console.log(`${result.libraryName}: ${result.totalBookCount} books`);
});
```

#### Example: Search All Libraries

```javascript
const results = await dongnelibrary.searchAsync({
  title: "코스모스",
  libraryName: "",
});

console.log(`Found results in ${results.length} libraries`);
```

#### Example: With Streaming Callback

```javascript
const results = await dongnelibrary.searchAsync(
  { title: "해리포터", libraryName: "" },
  (err, result) => {
    // Called as each library completes
    if (result) {
      console.log(`${result.libraryName}: ${result.booklist.length} books`);
    }
  },
);

// Final results available after all searches complete
console.log(`Total: ${results.length} libraries searched`);
```

#### Example: With AbortSignal

```javascript
const controller = new AbortController();

// Cancel after 5 seconds
setTimeout(() => controller.abort(), 5000);

try {
  const results = await dongnelibrary.searchAsync({
    title: "해리포터",
    libraryName: "",
    signal: controller.signal,
  });
} catch (err) {
  console.log("Search was cancelled");
}
```

---

### getLibraryNames()

Returns an array of all supported library branch names.

#### Returns

`string[]` - Array of library names (100+ branches)

#### Example

```javascript
const libraries = dongnelibrary.getLibraryNames();
console.log(libraries);
// ['가좌도서관', '갈현도서관', '경기평생교육학습관', ...]
```

---

### getModuleHomeUrls()

Returns a mapping of library system module names to their home URLs.

#### Returns

`Record<string, string>` - Object mapping module names to URLs

#### Example

```javascript
const urls = dongnelibrary.getModuleHomeUrls();
console.log(urls);
// {
//   gg: 'https://lib.goe.go.kr',
//   gunpo: 'https://www.gunpolib.go.kr',
//   ...
// }
```

---

## Types

### SearchResult

Returned for each library search.

```typescript
interface SearchResult {
  title?: string; // Search query
  libraryName?: string; // Library branch name
  homeUrl?: string; // Library website URL
  totalBookCount: number | string; // Total matching books
  startPage?: number; // Pagination start
  booklist: Book[]; // Array of found books
}
```

### Book

Individual book information.

```typescript
interface Book {
  libraryName: string; // Library where book is located
  title: string; // Book title
  exist: boolean; // true = available, false = checked out
  bookUrl?: string; // Direct link to book detail page
}
```

### SearchError

Error object returned on failure.

```typescript
interface SearchError {
  msg: string; // Error message
}
```

### Callback Types

```typescript
// Called for each library result
type SearchCallback = (err: SearchError | null, result?: SearchResult) => void;

// Called when all searches complete
type SearchCompleteCallback = (
  err: SearchError | null,
  results?: SearchResult[],
) => void;
```

---

## Supported Library Systems

| Module   | Library System     | Region            |
| -------- | ------------------ | ----------------- |
| `gg`     | 경기교육통합도서관 | Gyeonggi Province |
| `gunpo`  | 군포시도서관       | Gunpo City        |
| `hscity` | 화성시립도서관     | Hwaseong City     |
| `osan`   | 오산시도서관       | Osan City         |
| `snlib`  | 성남시도서관       | Seongnam City     |
| `suwon`  | 수원시도서관       | Suwon City        |
| `yjlib`  | 여주시립도서관     | Yeoju City        |
| `yongin` | 용인시도서관       | Yongin City       |

Use `getLibraryNames()` to see all 100+ individual branch names.

---

## CLI Usage

```bash
# Interactive mode
npx dongnelibrary -i

# Search specific library
npx dongnelibrary -t "해리포터" -l "판교도서관"

# Search all libraries
npx dongnelibrary -t "해리포터" -a
```

See `dongnelibrary --help` for all options.

---

## TypeScript Support

The package includes TypeScript declarations. Import types directly:

```typescript
import dongnelibrary, { SearchResult, SearchError, Book } from "dongnelibrary";
```

---

## Error Handling

```javascript
dongnelibrary.search(
  { title: "책제목", libraryName: "알수없는도서관" },
  (err, result) => {
    if (err) {
      console.error("Search failed:", err.msg);
      // Common errors:
      // - "Unknown library name"
      // - "invalid Data response"
      // - Network/timeout errors
      return;
    }
    // Process result...
  },
);
```

---

## License

MIT
