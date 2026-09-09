import assert from "node:assert/strict";
import test from "node:test";

import {
  initMonitoring,
  reportRequestFailure,
  resetMonitoring,
  scrubEvent,
  scrubUrl,
} from "../src/lib/monitoring.ts";

const fakeSentry = () => {
  const calls = { init: [], captured: [] };
  return {
    calls,
    init: (options) => calls.init.push(options),
    captureException: (error, hint) => calls.captured.push({ error, hint }),
  };
};

test("URL에서 좌표가 담긴 쿼리스트링을 잘라낸다", () => {
  // /api/places는 뷰포트 bbox(=사용자 위치)를 쿼리로 보낸다.
  assert.equal(
    scrubUrl("/api/places?bbox=126.97,37.55,127.01,37.58&category=cafe"),
    "/api/places",
  );
  assert.equal(
    scrubUrl("https://after-glow.duckdns.org/api/places?bbox=126.9,37.5"),
    "/api/places",
  );
  assert.equal(scrubUrl("https://after-glow.duckdns.org"), "/");
  assert.equal(scrubUrl("/api/route#frag"), "/api/route");
  assert.equal(scrubUrl(undefined), "");
});

test("전송 직전 이벤트에서 좌표·토큰·사용자를 걷어낸다", () => {
  const event = scrubEvent({
    request: {
      url: "https://after-glow.duckdns.org/api/places?bbox=126.9,37.5,127.0,37.6",
      query_string: "bbox=126.9,37.5,127.0,37.6",
      data: { lat: 37.5, lng: 126.9 },
      headers: {
        Authorization: "Bearer secret-token",
        cookie: "session=abc",
        "Content-Type": "application/json",
      },
    },
    user: { email: "someone@example.com" },
    breadcrumbs: [{ data: { url: "/api/places?bbox=1,2,3,4" } }],
  });

  assert.equal(event.request.url, "/api/places");
  assert.equal(event.request.query_string, undefined);
  assert.equal(event.request.data, undefined);
  assert.equal(event.request.Authorization, undefined);
  assert.equal(event.request.headers.Authorization, undefined);
  assert.equal(event.request.headers.cookie, undefined);
  // 민감하지 않은 헤더는 남긴다.
  assert.equal(event.request.headers["Content-Type"], "application/json");
  assert.equal(event.user, undefined);
  assert.equal(event.breadcrumbs[0].data.url, "/api/places");
});

test("DSN이 없으면 SDK를 건드리지 않는다", () => {
  resetMonitoring();
  const sentry = fakeSentry();

  assert.equal(initMonitoring(sentry, { dsn: undefined }), false);
  assert.equal(sentry.calls.init.length, 0);

  // 초기화되지 않았으면 리포트도 조용히 무시된다.
  assert.equal(
    reportRequestFailure(new Error("boom"), { client: "main", status: 500 }),
    false,
  );
});

test("DSN이 있으면 PII를 끈 채 초기화한다", () => {
  resetMonitoring();
  const sentry = fakeSentry();

  assert.equal(initMonitoring(sentry, { dsn: "https://x@sentry.io/1" }), true);

  const [options] = sentry.calls.init;
  assert.equal(options.dsn, "https://x@sentry.io/1");
  assert.equal(options.sendDefaultPii, false);
  assert.equal(options.tracesSampleRate, 0);
  assert.equal(typeof options.beforeSend, "function");
});

test("실패한 요청은 경로만 태그로 남긴다", () => {
  resetMonitoring();
  const sentry = fakeSentry();
  initMonitoring(sentry, { dsn: "https://x@sentry.io/1" });

  const error = new Error("timeout");
  assert.equal(
    reportRequestFailure(error, {
      client: "main",
      endpoint: "/api/places?bbox=126.9,37.5",
      status: 500,
    }),
    true,
  );

  const [call] = sentry.calls.captured;
  assert.equal(call.error, error);
  assert.deepEqual(call.hint.tags, {
    client: "main",
    endpoint: "/api/places",
    status: "500",
  });
});

test("응답이 없던 실패는 status 0으로 남는다", () => {
  resetMonitoring();
  const sentry = fakeSentry();
  initMonitoring(sentry, { dsn: "https://x@sentry.io/1" });

  reportRequestFailure(new Error("Network Error"), {
    client: "ai",
    endpoint: "/api/course-selection",
  });

  assert.equal(sentry.calls.captured[0].hint.tags.status, "0");
});

test("401·403은 만료 토큰의 정상 흐름이라 리포트하지 않는다", () => {
  resetMonitoring();
  const sentry = fakeSentry();
  initMonitoring(sentry, { dsn: "https://x@sentry.io/1" });

  for (const status of [401, 403]) {
    assert.equal(
      reportRequestFailure(new Error("unauthorized"), {
        client: "main",
        status,
      }),
      false,
    );
  }
  assert.equal(sentry.calls.captured.length, 0);
});
