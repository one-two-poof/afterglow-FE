/**
 * 상태 페이지 빌더.
 *
 * status-data 브랜치에 쌓인 헬스체크 JSONL(+ 있으면 E2E·Sentry 요약)을 읽어
 * 정적 HTML 한 장으로 굽는다. GitHub Pages가 그 파일을 서빙한다.
 *
 * 런타임에 API를 부르지 않는 이유: 토큰이 페이지에 실리지 않아야 하고,
 * 서버가 죽었을 때도 페이지 자체는 떠야 하기 때문이다.
 *
 * 사용법:
 *   node scripts/build-status-page.mjs --data <status-data 디렉터리> --out <index.html>
 */
import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

import { PROBES } from "./health-check.mjs";

const WINDOW_MS = 24 * 60 * 60 * 1000;
const BUCKET_MS = 30 * 60 * 1000;
/**
 * 카드 하나에 나열할 실패 개수 상한. 플로우·프로브가 늘어 한꺼번에 여러 개가 깨지면
 * 카드 하나가 페이지를 통째로 밀어낸다 — 전체 목록은 아티팩트의 리포트에 있다.
 */
const MAX_LISTED_FAILURES = 5;

const PROBE_LABELS = new Map(PROBES.map((probe) => [probe.id, probe.label]));

export function parseHistory(text) {
  const records = [];
  for (const line of text.split(/\r?\n/)) {
    if (!line.trim()) continue;
    try {
      const record = JSON.parse(line);
      if (record.ts && record.id) records.push(record);
    } catch {
      // 커밋 충돌로 깨진 줄이 섞여도 나머지 집계는 계속한다.
    }
  }
  return records;
}

const median = (values) => {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor((sorted.length - 1) / 2)];
};

/**
 * 프로브별 24시간 요약. 버킷은 30분 단위로 최신이 오른쪽에 오게 만든다.
 * 한 버킷 안에 실패가 하나라도 있으면 실패로 칠한다(가려지면 안 되는 신호라서).
 */
export function summarizeHealth(records, { now = Date.now() } = {}) {
  const bucketCount = Math.floor(WINDOW_MS / BUCKET_MS);
  const windowStart = now - WINDOW_MS;

  return PROBES.map((probe) => {
    const mine = records
      .filter((record) => record.id === probe.id)
      .sort((a, b) => Date.parse(a.ts) - Date.parse(b.ts));
    const recent = mine.filter(
      (record) => Date.parse(record.ts) >= windowStart,
    );

    const buckets = Array.from({ length: bucketCount }, () => "none");
    for (const record of recent) {
      const index = Math.floor(
        (Date.parse(record.ts) - windowStart) / BUCKET_MS,
      );
      if (index < 0 || index >= bucketCount) continue;
      if (!record.ok) buckets[index] = "bad";
      else if (buckets[index] === "none") buckets[index] = "ok";
    }

    const okCount = recent.filter((record) => record.ok).length;

    return {
      id: probe.id,
      label: PROBE_LABELS.get(probe.id) ?? probe.id,
      url: probe.url,
      latest: mine.at(-1) ?? null,
      samples: recent.length,
      uptime: recent.length === 0 ? null : (okCount / recent.length) * 100,
      medianMs: median(recent.filter((r) => r.ok).map((r) => r.ms)),
      buckets,
      failures: recent
        .filter((record) => !record.ok)
        .slice(-MAX_LISTED_FAILURES)
        .reverse(),
    };
  });
}

const escape = (value) =>
  String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const KST = new Intl.DateTimeFormat("ko-KR", {
  timeZone: "Asia/Seoul",
  dateStyle: "medium",
  timeStyle: "short",
});

const formatTime = (iso) => (iso ? KST.format(new Date(iso)) : "기록 없음");

/**
 * 표에 들어갈 짧은 시각(09.09 18:15). 한국어 "오전/오후"가 붙은 긴 형식은
 * 좁은 열에서 두 줄로 깨진다 — 목록은 정렬이 읽기를 좌우하므로 폭을 고정한다.
 */
