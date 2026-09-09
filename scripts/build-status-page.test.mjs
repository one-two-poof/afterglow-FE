import assert from "node:assert/strict";
import test from "node:test";

import {
  parseHistory,
  renderStatusPage,
  summarizeHealth,
  worstTone,
} from "./build-status-page.mjs";

const NOW = Date.parse("2026-09-09T06:00:00.000Z");
const minutesAgo = (minutes) => new Date(NOW - minutes * 60_000).toISOString();

test("깨진 줄이 섞여도 나머지 기록은 파싱된다", () => {
  const records = parseHistory(
    [
      '{"ts":"2026-09-09T06:00:00.000Z","id":"main-api","ok":true,"status":401,"ms":90}',
      "<<<<<<< HEAD",
      "",
      '{"ts":"2026-09-09T06:30:00.000Z","id":"ml-api","ok":true,"status":405,"ms":30}',
    ].join("\n"),
  );

  assert.equal(records.length, 2);
  assert.equal(records[1].id, "ml-api");
});

test("24시간 가용률과 중간 응답시간을 계산한다", () => {
  const records = [
    { ts: minutesAgo(90), id: "main-api", ok: true, status: 401, ms: 100 },
    {
      ts: minutesAgo(60),
      id: "main-api",
      ok: false,
      status: 502,
      ms: 300,
      note: "상태코드 502",
    },
    { ts: minutesAgo(30), id: "main-api", ok: true, status: 401, ms: 200 },
    { ts: minutesAgo(5), id: "main-api", ok: true, status: 401, ms: 120 },
  ];

  const [mainApi] = summarizeHealth(records, { now: NOW });

  assert.equal(mainApi.samples, 4);
  assert.equal(mainApi.uptime, 75);
  // 실패한 표본의 응답시간은 중간값에서 제외한다(에러가 빠르면 지표가 좋아 보이므로).
  assert.equal(mainApi.medianMs, 120);
  assert.equal(mainApi.latest.status, 401);
  assert.equal(mainApi.failures.length, 1);
});

test("창 밖 기록은 집계에서 빠지고 버킷은 실패를 우선한다", () => {
  const records = [
    { ts: minutesAgo(60 * 30), id: "main-api", ok: false, status: 500, ms: 10 },
    { ts: minutesAgo(20), id: "main-api", ok: true, status: 401, ms: 10 },
    { ts: minutesAgo(19), id: "main-api", ok: false, status: 500, ms: 10 },
  ];

  const [mainApi] = summarizeHealth(records, { now: NOW });

  assert.equal(mainApi.samples, 2); // 30시간 전 기록은 제외
  assert.equal(mainApi.buckets.filter((bucket) => bucket === "bad").length, 1);
  assert.equal(mainApi.buckets.filter((bucket) => bucket === "ok").length, 0);
});

test("기록이 없는 프로브도 카드 자리를 지킨다", () => {
  const summary = summarizeHealth([], { now: NOW });

  assert.equal(summary.length, 3);
  assert.deepEqual(
    summary.map((probe) => probe.uptime),
    [null, null, null],
  );
});

test("실패가 있으면 헤드라인이 이상으로 바뀐다", () => {
  const probes = summarizeHealth(
    [
      {
        ts: minutesAgo(5),
        id: "main-api",
        ok: false,
        status: 502,
        ms: 10,
        note: "상태코드 502",
      },
    ],
    { now: NOW },
  );

  const html = renderStatusPage({ probes, now: NOW });

  assert.match(html, /이상 1건/);
  assert.match(html, /상태코드 502/);
  // 아직 안 붙은 단계는 "준비 중" 자리표시자로 남는다.
  assert.match(html, /준비 중/);
});

test("HTML 특수문자는 이스케이프된다", () => {
  const probes = summarizeHealth(
    [
      {
        ts: minutesAgo(5),
        id: "main-api",
        ok: false,
        status: 500,
        ms: 10,
        note: '<script>alert("x")</script>',
      },
    ],
    { now: NOW },
  );

  const html = renderStatusPage({ probes, now: NOW });

  assert.doesNotMatch(html, /<script>alert/);
  assert.match(html, /&lt;script&gt;/);
});

test("E2E·Sentry 데이터가 있으면 카드에 채워진다", () => {
  const html = renderStatusPage({
    probes: summarizeHealth([], { now: NOW }),
    e2e: {
      ts: minutesAgo(120),
      total: 3,
      passed: 2,
      failed: [{ name: "signup-validation", step: "탭 이동 실패" }],
    },
    sentry: {
      ts: minutesAgo(10),
      count24h: 4,
      issues: [{ title: "TypeError", count: 3 }],
    },
    now: NOW,
  });

  assert.match(html, /2\/3/);
  assert.match(html, /signup-validation/);
  assert.match(html, /TypeError/);
});

test("실패가 많아도 카드는 5건까지만 나열하고 나머지는 건수로 알린다", () => {
  const failed = Array.from({ length: 8 }, (_, index) => ({
    name: `flow-${index}`,
    step: "타임아웃",
  }));

  const html = renderStatusPage({
    probes: summarizeHealth([], { now: NOW }),
    e2e: { ts: minutesAgo(10), total: 12, passed: 4, failed },
    now: NOW,
  });

  assert.match(html, /flow-4/);
  assert.doesNotMatch(html, /flow-5/);
  assert.match(html, /외 3건/);
});

test("개요 탭은 셋 중 가장 나쁜 상태를 대표한다", () => {
  assert.equal(worstTone(["ok", "ok", "ok"]), "ok");
  assert.equal(worstTone(["ok", "bad", "warn"]), "bad");
  assert.equal(worstTone(["ok", "warn", "idle"]), "warn");
  // "모름"을 "정상"으로 보이면 안 되므로 idle이 ok보다 나쁘다.
  assert.equal(worstTone(["ok", "idle"]), "idle");
  assert.equal(worstTone([]), "idle");
});

test("E2E가 깨지면 개요 탭 점도 빨갛다", () => {
  const html = renderStatusPage({
    probes: summarizeHealth(
      [{ ts: minutesAgo(5), id: "main-api", ok: true, status: 401, ms: 90 }],
      { now: NOW },
    ),
    e2e: {
      ts: minutesAgo(60),
      total: 3,
      passed: 2,
      failed: [{ name: "signup-validation", step: "타임아웃" }],
    },
    now: NOW,
  });

  assert.match(html, /id="tab-overview"[\s\S]{0,200}dot bad/);
});

test("목록의 시각은 한 줄에 들어가는 짧은 형식이다", () => {
  const html = renderStatusPage({
    probes: summarizeHealth(
      [
        {
          ts: "2026-09-09T02:15:00.000Z", // KST 11:15
          id: "main-api",
          ok: false,
          status: 502,
          ms: 10,
          note: "상태코드 502",
        },
      ],
      { now: Date.parse("2026-09-09T06:00:00.000Z") },
    ),
    now: Date.parse("2026-09-09T06:00:00.000Z"),
  });

  assert.match(html, /09\.09 11:15/);
  // "오전/오후"가 붙은 긴 형식은 목록에 들어가지 않는다.
  assert.doesNotMatch(html, /<span class="event-time">[^<]*오[전후]/);
});
