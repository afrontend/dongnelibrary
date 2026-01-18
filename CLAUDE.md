# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

DongneLibrary is a Korean public library book availability checker. It searches across 100+ library branches in Gyeonggi Province (경기도) to check if books can be borrowed. The project provides a CLI tool, JavaScript API, and Docker support.

## Commands

```bash
# Install dependencies
npm ci

# Run all tests
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

# Run CLI locally
node ./src/cli.js -i                      # Interactive mode
node ./src/cli.js -a                      # Show all libraries
node ./src/cli.js -t <title> -l <library> # Search specific library
```

## Architecture

The project uses a modular plugin architecture where each library system has its own implementation module.

**Core Flow:**

1. `src/cli.js` - CLI entry point using Commander.js for args, @inquirer/prompts for interactive menus
2. `src/dongnelibrary.js` - Main orchestrator that routes searches to library modules and runs them in parallel via `async.parallel`
3. `src/library/*.js` - Individual library scrapers (one per library system)
4. `src/util.js` - Shared utilities for HTML parsing and CSV handling

**Library Modules** (`src/library/`):

- `gg.js` - 경기교육통합도서관 (Gyeonggi Provincial Educational Libraries)
- `gunpo.js` - 군포시도서관 (Gunpo City)
- `hscity.js` - 화성시립도서관 (Hwaseong City)
- `osan.js` - 오산시도서관 (Osan City)
- `snlib.js` - 성남시도서관 (Seongnam City)
- `suwon.js` - 수원시도서관 (Suwon City)
- `yongin.js` - 용인시도서관 (Yongin City)

Each library module scrapes its respective library website using `undici` for HTTP and `jsdom` for DOM parsing, then returns standardized book availability results.

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

## Test Structure

Tests in `test/` mirror the library modules and use Node.js built-in test runner (`node:test`). Each test file has a 20-second timeout to accommodate network requests to library websites. No external test framework dependencies are required.

## Current API Endpoints

- **gg.js**: `https://lib.goe.go.kr/gg/intro/search/index.do`
- **gunpo.js**: `http://www.gunpolib.go.kr/...`
- **hscity.js**: `https://hscitylib.or.kr/...`
- **osan.js**: `https://www.osanlibrary.go.kr/intro/program/plusSearchResultList.do`
- **snlib.js**: `http://www.snlib.net/...`
- **suwon.js**: `https://search.suwonlib.go.kr/getSearchResult/normal` (requires session init)
- **yongin.js**: `https://lib.yongin.go.kr/intro/menu/10003/program/30012/plusSearchResultList.do`
