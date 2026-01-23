/**
 * Shared type definitions for DongneLibrary
 */

/**
 * Library information with code and name
 */
export interface LibraryInfo {
  code: string;
  name: string;
}

/**
 * Options for book search
 */
export interface SearchOptions {
  title: string;
  libraryName: string;
  startPage?: number;
}

/**
 * Individual book information
 */
export interface Book {
  libraryName: string;
  title: string;
  exist: boolean;
  bookUrl?: string;
  maxoffset?: number | string;
}

/**
 * Search result containing book list and metadata
 */
export interface SearchResult {
  title?: string;
  libraryName?: string;
  homeUrl?: string;
  totalBookCount: number | string;
  startPage?: number;
  booklist: Book[];
}

/**
 * Error object returned by search functions
 */
export interface SearchError {
  msg: string;
}

/**
 * Callback function signature for search operations
 */
export type SearchCallback = (err: SearchError | null, result?: SearchResult) => void;

/**
 * HTTP response structure
 */
export interface HttpResponse {
  statusCode: number;
  body: string;
}

/**
 * Options for HTTP requests
 */
export interface HttpOptions {
  qs?: Record<string, string | number>;
  form?: Record<string, string | number | boolean>;
  headers?: Record<string, string>;
  timeout?: number;
}

/**
 * HTTP session interface for cookie-based requests
 */
export interface HttpSession {
  get(url: string, options?: HttpOptions): Promise<HttpResponse>;
  post(url: string, options?: HttpOptions): Promise<HttpResponse>;
}

/**
 * Library module interface - each library scraper must export these
 */
export interface LibraryModule {
  search: (opt: SearchOptions, callback?: SearchCallback) => Promise<SearchResult | void>;
  getLibraryNames: () => string[];
  homeUrl: string;
}

/**
 * Internal library registry entry
 */
export interface LibraryRegistryEntry {
  name: string;
  search: LibraryModule['search'];
  homeUrl: string;
}