const KST_SHORT = new Intl.DateTimeFormat("ko-KR", {
  timeZone: "Asia/Seoul",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

// 로케일 출력을 문자열 치환으로 다듬으면 구분자까지 뭉개진다("09. 09. 18:15" →
// "09.09.18:15"). 파트로 받아 직접 조립한다.
const formatShort = (iso) => {
  if (!iso) return "—";
  const parts = Object.fromEntries(
    KST_SHORT.formatToParts(new Date(iso)).map((part) => [
      part.type,
      part.value,
    ]),
  );
  return `${parts.month}.${parts.day} ${parts.hour}:${parts.minute}`;
};

const relative = (iso, now) => {
  if (!iso) return "";
  const minutes = Math.round((now - Date.parse(iso)) / 60_000);
  if (minutes < 1) return "방금";
  if (minutes < 60) return `${minutes}분 전`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}시간 전`;
  return `${Math.round(hours / 24)}일 전`;
};

/** 상태 한 단어 + 색 계열. tone은 CSS 클래스와 1:1로 맞춘다. */
const probeTone = (probe) => {
  if (!probe.latest) return { text: "대기 중", tone: "idle" };
  return probe.latest.ok
    ? { text: "정상", tone: "ok" }
    : { text: "이상", tone: "bad" };
};

const e2eTone = (e2e) => {
  if (!e2e) return { text: "준비 중", tone: "idle" };
  return (e2e.failed ?? []).length > 0
    ? { text: "실패", tone: "bad" }
    : { text: "통과", tone: "ok" };
};

const sentryTone = (sentry) => {
  if (!sentry) return { text: "준비 중", tone: "idle" };
  return sentry.count24h > 0
    ? { text: `${sentry.count24h}건`, tone: "warn" }
    : { text: "없음", tone: "ok" };
};

/** 24시간 30분 단위 상태 막대. 값이 없는 구간은 옅게 남겨 공백을 드러낸다. */
const renderBars = (buckets) => `
        <div class="bars" role="img" aria-label="최근 24시간 30분 단위 상태">
          ${buckets.map((bucket) => `<i class="${bucket}"></i>`).join("")}
        </div>`;

const renderFailureList = (items) =>
  items.length === 0
    ? ""
    : `<ul class="fails">${items
        .slice(0, MAX_LISTED_FAILURES)
        .map(
          (item) =>
            `<li><span class="fail-key">${escape(item.key)}</span><span class="fail-note">${escape(item.note)}</span></li>`,
        )
        .join("")}${
        items.length > MAX_LISTED_FAILURES
          ? `<li class="fail-more">외 ${items.length - MAX_LISTED_FAILURES}건 — 아티팩트의 리포트 참고</li>`
          : ""
      }</ul>`;

/** 개요 탭의 요약 타일. 숫자 하나와 상태만 크게 보여준다. */
function renderSummaryTile({ label, value, unit = "", sub, tone }) {
  return `
        <article class="tile ${tone}">
          <p class="tile-label">${escape(label)}</p>
          <p class="tile-value">${escape(value)}<span class="tile-unit">${escape(unit)}</span></p>
          <p class="tile-sub">${escape(sub)}</p>
        </article>`;
}

function renderOverview({ probes, e2e, sentry, now }) {
  const withData = probes.filter((probe) => probe.uptime !== null);
  const uptime =
    withData.length === 0
      ? null
      : withData.reduce((sum, probe) => sum + probe.uptime, 0) /
        withData.length;
  const down = probes.filter((probe) => probe.latest?.ok === false);

  // 세 소스의 최근 실패를 한 줄기로 모아 "무슨 일이 있었나"를 한 화면에 세운다.
  const events = [
    ...probes.flatMap((probe) =>
      probe.failures.map((failure) => ({
        ts: failure.ts,
        key: probe.label,
        note: failure.note || `상태코드 ${failure.status}`,
      })),
    ),
    ...(e2e?.failed ?? []).map((flow) => ({
      ts: e2e.ts,
      key: flow.name,
      note: flow.step || "실패",
    })),
  ]
    .sort((a, b) => Date.parse(b.ts) - Date.parse(a.ts))
    // 실패를 몇 건까지 나열하는지는 페이지 전체에서 한 규칙으로 둔다.
    .slice(0, MAX_LISTED_FAILURES);

  return `
      <div class="tiles">
${renderSummaryTile({
  label: "백엔드 가용률",
  value: uptime === null ? "—" : uptime.toFixed(1),
  unit: uptime === null ? "" : "%",
  sub: `24시간 · 프로브 ${probes.length}종`,
  tone: down.length > 0 ? "bad" : uptime === null ? "idle" : "ok",
})}
${renderSummaryTile({
  label: "E2E",
  value: e2e ? `${e2e.passed}/${e2e.total}` : "—",
  sub: e2e ? `${relative(e2e.ts, now)} 실행` : "Maestro CI 연결 전",
  tone: e2eTone(e2e).tone,
})}
${renderSummaryTile({
  label: "앱 에러",
  value: sentry ? String(sentry.count24h) : "—",
  sub: sentry ? `24시간 · ${relative(sentry.ts, now)}` : "Sentry 연결 전",
  tone: sentryTone(sentry).tone,
})}
      </div>

      <section class="block">
        <h2 class="block-title">최근 이벤트</h2>
        ${
          events.length === 0
            ? `<p class="empty">최근 24시간 동안 기록된 실패가 없습니다.</p>`
            : `<ul class="events">${events
                .map(
                  (event) => `
            <li>
              <span class="event-time">${escape(formatShort(event.ts))}</span>
              <span class="event-key">${escape(event.key)}</span>
              <span class="event-note">${escape(event.note)}</span>
            </li>`,
                )
                .join("")}</ul>`
        }
      </section>`;
}

function renderBackend(probes, now) {
  return `
      <div class="rows">
${probes
  .map((probe) => {
    const state = probeTone(probe);
    const uptime = probe.uptime === null ? "—" : `${probe.uptime.toFixed(1)}%`;
    const latency = probe.medianMs === null ? "—" : `${probe.medianMs}ms`;
    return `
        <article class="row">
          <div class="row-head">
            <div>
              <h3 class="row-title">${escape(probe.label)}</h3>
              <code class="row-url">${escape(probe.url.replace(/^https?:\/\//, ""))}</code>
            </div>
            <span class="badge ${state.tone}">${state.text}</span>
          </div>
${renderBars(probe.buckets)}
          <dl class="metrics">
            <div><dt>24시간 가용률</dt><dd>${uptime}</dd></div>
            <div><dt>중간 응답</dt><dd>${latency}</dd></div>
            <div><dt>표본</dt><dd>${probe.samples}건</dd></div>
            <div><dt>마지막 응답</dt><dd>${
              probe.latest
                ? `${probe.latest.status} · ${relative(probe.latest.ts, now)}`
                : "—"
            }</dd></div>
          </dl>
          ${renderFailureList(
            probe.failures.map((failure) => ({
              key: formatShort(failure.ts),
              note: failure.note || `상태코드 ${failure.status}`,
            })),
          )}
        </article>`;
  })
  .join("")}
      </div>`;
}

function renderE2E(e2e, now) {
  if (!e2e) {
    return `
      <div class="rows">
        <article class="row idle">
          <div class="row-head">
            <div>
              <h3 class="row-title">Maestro</h3>
              <code class="row-url">.maestro/*.yaml</code>
            </div>
            <span class="badge idle">준비 중</span>
          </div>
          <p class="empty">E2E 워크플로가 아직 결과를 남기지 않았습니다. Actions에서 한 번 실행하면 채워집니다.</p>
        </article>
      </div>`;
  }

  const failed = e2e.failed ?? [];
  const state = e2eTone(e2e);
  return `
      <div class="rows">
        <article class="row">
          <div class="row-head">
            <div>
              <h3 class="row-title">Maestro</h3>
              <code class="row-url">.maestro/*.yaml</code>
            </div>
            <span class="badge ${state.tone}">${state.text}</span>
          </div>
          <dl class="metrics">
            <div><dt>통과</dt><dd>${e2e.passed}/${e2e.total}</dd></div>
            <div><dt>실패</dt><dd>${failed.length}건</dd></div>
            <div><dt>실행 시각</dt><dd>${escape(formatTime(e2e.ts))}</dd></div>
            <div><dt>경과</dt><dd>${relative(e2e.ts, now)}</dd></div>
          </dl>
          ${renderFailureList(
            failed.map((flow) => ({
              key: flow.name,
              note: flow.step ?? "실패",
            })),
          )}
        </article>
      </div>`;
}

function renderSentry(sentry, now) {
  if (!sentry) {
    return `
      <div class="rows">
        <article class="row idle">
          <div class="row-head">
            <div>
              <h3 class="row-title">Sentry</h3>
              <code class="row-url">@sentry/react-native</code>
            </div>
            <span class="badge idle">준비 중</span>
          </div>
          <p class="empty">DSN과 수집 Secrets가 설정되면 24시간 이벤트 수가 표시됩니다.</p>
        </article>
      </div>`;
  }

  const state = sentryTone(sentry);
  const issues = sentry.issues ?? [];
  return `
      <div class="rows">
        <article class="row">
          <div class="row-head">
            <div>
              <h3 class="row-title">Sentry</h3>
              <code class="row-url">@sentry/react-native</code>
            </div>
            <span class="badge ${state.tone}">${state.text}</span>
          </div>
          <dl class="metrics">
            <div><dt>24시간 이벤트</dt><dd>${sentry.count24h}</dd></div>
            <div><dt>미해결 이슈</dt><dd>${issues.length}종</dd></div>
            <div><dt>수집 시각</dt><dd>${escape(formatTime(sentry.ts))}</dd></div>
            <div><dt>경과</dt><dd>${relative(sentry.ts, now)}</dd></div>
          </dl>
          ${renderFailureList(
            issues.map((issue) => ({
              key: `${issue.count}회`,
              note: issue.title,
            })),
          )}
        </article>
      </div>`;
}

/**
 * 여러 상태 중 가장 나쁜 것을 고른다. 나쁜 소식이 좋은 소식에 가려지면 안 된다.
 * idle(데이터 없음)은 ok보다 나쁘게 본다 — "모름"을 "정상"으로 보이면 안 되므로.
 */
export function worstTone(tones) {
  const order = ["bad", "warn", "idle", "ok"];
  return order.find((tone) => tones.includes(tone)) ?? "idle";
}

/** 사이드바 항목. 각 탭 옆의 점이 그 영역의 상태를 그대로 말한다. */
const NAV = [
  { id: "overview", label: "개요" },
  { id: "backend", label: "백엔드" },
  { id: "e2e", label: "E2E" },
  { id: "errors", label: "앱 에러" },
];

export function renderStatusPage({
  probes,
  e2e = null,
  sentry = null,
  now = Date.now(),
}) {
  const down = probes.filter((probe) => probe.latest?.ok === false);
  const allOk = down.length === 0;
  const headline = allOk ? "백엔드 정상" : `이상 ${down.length}건`;

  const backendTone = allOk ? "ok" : "bad";
  const tones = {
    // 개요는 전체를 대표한다 — 아래 셋 중 가장 나쁜 상태를 그대로 올린다.
    // (백엔드만 보고 초록을 띄우면 E2E가 깨져 있어도 사이드바가 조용하다)
    overview: worstTone([
      backendTone,
      e2eTone(e2e).tone,
      sentryTone(sentry).tone,
    ]),
    backend: backendTone,
    e2e: e2eTone(e2e).tone,
    errors: sentryTone(sentry).tone,
  };

  const panels = {
    overview: renderOverview({ probes, e2e, sentry, now }),
    backend: renderBackend(probes, now),
    e2e: renderE2E(e2e, now),
    errors: renderSentry(sentry, now),
  };

  const titles = {
    overview: "개요",
    backend: "백엔드",
    e2e: "E2E",
    errors: "앱 에러",
  };

  return `<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light dark">
<!-- 열어둔 탭이 낡지 않도록 5분마다 새로 받는다. -->
<meta http-equiv="refresh" content="300">
<title>Afterglow 상태</title>
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css">
<style>
/* ── 색: packages/tokens/src/index.ts 의 시맨틱 토큰을 그대로 옮겼다 ── */
:root {
  --bg: #f7f8f8;              /* bg */
  --surface: #ffffff;         /* surface */
  --surface-muted: #f2f4f6;   /* surface-muted */
  --surface-accent: #f0faff;  /* surface-accent */
  --border: #d4dce5;          /* border */
  --border-soft: #e6eaf0;     /* neutral-200 */
  --text: #171c21;            /* text */
  --text-secondary: #3f4b58;  /* text-secondary */
  --text-muted: #8894a6;      /* text-muted */
  --primary: #0787d0;         /* primary-600 */
  --primary-strong: #00689a;  /* primary-700 */
  --ok: #1f9d55;              /* success-700 */
  --ok-weak: #eefcf4;
  --warn: #b7791f;            /* warning-700 */
  --warn-weak: #fff8e6;
  --bad: #c62828;             /* error-700 */
  --bad-weak: #fff1f1;
  --idle: #b8c4d0;            /* neutral-400 */
  --idle-weak: #f2f4f6;
  --sidebar: rgba(255, 255, 255, 0.72);
  --shadow: 0 1px 2px rgba(23, 28, 33, 0.04), 0 1px 1px rgba(23, 28, 33, 0.03);
}

@media (prefers-color-scheme: dark) {
  :root {
    --bg: #10151f;
    --surface: #1a2233;
    --surface-muted: #151d2b;
    --surface-accent: #16283a;
    --border: #2f4054;          /* secondary-700 */
    --border-soft: #26344a;
    --text: #dce4ef;            /* secondary-100 */
    --text-secondary: #aec6da;  /* secondary-200 */
    --text-muted: #7f90a6;
    --primary: #43c8ff;         /* primary-400 */
    --primary-strong: #86d8ff;  /* primary-300 */
    --ok: #2ecc71;
    --ok-weak: #12291e;
    --warn: #f4b400;
    --warn-weak: #2b2413;
    --bad: #ff6b66;
    --bad-weak: #2e1a1a;
    --idle: #4b607d;            /* secondary-500 */
    --idle-weak: #1d2739;
    --sidebar: rgba(26, 34, 51, 0.72);
    --shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
  }
}

* { box-sizing: border-box; }

body {
  margin: 0;
  background: var(--bg);
  color: var(--text);
  /* fontFamily.sans = Pretendard */
  font-family: "Pretendard Variable", Pretendard, -apple-system,
    BlinkMacSystemFont, "Apple SD Gothic Neo", system-ui, sans-serif;
  font-size: 14px;      /* body-sm */
  line-height: 20px;
  -webkit-font-smoothing: antialiased;
  word-break: keep-all;
}

code, .mono, .num {
  font-family: SFMono-Regular, Menlo, monospace;  /* fontFamily.mono */
  font-variant-numeric: tabular-nums;
}

/* ── 레이아웃: 고정 사이드바 + 스크롤되는 본문 ── */
.app { display: grid; grid-template-columns: 232px 1fr; min-height: 100vh; }

.sidebar {
  position: sticky;
  top: 0;
  align-self: start;
  height: 100vh;
  display: flex;
  flex-direction: column;
  gap: 24px;
  padding: 24px 16px;
  background: var(--sidebar);
  backdrop-filter: saturate(180%) blur(20px);
  -webkit-backdrop-filter: saturate(180%) blur(20px);
  border-right: 1px solid var(--border-soft);
}

.brand { display: flex; flex-direction: column; gap: 2px; padding: 0 8px; }
.brand b { font-size: 16px; line-height: 24px; font-weight: 600; letter-spacing: -0.01em; }
.brand span {
  font-size: 10px; line-height: 14px; font-weight: 500;   /* overline */
  letter-spacing: 0.08em; text-transform: uppercase; color: var(--text-muted);
}

.nav { display: flex; flex-direction: column; gap: 2px; }

.nav button {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 7px 8px;
  border: 0;
  border-radius: 7px;
  background: transparent;
  color: var(--text-secondary);
  font: inherit;
  font-size: 14px; line-height: 20px; font-weight: 500;
  text-align: left;
  cursor: pointer;
  transition: background-color 0.12s ease, color 0.12s ease;
}

.nav button:hover { background: var(--surface-muted); color: var(--text); }

.nav button[aria-selected="true"] {
  background: var(--surface-accent);
  color: var(--primary-strong);
  font-weight: 600;   /* label-md */
}

.nav button:focus-visible { outline: 2px solid var(--primary); outline-offset: 1px; }

.dot { width: 7px; height: 7px; border-radius: 50%; flex: none; background: var(--idle); }
.dot.ok { background: var(--ok); }
.dot.warn { background: var(--warn); }
.dot.bad { background: var(--bad); }

.sidebar-foot {
  margin-top: auto;
  padding: 0 8px;
  font-size: 12px; line-height: 16px;   /* caption */
  color: var(--text-muted);
  display: flex; flex-direction: column; gap: 2px;
}

/* 본문은 읽기 좋은 폭에서 멈춘다 — 넓은 화면에서 표가 끝없이 늘어나지 않게. */
main { min-width: 0; padding: 24px clamp(16px, 4vw, 40px) 64px; }
main > * { max-width: 1120px; }

.topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
  padding-bottom: 20px;
  margin-bottom: 24px;
  border-bottom: 1px solid var(--border-soft);
}

.topbar h1 {
  margin: 0;
  font-size: 24px; line-height: 32px; font-weight: 600;   /* heading-sm */
  letter-spacing: -0.02em;
}

.status-pill {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 5px 12px 5px 10px;
  border-radius: 999px;
  border: 1px solid var(--border);
  background: var(--surface);
  font-size: 12px; line-height: 18px; font-weight: 600;   /* label-sm */
  box-shadow: var(--shadow);
}

/* ── 개요 타일 ── */
.tiles {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 12px;
  margin-bottom: 32px;
}

.tile {
  background: var(--surface);
  border: 1px solid var(--border-soft);
  border-radius: 12px;
  padding: 16px;
  box-shadow: var(--shadow);
  display: flex; flex-direction: column; gap: 4px;
  min-width: 0;
}

.tile-label {
  margin: 0;
  font-size: 12px; line-height: 18px; font-weight: 600;   /* label-sm */
  color: var(--text-secondary);
}

.tile-value {
  margin: 0;
  font-size: 32px; line-height: 40px; font-weight: 600;   /* heading-lg 크기 */
  letter-spacing: -0.03em;
  font-variant-numeric: tabular-nums;
}

.tile-unit { font-size: 18px; font-weight: 500; margin-left: 2px; color: var(--text-secondary); }
.tile-sub { margin: 0; font-size: 12px; line-height: 16px; color: var(--text-muted); }

.tile.ok .tile-value { color: var(--ok); }
.tile.bad .tile-value { color: var(--bad); }
.tile.warn .tile-value { color: var(--warn); }
.tile.idle .tile-value { color: var(--text-muted); }

/* ── 블록 / 목록 ── */
.block { display: flex; flex-direction: column; gap: 12px; }

.block-title {
  margin: 0;
  font-size: 10px; line-height: 14px; font-weight: 500;   /* overline */
  letter-spacing: 0.08em; text-transform: uppercase;
  color: var(--text-muted);
}

.events {
  margin: 0; padding: 0; list-style: none;
  background: var(--surface);
  border: 1px solid var(--border-soft);
  border-radius: 12px;
  box-shadow: var(--shadow);
  overflow: hidden;
}

.events li {
  display: grid;
  grid-template-columns: 104px 132px 1fr;
  gap: 12px;
  align-items: baseline;
  padding: 11px 16px;
  border-top: 1px solid var(--border-soft);
}

.events li:first-child { border-top: 0; }

.event-time { font-family: SFMono-Regular, Menlo, monospace; font-size: 12px; color: var(--text-muted); }
.event-key { font-weight: 600; font-size: 13px; }
.event-note { color: var(--text-secondary); min-width: 0; overflow-wrap: anywhere; }

.empty {
  margin: 0;
  padding: 20px 0 4px;
  color: var(--text-muted);
  font-size: 13px;
}

/* ── 상세 행 ── */
.rows { display: flex; flex-direction: column; gap: 12px; }

.row {
  background: var(--surface);
  border: 1px solid var(--border-soft);
  border-radius: 12px;
  padding: 18px 20px;
  box-shadow: var(--shadow);
  display: flex; flex-direction: column; gap: 14px;
  min-width: 0;
}

.row.idle { background: var(--surface-muted); box-shadow: none; }

.row-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; }
.row-title { margin: 0 0 2px; font-size: 16px; line-height: 24px; font-weight: 600; letter-spacing: -0.01em; }
.row-url { font-size: 12px; color: var(--text-muted); overflow-wrap: anywhere; }

.badge {
  flex: none;
  padding: 3px 10px;
  border-radius: 999px;
  font-size: 12px; line-height: 18px; font-weight: 600;   /* label-sm */
  background: var(--idle-weak); color: var(--text-muted);
}
.badge.ok { background: var(--ok-weak); color: var(--ok); }
.badge.warn { background: var(--warn-weak); color: var(--warn); }
.badge.bad { background: var(--bad-weak); color: var(--bad); }

.bars { display: flex; gap: 2px; height: 32px; align-items: stretch; }
.bars i { flex: 1; border-radius: 2px; background: var(--idle-weak); }
.bars i.ok { background: var(--ok); opacity: 0.85; }
.bars i.bad { background: var(--bad); }

.metrics { display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 12px; margin: 0; }
.metrics div { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
.metrics dt { font-size: 12px; line-height: 16px; color: var(--text-muted); }
.metrics dd {
  margin: 0;
  font-size: 15px; line-height: 22px; font-weight: 600;
  font-variant-numeric: tabular-nums;
  letter-spacing: -0.01em;
  overflow-wrap: anywhere;
}

.fails {
  margin: 0; padding: 12px 0 0; list-style: none;
  border-top: 1px solid var(--border-soft);
  display: flex; flex-direction: column; gap: 8px;
}

.fails li { display: grid; grid-template-columns: 104px 1fr; gap: 12px; align-items: baseline; font-size: 13px; }
.fail-key { font-family: SFMono-Regular, Menlo, monospace; font-size: 12px; color: var(--bad); font-weight: 600; }
.fail-note { color: var(--text-secondary); overflow-wrap: anywhere; }
.fails .fail-more { display: block; color: var(--text-muted); font-size: 12px; }

footer {
  margin-top: 40px;
  padding-top: 16px;
  border-top: 1px solid var(--border-soft);
  font-size: 12px; line-height: 18px;
  color: var(--text-muted);
}

footer code { font-size: 11px; }

[hidden] { display: none !important; }

/* ── 좁은 화면: 사이드바를 상단 탭 바로 ── */
@media (max-width: 720px) {
  .app { grid-template-columns: 1fr; }
  .sidebar {
    position: static; height: auto;
    flex-direction: row; align-items: center; gap: 12px;
    padding: 12px 16px;
    border-right: 0; border-bottom: 1px solid var(--border-soft);
    overflow-x: auto;
  }
  .brand { display: none; }
  .nav { flex-direction: row; gap: 4px; }
  .nav button { white-space: nowrap; }
  .sidebar-foot { display: none; }
  .events li { grid-template-columns: 1fr; gap: 2px; }
  .fails li { grid-template-columns: 1fr; gap: 2px; }
  .topbar h1 { font-size: 20px; line-height: 28px; }
}

@media (prefers-reduced-motion: reduce) {
  * { transition: none !important; }
}
</style>
</head>
<body>
<div class="app">
  <aside class="sidebar">
    <div class="brand">
      <b>afterglow</b>
      <span>상태판</span>
    </div>

    <nav class="nav" role="tablist" aria-label="상태 영역">
${NAV.map(
  (
    item,
    index,
  ) => `      <button role="tab" id="tab-${item.id}" data-panel="${item.id}"
        aria-controls="panel-${item.id}" aria-selected="${index === 0}">
        <span class="dot ${tones[item.id]}"></span>${item.label}
      </button>`,
).join("\n")}
    </nav>

    <div class="sidebar-foot">
      <span>갱신 ${escape(KST.format(new Date(now)))}</span>
      <span>30분마다 자동 점검</span>
    </div>
  </aside>

  <main>
    <div class="topbar">
      <h1 id="page-title">${titles.overview}</h1>
      <span class="status-pill"><span class="dot ${allOk ? "ok" : "bad"}"></span>${headline}</span>
    </div>

${NAV.map(
  (
    item,
    index,
  ) => `    <section role="tabpanel" id="panel-${item.id}" aria-labelledby="tab-${item.id}"${
    index === 0 ? "" : " hidden"
  }>${panels[item.id]}
    </section>`,
).join("\n")}

    <footer>
      이 페이지는 <code>.github/workflows/health.yml</code>이 남긴 기록을 구운 정적 문서입니다.
      갱신 시각이 30분 넘게 멈춰 있으면 서버가 아니라 <b>워크플로가 멈춘 것</b>입니다
      (스케줄 워크플로는 저장소가 60일간 조용하면 GitHub이 자동 비활성화합니다).
    </footer>
  </main>
</div>

<script>
  // 탭 전환. 페이지는 JS 없이도 개요 패널이 보이는 상태로 그려진다.
  var titles = ${JSON.stringify(titles)};
  var tabs = document.querySelectorAll('.nav button');
  var title = document.getElementById('page-title');

  function select(id) {
    tabs.forEach(function (tab) {
      var on = tab.dataset.panel === id;
      tab.setAttribute('aria-selected', String(on));
      document.getElementById('panel-' + tab.dataset.panel).hidden = !on;
    });
    title.textContent = titles[id];
    try { localStorage.setItem('afterglow-status-tab', id); } catch (e) {}
  }

  tabs.forEach(function (tab) {
    tab.addEventListener('click', function () { select(tab.dataset.panel); });
  });

  // 5분마다 새로고침되므로, 보던 탭을 기억해 되돌려 놓는다.
  try {
    var saved = localStorage.getItem('afterglow-status-tab');
    if (saved && titles[saved]) select(saved);
  } catch (e) {}
</script>
</body>
</html>
`;
}

async function readJson(file) {
  try {
    return JSON.parse(await readFile(file, "utf8"));
  } catch {
    return null; // 아직 그 단계가 붙지 않았으면 카드는 "준비 중"으로 남는다.
  }
}

async function readHistory(dataDir) {
  const dir = join(dataDir, "health");
  let files = [];
  try {
    files = (await readdir(dir)).filter((name) => name.endsWith(".jsonl"));
  } catch {
    return [];
  }
  const chunks = await Promise.all(
    files.map(async (name) =>
      parseHistory(await readFile(join(dir, name), "utf8")),
    ),
  );
  return chunks.flat();
}

function parseArguments(argv) {
  const options = { data: null, out: null };
  for (let i = 0; i < argv.length; i += 2) {
    const [flag, value] = [argv[i], argv[i + 1]];
    if (flag === "--data") options.data = value;
    else if (flag === "--out") options.out = value;
    else throw new Error(`알 수 없는 옵션: ${flag}`);
  }
  if (!options.data || !options.out) {
    throw new Error("사용법: --data <status-data 디렉터리> --out <index.html>");
  }
  return options;
}

async function main() {
  const options = parseArguments(process.argv.slice(2));
  const dataDir = resolve(options.data);
  const now = Date.now();

  const html = renderStatusPage({
    probes: summarizeHealth(await readHistory(dataDir), { now }),
    e2e: await readJson(join(dataDir, "e2e", "latest.json")),
    sentry: await readJson(join(dataDir, "sentry", "latest.json")),
    now,
  });

  const out = resolve(options.out);
  await mkdir(dirname(out), { recursive: true });
  await writeFile(out, html, "utf8");
  console.log(`상태 페이지 생성: ${out}`);
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
) {
  await main();
}
