import { JSDOM } from "jsdom";

/**
 * Parse an HTML string into a DOM Document.
 * All library modules parse HTML through this function, so the parser can be swapped in one place.
 */
export function parseHtml(html: string): Document {
  return new JSDOM(html).window.document;
}
