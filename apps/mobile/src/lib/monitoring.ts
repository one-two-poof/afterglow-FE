/**
 * 에러 리포팅(Sentry) 연결부.
 *
 * **DSN이 없으면 전부 no-op이다.** 로컬 개발과 DSN 미설정 빌드에서는 SDK를 초기화하지
 * 않고, 리포트 호출도 조용히 무시한다. 그래서 Sentry 계정이 없어도 앱은 그대로 돈다.
 *
 * ⚠️ 개인정보 — 이 앱은 URL에 좌표를 싣는다.
 *    `/api/places?bbox=126.9,37.5,127.0,37.6` 처럼 뷰포트 좌표가 쿼리스트링에 들어가므로
 *    URL을 그대로 올리면 사용자 위치 이력이 Sentry에 쌓인다. 그래서 쿼리스트링은 항상
 *    잘라낸다. docs/performance의 "정확한 위치 좌표는 수집하지 않는다" 기준을 따른다.
 *
 * 테스트를 위해 Sentry 모듈은 주입받는다(레포의 place-actions.ts와 같은 방식).
 */
import { env } from "@/lib/env";

/** 우리가 쓰는 Sentry API만 추린 최소 인터페이스. */
export type SentryLike = {
  init: (options: Record<string, unknown>) => void;
  captureException: (
    error: unknown,
    hint?: { tags?: Record<string, string>; extra?: Record<string, unknown> },
  ) => void;
};

type SentryEvent = {
  request?: {
    url?: string;
    query_string?: unknown;
    headers?: Record<string, string>;
    data?: unknown;
  };
  user?: unknown;
  breadcrumbs?: { data?: { url?: string } }[];
};

let reporter: SentryLike | null = null;

/**
 * URL에서 경로만 남긴다. 쿼리스트링·해시·호스트를 모두 버린다.
 * 상대 경로(axios의 config.url)와 절대 URL을 모두 받는다.
 */
export function scrubUrl(url: string | undefined | null): string {
  if (!url) return "";
  const withoutHash = url.split("#")[0] ?? "";
  const withoutQuery = withoutHash.split("?")[0] ?? "";
  // 절대 URL이면 스킴+호스트를 떼고 경로만 남긴다.
  const match = withoutQuery.match(/^[a-z][a-z0-9+.-]*:\/\/[^/]+(\/.*)?$/i);
  if (match) return match[1] ?? "/";
  return withoutQuery;
}

/**
 * 전송 직전 이벤트에서 민감한 값을 걷어낸다.
 * Sentry의 `beforeSend`로 넘긴다 — SDK가 자동으로 붙이는 값까지 여기서 한 번 더 막는다.
 */
export function scrubEvent<T extends SentryEvent>(event: T): T {
  if (event.request) {
    event.request.url = scrubUrl(event.request.url);
    delete event.request.query_string;
    delete event.request.data;
    if (event.request.headers) {
      delete event.request.headers.Authorization;
      delete event.request.headers.authorization;
      delete event.request.headers.Cookie;
      delete event.request.headers.cookie;
    }
  }
  // 이메일·IP 등 사용자 식별 정보는 보내지 않는다.
  delete event.user;
  for (const breadcrumb of event.breadcrumbs ?? []) {
    if (breadcrumb.data?.url) {
      breadcrumb.data.url = scrubUrl(breadcrumb.data.url);
    }
  }
  return event;
}

/**
 * SDK를 초기화한다. DSN이 없으면 아무것도 하지 않고 false를 돌려준다.
 * 앱 진입점(_layout.tsx)에서 렌더 전에 한 번 호출한다.
 */
export function initMonitoring(
  sentry: SentryLike,
  { dsn = env.sentryDsn }: { dsn?: string } = {},
): boolean {
  if (!dsn) return false;

  sentry.init({
    dsn,
    // 기본 PII 수집을 끈다. 위 scrubEvent와 이중 방어.
    sendDefaultPii: false,
    // 성능 트레이싱은 무료 티어 한도(월 5천 이벤트)를 빨리 태우므로 일단 끈다.
    tracesSampleRate: 0,
    beforeSend: scrubEvent,
  });
  reporter = sentry;
  return true;
}

/** 401/403은 만료된 토큰으로 늘 발생하는 정상 흐름이라 리포트하지 않는다. */
const EXPECTED_STATUSES = new Set([401, 403]);

/**
 * 실패한 API 요청을 리포트한다.
 * 지금까지 axios 인터셉터가 사용자 문구로 바꾸고 버리던 정보가 여기서 처음 집계된다.
 */
export function reportRequestFailure(
  error: unknown,
  {
    client,
    endpoint,
    status,
  }: { client: string; endpoint?: string; status?: number },
): boolean {
  if (!reporter) return false;
  if (status !== undefined && EXPECTED_STATUSES.has(status)) return false;

  reporter.captureException(error, {
    tags: {
      client,
      endpoint: scrubUrl(endpoint),
      // 응답 자체가 없었으면(네트워크 실패) 0으로 표시한다.
      status: String(status ?? 0),
    },
  });
  return true;
}

/** 테스트용 — 모듈 상태를 되돌린다. */
export function resetMonitoring(): void {
  reporter = null;
}
