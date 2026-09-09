import assert from "node:assert/strict";
import test from "node:test";

import {
  parseHistory,
  renderStatusPage,
  STALE_AFTER_MS,
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

test("기록이 보존 주기보다 오래되면 stale로 표시한다", () => {
  const fresh = summarizeHealth(
    [{ ts: minutesAgo(60), id: "main-api", ok: true, status: 401, ms: 90 }],
    { now: NOW },
  );
  assert.equal(fresh[0].stale, false);

  const old = summarizeHealth(
    [{ ts: minutesAgo(95), id: "main-api", ok: true, status: 401, ms: 90 }],
    { now: NOW },
  );
  assert.equal(old[0].stale, true);
});

test("점검이 멈추면 마지막 기록이 성공이어도 정상이라고 말하지 않는다", () => {
  const html = renderStatusPage({
    probes: summarizeHealth(
      // 5시간 전 성공 기록만 있는 상태 — 지금 서버가 어떤지는 알 수 없다.
      [{ ts: minutesAgo(300), id: "main-api", ok: true, status: 401, ms: 90 }],
      { now: NOW },
    ),
    now: NOW,
  });

  assert.match(html, /점검 중단/);
  assert.match(html, /자동 점검이 멈춰 있습니다/);
  assert.doesNotMatch(html, /백엔드 정상/);
  // 가용률을 초록으로 칠하면 "정상"으로 읽힌다.
  assert.doesNotMatch(html, /stat-value ok/);
});

test("점검이 정상 주기로 돌면 알림 줄은 뜨지 않는다", () => {
  const html = renderStatusPage({
    probes: summarizeHealth(
      [{ ts: minutesAgo(20), id: "main-api", ok: true, status: 401, ms: 90 }],
      { now: NOW },
    ),
    now: NOW,
  });

  assert.doesNotMatch(html, /자동 점검이 멈춰 있습니다/);
  assert.match(html, /백엔드 정상/);
});

test("낡음 기준은 점검 주기 30분의 3회 누락(90분)이다", () => {
  assert.equal(STALE_AFTER_MS, 90 * 60 * 1000);
});

test("한 번도 돈 적 없는 프로브는 stale이 아니라 대기 중이다", () => {
  // 기록이 아예 없는 것과 돌다가 멈춘 것은 다른 사건이다.
  const [probe] = summarizeHealth([], { now: NOW });

  assert.equal(probe.stale, false);
  assert.equal(probe.latest, null);

  const html = renderStatusPage({
    probes: summarizeHealth([], { now: NOW }),
    now: NOW,
  });
  assert.doesNotMatch(html, /자동 점검이 멈춰 있습니다/);
  assert.match(html, /대기 중/);
});

test("사이드바는 페이지 갱신 시각과 마지막 점검 시각을 함께 보여준다", () => {
  // 둘이 어긋나 있다는 것 자체가 "점검이 멈췄다"는 신호다.
  const html = renderStatusPage({
    probes: summarizeHealth(
      [{ ts: minutesAgo(300), id: "main-api", ok: true, status: 401, ms: 90 }],
      { now: NOW },
    ),
    now: NOW,
  });

  assert.match(html, /페이지 갱신/);
  assert.match(html, /마지막 점검/);
  // 돌지도 않는 주기를 단언하지 않는다.
  assert.doesNotMatch(html, /30분마다 자동 점검/);
});
