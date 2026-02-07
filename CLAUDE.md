# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

DongneLibrary is a Korean public library book availability checker. It searches across 100+ library branches in Gyeonggi Province (경기도) to check if books can be borrowed. The project provides a CLI tool, JavaScript API, and Docker support.

## Requirements

- Node.js >= 22.22.0

## Commands

```bash
# Install dependencies
npm ci

# Build TypeScript
npm run build

# Run all tests (builds first)
npm test

# Run tests for specific library systems
npm run dongne   # Multi-library search
npm run gg       # Gyeonggi Province Educational Libraries
npm run gunpo    # Gunpo City
npm run hscity   # Hwaseong City
npm run osan     # Osan City
npm run snlib    # Seongnam City
npm run suwon    # Suwon City
npm run yongin   # Yongin City

# Run CLI locally (after build)
node ./dist/cli.js -i                      # Interactive mode
node ./dist/cli.js -a                      # Show all libraries
node ./dist/cli.js -t <title> -l <library> # Search specific library
```

## Architecture

The project is written in TypeScript and uses a modular plugin architecture where each library system has its own implementation module.

**Build Output:**
```
src/*.ts          →  (tsc)  →  dist/*.js + dist/*.d.ts
src/library/*.ts  →  (tsc)  →  dist/library/*.js + dist/library/*.d.ts
```

**Core Flow:**

1. `src/cli.ts` - CLI entry point using Commander.js for args, @inquirer/prompts for interactive menus
2. `src/dongnelibrary.ts` - Main orchestrator that routes searches to library modules and aggregates results
3. `src/library/*.ts` - Individual library scrapers (one per library system)
4. `src/http.ts` - HTTP wrapper around `undici` with `get()`, `post()`, and `createSession()` for cookie-based requests
5. `src/util.ts` - Shared utilities: `validateSearchOptions()`, `createLibraryCodeLookup()`, HTML parsing with JSDOM
6. `src/types.ts` - Shared TypeScript type definitions

**Library Modules** (`src/library/`):

- `gg.ts` - 경기교육통합도서관 (Gyeonggi Provincial Educational Libraries)
- `gunpo.ts` - 군포시도서관 (Gunpo City)
- `hscity.ts` - 화성시립도서관 (Hwaseong City)
- `osan.ts` - 오산시도서관 (Osan City)
- `snlib.ts` - 성남시도서관 (Seongnam City)
- `suwon.ts` - 수원시도서관 (Suwon City)
- `yjlib.ts` - 여주시립도서관 (Yeoju City)
- `yongin.ts` - 용인시도서관 (Yongin City)

Each library module must export:
- `search(opt, callback)` - Main search function taking `{title, libraryName}`. Supports both callback style and Promise returns
- `getLibraryNames()` - Returns array of branch names supported by this module
- `homeUrl` - Base URL of the library system website

**Note:** Library websites change periodically, requiring scraper updates. When a scraper breaks:

1. Check if the library website URL or API endpoint has changed
2. Inspect the new HTML structure or API response format
3. Update selectors/parsing logic accordingly
4. Run the specific library test to verify (e.g., `npm run suwon`)

**Key Dependencies:**

- `undici` - HTTP client for web scraping
- `jsdom` - DOM parsing for scraping library websites
- `async` - Parallel execution of library searches
- `configstore` - Persistent CLI settings storage
- `typescript` - TypeScript compiler (dev dependency)

## Type Definitions

The project exports TypeScript types for library consumers:

```typescript
import dongnelibrary, { SearchOptions, SearchResult, Book, SearchError } from 'dongnelibrary';

// Types are available for IDE autocomplete and type checking
dongnelibrary.search({ title: '책', libraryName: '도서관' }, callback);
```

Key types in `src/types.ts`:
- `SearchOptions` - Options for book search
- `SearchResult` - Search result with booklist
- `Book` - Individual book information
- `LibraryModule` - Interface for library scrapers

## Test Structure

Tests in `test/` mirror the library modules and use Node.js built-in test runner (`node:test`). Each test file has a 20-second timeout to accommodate network requests to library websites. No external test framework dependencies are required.

Tests import from `dist/` (the compiled output), so `npm run build` runs automatically before tests.

All library tests use the shared `test/helpers/libraryTestSuite.js` helper which provides standard test cases (empty title, invalid title, Korean title search, multi-library search, bookUrl validation).

To run a specific test within a file, use the `--test-name-pattern` flag:
```bash
npm run build && node --test --test-name-pattern="Korean titles" test/gunpo.spec.js
```

## Current API Endpoints

- **gg.ts**: `https://lib.goe.go.kr/gg/intro/search/index.do`
- **gunpo.ts**: `https://www.gunpolib.go.kr/pyxis-api/1/collections/1/search` (JSON API)
- **hscity.ts**: `https://hscitylib.or.kr/intro/menu/10008/program/30001/searchResultList.do`
- **osan.ts**: `https://www.osanlibrary.go.kr/intro/menu/10003/program/30004/plusSearchResultList.do`
- **snlib.ts**: `https://www.snlib.go.kr/intro/menu/10041/program/30009/plusSearchResultList.do`
- **suwon.ts**: `https://search.suwonlib.go.kr/getSearchResult/normal` (requires session init)
- **yjlib.ts**: `https://www.yjlib.go.kr/web/menu/10036/program/30001/searchResultList.do`
- **yongin.ts**: `https://lib.yongin.go.kr/intro/menu/10003/program/30012/plusSearchResultList.do`

## Docker

The project includes a `Dockerfile` in the root directory using Node 20 Alpine.

```bash
# Build locally
docker build -t dongnelibrary .

# Run
docker run -it dongnelibrary -i

# Deploy to Docker Hub
docker login
docker build -t <username>/dongnelibrary:latest .
docker push <username>/dongnelibrary:latest
```

Docker Hub image: `frontendwordpress/dongnelibrary`
