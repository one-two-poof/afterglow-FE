import assert from "node:assert/strict";
import test from "node:test";

import { fetchIssues, readConfig, summarizeIssues } from "./sentry-summary.mjs";

test("설정이 하나라도 없으면 건너뛴다", () => {
  assert.equal(readConfig({}), null);
  assert.equal(readConfig({ SENTRY_AUTH_TOKEN: "t", SENTRY_ORG: "o" }), null);
  assert.deepEqual(
    readConfig({
      SENTRY_AUTH_TOKEN: "t",
      SENTRY_ORG: "o",
      SENTRY_PROJECT: "p",
    }),
    { token: "t", org: "o", project: "p" },
  );
});

test("문자열 count를 더해 24시간 합계를 낸다", () => {
  const summary = summarizeIssues(
    [
      { title: "TypeError: undefined is not a function", count: "12" },
      { title: "Network Error", count: "3" },
    ],
    { ts: "2026-09-09T12:00:00.000Z" },
  );

  assert.equal(summary.count24h, 15);
  assert.equal(summary.issues[0].count, 12);
});

test("상위 3개만 남기고 많은 순으로 정렬한다", () => {
  const summary = summarizeIssues(
    [
      { title: "a", count: "1" },
      { title: "b", count: "50" },
      { title: "c", count: "7" },
      { title: "d", count: "20" },
    ],
    { ts: "t" },
  );

  assert.deepEqual(
    summary.issues.map((issue) => issue.title),
    ["b", "d", "c"],
  );
  // 잘린 이슈도 합계에는 포함된다.
  assert.equal(summary.count24h, 78);
});

test("제목이 없으면 metadata.type으로 대체한다", () => {
  const summary = summarizeIssues([
    { metadata: { type: "RangeError" }, count: "2" },
  ]);
  assert.equal(summary.issues[0].title, "RangeError");
});

test("이슈가 없으면 0건으로 기록된다", () => {
  const summary = summarizeIssues([], { ts: "t" });
  assert.deepEqual(summary, { ts: "t", count24h: 0, issues: [] });
});

test("API가 실패하면 상태코드를 담아 던진다", async () => {
  await assert.rejects(
    () =>
      fetchIssues(
        { token: "t", org: "o", project: "p" },
        { fetchImpl: async () => ({ ok: false, status: 403 }) },
      ),
    /Sentry API 403/,
  );
});

test("토큰은 Authorization 헤더로만 보낸다(URL에 담지 않는다)", async () => {
  let seen;
  await fetchIssues(
    { token: "secret", org: "o", project: "p" },
    {
      fetchImpl: async (url, init) => {
        seen = { url, init };
        return { ok: true, json: async () => [] };
      },
    },
  );

  assert.doesNotMatch(seen.url, /secret/);
  assert.equal(seen.init.headers.Authorization, "Bearer secret");
  assert.match(seen.url, /statsPeriod=24h/);
});
