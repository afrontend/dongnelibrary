/**
 * `node -r` 로 미리 불러 모든 HTTP 요청을 즉시 실패시킨다.
 * CLI 를 네트워크 없이 띄워 어느 도서관에 요청하는지만 셀 때 쓴다.
 */
require("./httpRecorder").startReplay([]);
