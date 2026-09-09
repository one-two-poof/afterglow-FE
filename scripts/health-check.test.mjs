import assert from "node:assert/strict";
import test from "node:test";

import {
  assertCacheable,
  evaluateResponse,
  expiredHistoryFiles,
  historyFileFor,
  PROBES,
  runProbe,
  runProbeWithRetry,
} from "./health-check.mjs";

const response = (status, headers = {}) => ({
  status,
  headers: new Headers(headers),
});

const cacheableHeaders = {
  "cache-control": "public, max-age=3600",
  "accept-ranges": "bytes",
};

test("토큰 없는 /api/auth/me는 401이 정상이고 200은 실패다", () => {
  const probe = { expectStatus: [401] };
  assert.equal(evaluateResponse(probe, response(401)).ok, true);
  assert.equal(evaluateResponse(probe, response(200)).ok, false);
  assert.equal(evaluateResponse(probe, response(502)).ok, false);
});

test("expectBelow는 5xx만 실패로, rejectStatus는 404를 실패로 본다", () => {
  const probe = { expectBelow: 500, rejectStatus: [404] };
  assert.equal(evaluateResponse(probe, response(405)).ok, true);
  assert.equal(evaluateResponse(probe, response(401)).ok, true);
  assert.equal(evaluateResponse(probe, response(404)).ok, false);
  assert.equal(evaluateResponse(probe, response(503)).ok, false);
});

test("pmtiles에 no-store가 돌아오면 실패로 잡는다", () => {
  assert.equal(assertCacheable(new Headers(cacheableHeaders)), null);

  const regressed = assertCacheable(
    new Headers({ "cache-control": "no-store", "accept-ranges": "bytes" }),
  );
  assert.match(regressed, /no-store/);

  const noRange = assertCacheable(new Headers({ "cache-control": "public" }));
  assert.match(noRange, /Accept-Ranges/);
});

test("206이어도 헤더가 회귀하면 프로브는 실패한다", () => {
  const probe = PROBES.find((p) => p.id === "buildings-pmtiles");
  assert.equal(
    evaluateResponse(probe, response(206, cacheableHeaders)).ok,
    true,
  );
  assert.equal(
    evaluateResponse(
      probe,
      response(206, { "cache-control": "no-store", "accept-ranges": "bytes" }),
    ).ok,
    false,
  );
});

test("네트워크 실패는 status 0으로 기록된다", async () => {
  let clock = 1000;
  const result = await runProbe(
    { id: "main-api", url: "https://example.invalid", method: "GET" },
    {
      fetchImpl: async () => {
        clock += 250;
        throw new Error("The operation was aborted due to timeout");
      },
      now: () => clock,
    },
  );

  assert.equal(result.ok, false);
  assert.equal(result.status, 0);
  assert.equal(result.ms, 250);
  assert.match(result.note, /timeout/);
});

test("성공한 프로브는 소요 시간을 담는다", async () => {
  let clock = 0;
  const result = await runProbe(
    {
      id: "main-api",
      url: "https://example.test",
      method: "GET",
      expectStatus: [401],
    },
    {
      fetchImpl: async () => {
        clock += 42;
        return response(401);
      },
      now: () => clock,
    },
  );

  assert.deepEqual(result, {
    id: "main-api",
    ok: true,
    status: 401,
    ms: 42,
    note: "",
  });
});

test("기록 파일은 월별로 나뉜다", () => {
  assert.match(
    historyFileFor("/data", "2026-09-09T06:30:00.000Z"),
    /health\/2026-09\.jsonl$/,
  );
});

test("보존 기간이 지난 월별 파일만 삭제 대상이 된다", () => {
  const files = [
    "2026-06.jsonl",
    "2026-08.jsonl",
    "2026-09.jsonl",
    "README.md",
  ];

  assert.deepEqual(expiredHistoryFiles(files, "2026-09-09T06:30:00.000Z"), [
    "2026-06.jsonl",
  ]);
  // 연도를 넘어가도 직전 달은 남는다.
  assert.deepEqual(
    expiredHistoryFiles(
      ["2025-12.jsonl", "2026-01.jsonl"],
      "2026-01-02T00:00:00.000Z",
    ),
    [],
  );
});

test("DNS 블립은 재시도로 흡수하고, 서버가 응답한 5xx는 재시도하지 않는다", async () => {
  let calls = 0;
  const blip = await runProbeWithRetry(
    {
      id: "main-api",
      url: "https://x.test",
      method: "GET",
      expectStatus: [401],
    },
    {
      sleep: async () => {},
      now: () => 0,
      fetchImpl: async () => {
        calls += 1;
        if (calls === 1) throw new Error("getaddrinfo ENOTFOUND x.test");
        return { status: 401, headers: new Headers() };
      },
    },
  );

  assert.equal(calls, 2);
  assert.equal(blip.ok, true);
  assert.match(blip.note, /재시도 성공/);

  let serverCalls = 0;
  const down = await runProbeWithRetry(
    {
      id: "main-api",
      url: "https://x.test",
      method: "GET",
      expectStatus: [401],
    },
    {
      sleep: async () => {},
      now: () => 0,
      fetchImpl: async () => {
        serverCalls += 1;
        return { status: 502, headers: new Headers() };
      },
    },
  );

  assert.equal(serverCalls, 1); // 5xx는 그대로 실패로 보고한다
  assert.equal(down.ok, false);
});

test("두 번 다 죽으면 실패로 기록된다", async () => {
  const result = await runProbeWithRetry(
    { id: "ml-api", url: "https://x.test", method: "GET" },
    {
      sleep: async () => {},
      now: () => 0,
      fetchImpl: async () => {
        throw new Error("connect ECONNREFUSED");
      },
    },
  );

  assert.equal(result.ok, false);
  assert.match(result.note, /2회 연속 실패/);
});
