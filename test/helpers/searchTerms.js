/**
 * 실제 사이트 테스트와 fixture 녹화가 함께 쓰는 검색어 후보.
 * 앞에서부터 차례로 시도해 결과가 나오는 첫 검색어를 쓴다.
 * 작은 분관은 영어 제목 책이 없을 수 있어 한글 후보를 뒤에 둔다.
 */
const DEFAULT_SEARCH_TERMS = ["javascript", "자바", "소설", "별"];

/**
 * @param {object} [options]
 * @param {string[]} [options.searchTerms] - 후보 전체를 바꾼다
 * @param {string} [options.englishSearchTerm] - 첫 후보만 바꾼다 (WAF 가 "javascript" 를 막는 서버용)
 * @returns {string[]}
 */
function getSearchTerms(options = {}) {
  if (options.searchTerms?.length) return options.searchTerms;
  const first = options.englishSearchTerm ?? DEFAULT_SEARCH_TERMS[0];
  return [...new Set([first, ...DEFAULT_SEARCH_TERMS])];
}

module.exports = { DEFAULT_SEARCH_TERMS, getSearchTerms };
