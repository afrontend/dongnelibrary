/**
 * Parse a combined query string into library name(s) and book title.
 * Checks in order:
 *   1. Comma-separated multi-library token (e.g. "판교,정자 해리포터")
 *   2. Exact single library name anywhere in query (longest name wins)
 *   3. Partial single library per whitespace token
 * Returns null if no library name can be identified.
 *
 * @param allLibraryNames - Full list of known library names (caller provides once)
 */
export function parseQueryString(
  query: string,
  allLibraryNames: string[],
): { libraryName: string | string[]; title: string } | null {
  const sortedByLength = [...allLibraryNames].sort((a, b) => b.length - a.length);
  const tokens = query.split(/\s+/);

  // Step 1: Comma-separated multi-library token (e.g. "판교,정자")
  for (const token of tokens) {
    if (!token.includes(",")) continue;
    const parts = token.split(",").filter(Boolean);
    const resolved = parts
      .map((p) => allLibraryNames.find((name) => name.includes(p)))
      .filter((n): n is string => !!n);
    if (resolved.length === parts.length) {
      const title = tokens.filter((t) => t !== token).join(" ").trim();
      if (title) return { libraryName: resolved, title };
    }
  }

  // Step 2: Exact match — longer names checked first to avoid substring shadowing
  for (const name of sortedByLength) {
    if (query.includes(name)) {
      const title = query.replace(name, "").trim();
      if (title) return { libraryName: name, title };
    }
  }

  // Step 3: Partial match — each whitespace token checked against all library names
  for (const token of tokens) {
    const matches = allLibraryNames.filter((name) => name.includes(token));
    if (matches.length > 0) {
      const title = tokens.filter((t) => t !== token).join(" ").trim();
      if (title)
        return {
          libraryName: matches.length === 1 ? matches[0] : matches,
          title,
        };
    }
  }

  return null;
}
