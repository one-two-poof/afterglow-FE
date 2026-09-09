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
 * 이 시간이 지나도록 새 기록이 없으면 "점검 중단"으로 본다(점검 주기 30분 × 3회 누락).
 *
 * 왜 필요한가: 점검이 멈추면 마지막 기록이 성공이었다는 이유로 화면이 계속 "정상"을
 * 띄운다. 서버가 멀쩡한 것과 감시가 멈춘 것은 전혀 다른 상태인데 구분되지 않는다.
 * GitHub Actions의 schedule은 부하가 높으면 지연되거나 통째로 누락되므로 실제로 자주 겪는다.
 */
export const STALE_AFTER_MS = 90 * 60 * 1000;
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
      // 마지막 기록이 너무 오래됐으면 지금 상태를 안다고 할 수 없다.
      // 기록이 아예 없는 경우(새로 추가한 프로브)는 stale이 아니라 "대기 중"이다 —
      // 한 번도 돈 적 없는 것과 돌다가 멈춘 것은 다른 사건이다.
      stale:
        mine.length > 0 && now - Date.parse(mine.at(-1).ts) > STALE_AFTER_MS,
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

/**
 * 표에 들어갈 짧은 시각(09.09 18:15). 한국어 "오전/오후"가 붙은 긴 형식은
 * 좁은 열에서 두 줄로 깨진다 — 목록은 정렬이 읽기를 좌우하므로 폭을 고정한다.
 *
 * 로케일 출력을 문자열 치환으로 다듬으면 구분자까지 뭉개지므로("09. 09. 18:15"
 * → "09.09.18:15") 파트로 받아 직접 조립한다.
 */
const KST_SHORT = new Intl.DateTimeFormat("ko-KR", {
  timeZone: "Asia/Seoul",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

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
  // 낡은 기록으로 "정상"을 말하면 안 된다 — 지금 상태는 모르는 것이다.
  if (probe.stale) return { text: "점검 중단", tone: "warn" };
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

/**
 * 여러 상태 중 가장 나쁜 것을 고른다. 나쁜 소식이 좋은 소식에 가려지면 안 된다.
 * idle(데이터 없음)은 ok보다 나쁘게 본다 — "모름"을 "정상"으로 보이면 안 되므로.
 */
export function worstTone(tones) {
  const order = ["bad", "warn", "idle", "ok"];
  return order.find((tone) => tones.includes(tone)) ?? "idle";
}

/** 24시간 30분 단위 상태 띠. 값이 없는 구간은 옅게 남겨 공백을 드러낸다. */
const renderBars = (buckets) => `
            <div class="bars" role="img" aria-label="최근 24시간 30분 단위 상태">
              ${buckets.map((bucket) => `<i class="${bucket}"></i>`).join("")}
            </div>`;

/** 표 안에 접어 넣는 실패 목록. 상한을 넘으면 남은 건수만 알린다. */
const renderFailureRows = (items, columns) =>
  items.length === 0
    ? ""
    : `
          <tr class="fail-row">
            <td colspan="${columns}">
              <ul class="fails">
                ${items
                  .slice(0, MAX_LISTED_FAILURES)
                  .map(
                    (item) =>
                      `<li><span class="fail-key">${escape(item.key)}</span><span class="fail-note">${escape(item.note)}</span></li>`,
                  )
                  .join("\n                ")}${
                  items.length > MAX_LISTED_FAILURES
                    ? `\n                <li class="fail-more">외 ${items.length - MAX_LISTED_FAILURES}건 — 아티팩트의 리포트 참고</li>`
                    : ""
                }
              </ul>
            </td>
          </tr>`;

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

  const stale = probes.some((probe) => probe.stale);

  const stats = [
    {
      label: "백엔드 가용률",
      value: uptime === null ? "—" : `${uptime.toFixed(1)}%`,
      sub: stale
        ? "점검이 멈춰 값이 낡았습니다"
        : `24시간 · 프로브 ${probes.length}종`,
      // 점검이 멈춘 동안의 수치를 초록으로 칠하면 "정상"으로 읽힌다.
      tone: stale
        ? "idle"
        : down.length > 0
          ? "bad"
          : uptime === null
            ? "idle"
            : "ok",
    },
    {
      label: "E2E",
      value: e2e ? `${e2e.passed}/${e2e.total}` : "—",
      sub: e2e ? `${relative(e2e.ts, now)} 실행` : "Maestro CI 연결 전",
      tone: e2eTone(e2e).tone,
    },
    {
      label: "앱 에러",
      value: sentry ? String(sentry.count24h) : "—",
      sub: sentry ? `24시간 · ${relative(sentry.ts, now)}` : "Sentry 연결 전",
      tone: sentryTone(sentry).tone,
    },
  ];

  return `
      <div class="stats">
${stats
  .map(
    (stat) => `        <div class="stat">
          <p class="stat-label">${escape(stat.label)}</p>
          <p class="stat-value ${stat.tone}">${escape(stat.value)}</p>
          <p class="stat-sub">${escape(stat.sub)}</p>
        </div>`,
  )
  .join("\n")}
      </div>

      <h2 class="section">최근 이벤트</h2>
      ${
        events.length === 0
          ? `<p class="empty">최근 24시간 동안 기록된 실패가 없습니다.</p>`
          : `<div class="card"><table class="grid">
        <thead>
          <tr><th class="col-time">시각</th><th class="col-key">대상</th><th>내용</th></tr>
        </thead>
        <tbody>
${events
  .map(
    (event) => `          <tr>
            <td class="mono muted"><span class="event-time">${escape(formatShort(event.ts))}</span></td>
            <td class="strong">${escape(event.key)}</td>
            <td>${escape(event.note)}</td>
          </tr>`,
  )
  .join("\n")}
        </tbody>
      </table></div>`
      }`;
}

function renderBackend(probes, now) {
  return `
      <div class="card"><table class="grid">
        <thead>
          <tr>
            <th>서비스</th>
            <th class="right">24시간 가용률</th>
            <th class="right">중간 응답</th>
            <th class="right">표본</th>
            <th class="right">마지막 응답</th>
            <th class="right">상태</th>
          </tr>
        </thead>
        <tbody>
${probes
  .map((probe) => {
    const state = probeTone(probe);
    return `          <tr>
            <td class="strong">${escape(probe.label)}</td>
            <td class="right mono">${probe.uptime === null ? "—" : `${probe.uptime.toFixed(1)}%`}</td>
            <td class="right mono">${probe.medianMs === null ? "—" : `${probe.medianMs}ms`}</td>
            <td class="right mono muted">${probe.samples}</td>
            <td class="right mono muted">${
              probe.latest
                ? `${probe.latest.status} · ${relative(probe.latest.ts, now)}`
                : "—"
            }</td>
            <td class="right"><span class="state ${state.tone}">${state.text}</span></td>
          </tr>
          <tr class="bar-row">
            <td colspan="6">${renderBars(probe.buckets)}
            </td>
          </tr>${renderFailureRows(
            probe.failures.map((failure) => ({
              key: formatShort(failure.ts),
              note: failure.note || `상태코드 ${failure.status}`,
            })),
            6,
          )}`;
  })
  .join("\n")}
        </tbody>
      </table></div>`;
}

function renderE2E(e2e, now) {
  if (!e2e) {
    return `
      <div class="card"><p class="empty">E2E 워크플로가 아직 결과를 남기지 않았습니다. Actions에서 한 번 실행하면 채워집니다.</p></div>`;
  }

  const failed = e2e.failed ?? [];
  const state = e2eTone(e2e);
  return `
      <div class="card"><table class="grid">
        <thead>
          <tr>
            <th>플로우</th>
            <th class="right">통과</th>
            <th class="right">실패</th>
            <th class="right">실행 시각</th>
            <th class="right">상태</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td class="strong">Maestro</td>
            <td class="right mono">${e2e.passed}/${e2e.total}</td>
            <td class="right mono">${failed.length}</td>
            <td class="right mono muted">${escape(formatShort(e2e.ts))} · ${relative(e2e.ts, now)}</td>
            <td class="right"><span class="state ${state.tone}">${state.text}</span></td>
          </tr>${renderFailureRows(
            failed.map((flow) => ({
              key: flow.name,
              note: flow.step ?? "실패",
            })),
            5,
          )}
        </tbody>
      </table></div>`;
}

function renderSentry(sentry, now) {
  if (!sentry) {
    return `
      <div class="card"><p class="empty">DSN과 수집 Secrets가 설정되면 24시간 이벤트 수가 표시됩니다.</p></div>`;
  }

  const state = sentryTone(sentry);
  const issues = sentry.issues ?? [];
  return `
      <div class="card"><table class="grid">
        <thead>
          <tr>
            <th>수집</th>
            <th class="right">24시간 이벤트</th>
            <th class="right">미해결 이슈</th>
            <th class="right">수집 시각</th>
            <th class="right">상태</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td class="strong">Sentry</td>
            <td class="right mono">${sentry.count24h}</td>
            <td class="right mono">${issues.length}</td>
            <td class="right mono muted">${escape(formatShort(sentry.ts))} · ${relative(sentry.ts, now)}</td>
            <td class="right"><span class="state ${state.tone}">${state.text}</span></td>
          </tr>${renderFailureRows(
            issues.map((issue) => ({
              key: `${issue.count}회`,
              note: issue.title,
            })),
            5,
          )}
        </tbody>
      </table></div>`;
}

/** 사이드바 항목. 각 탭 옆의 점이 그 영역의 상태를 그대로 말한다. */
const NAV = [
  { id: "overview", label: "개요" },
  { id: "detail", label: "상세" },
];

/** 상세 탭 안의 구역. 셋을 한 탭에 쌓되 각자 제목과 상태를 유지한다. */
const renderSection = (label, state, body) => `
      <div class="section-head">
        <h2 class="section">${label}</h2>
        <span class="state ${state.tone}">${state.text}</span>
      </div>${body}`;

export function renderStatusPage({
  probes,
  e2e = null,
  sentry = null,
  now = Date.now(),
}) {
  const down = probes.filter((probe) => probe.latest?.ok === false);
  const allOk = down.length === 0;

  // 점검이 멈췄으면 그것이 지금 가장 중요한 사실이다 — 서버 상태보다 먼저 말한다.
  const stale = probes.some((probe) => probe.stale);
  const lastCheck = probes
    .map((probe) => probe.latest?.ts)
    .filter(Boolean)
    .sort()
    .at(-1);

  const headline = stale
    ? "점검 중단"
    : allOk
      ? "백엔드 정상"
      : `이상 ${down.length}건`;
  const headlineTone = stale ? "warn" : allOk ? "ok" : "bad";

  const backendTone = stale ? "warn" : allOk ? "ok" : "bad";
  const tones = {
    // 개요는 전체를 대표한다 — 아래 셋 중 가장 나쁜 상태를 그대로 올린다.
    // (백엔드만 보고 초록을 띄우면 E2E가 깨져 있어도 사이드바가 조용하다)
    overview: worstTone([
      backendTone,
      e2eTone(e2e).tone,
      sentryTone(sentry).tone,
    ]),
    // 상세는 세 구역을 함께 담으므로 그중 가장 나쁜 상태를 대표한다.
    detail: worstTone([
      backendTone,
      e2eTone(e2e).tone,
      sentryTone(sentry).tone,
    ]),
  };

  const panels = {
    overview: renderOverview({ probes, e2e, sentry, now }),
    detail: [
      renderSection(
        "백엔드",
        { text: allOk ? "정상" : `이상 ${down.length}건`, tone: backendTone },
        renderBackend(probes, now),
      ),
      renderSection("E2E", e2eTone(e2e), renderE2E(e2e, now)),
      renderSection("앱 에러", sentryTone(sentry), renderSentry(sentry, now)),
    ].join("\n"),
  };

  const titles = {
    overview: "개요",
    detail: "상세",
  };

  return `<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light">
<!-- 열어둔 탭이 낡지 않도록 5분마다 새로 받는다. -->
<meta http-equiv="refresh" content="300">
<title>Afterglow 상태</title>
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css">
<style>
/*
 * 색은 packages/tokens/src/index.ts 의 시맨틱 토큰을 그대로 옮겼다. 라이트 전용.
 *
 * 색 사용 규칙:
 * - 화면의 색 축은 primary(파랑). 선택된 탭, 알림 줄, 링크 등 UI 요소가 쓴다.
 * - 초록/빨강은 성공·실패 값에만 쓴다(가용률, 통과 수, 실패 시각·건수, 상태 단어).
 *   그 밖의 요소가 초록·빨강을 쓰면 정작 봐야 할 수치가 묻힌다.
 */
:root {
  --paper: #ffffff;        /* surface */
  --wash: #f7f8f8;         /* bg */
  --wash-2: #f2f4f6;       /* surface-muted */
  --rule: #e6eaf0;         /* neutral-200 */
  --rule-strong: #d4dce5;  /* border */
  --ink: #171c21;          /* text */
  --ink-2: #3f4b58;        /* text-secondary */
  --ink-3: #8894a6;        /* text-muted */
  --primary: #0787d0;      /* primary-600 */
  --primary-deep: #00689a; /* primary-700 */
  --primary-wash: #f0faff; /* primary-50 / surface-accent */
  --primary-edge: #b6e8ff; /* primary-200 / border-accent */
  --ok: #1f9d55;           /* success-700 — 성공 수치 전용 */
  --bad: #c62828;          /* error-700 — 실패 수치 전용 */
  --shadow: 0 1px 2px rgba(23, 28, 33, 0.05);
}

* { box-sizing: border-box; }

body {
  margin: 0;
  background: var(--paper);
  color: var(--ink);
  /* fontFamily.sans = Pretendard */
  font-family: "Pretendard Variable", Pretendard, -apple-system,
    BlinkMacSystemFont, "Apple SD Gothic Neo", system-ui, sans-serif;
  font-size: 14px;   /* body-sm */
  line-height: 20px;
  -webkit-font-smoothing: antialiased;
  word-break: keep-all;
}

.mono {
  font-family: SFMono-Regular, Menlo, monospace;   /* fontFamily.mono */
  font-variant-numeric: tabular-nums;
}

.app { display: grid; grid-template-columns: 216px 1fr; min-height: 100vh; }

/* ── 사이드바 ── */
.sidebar {
  position: sticky;
  top: 0;
  align-self: start;
  height: 100vh;
  display: flex;
  flex-direction: column;
  gap: 26px;
  padding: 26px 16px;
  border-right: 1px solid var(--rule);
}

.brand { display: flex; flex-direction: column; gap: 1px; padding: 0 8px; }
.brand b { font-size: 15px; line-height: 22px; font-weight: 600; letter-spacing: -0.01em; }
.brand span {
  font-size: 10px; line-height: 14px; font-weight: 500;   /* overline */
  letter-spacing: 0.08em; text-transform: uppercase; color: var(--ink-3);
}

.nav { display: flex; flex-direction: column; gap: 2px; }

.nav button {
  display: flex;
  align-items: center;
  gap: 9px;
  width: 100%;
  padding: 8px;
  border: 0;
  border-radius: 8px;
  background: none;
  color: var(--ink-2);
  font: inherit;
  font-size: 14px; line-height: 20px;
  text-align: left;
  cursor: pointer;
  transition: background-color 0.12s ease, color 0.12s ease;
}

.nav button:hover { background: var(--wash-2); color: var(--ink); }

/* 선택 상태는 primary로. 상태색(초록·빨강)은 수치 몫이라 여기 쓰지 않는다. */
.nav button[aria-selected="true"] {
  background: var(--primary-wash);
  color: var(--primary-deep);
  font-weight: 600;   /* label-md */
}

.nav button:focus-visible { outline: 2px solid var(--primary); outline-offset: 1px; }

.dot { width: 7px; height: 7px; border-radius: 50%; flex: none; background: var(--rule-strong); }
.dot.ok { background: var(--ok); }
.dot.bad { background: var(--bad); }

.stamp {
  margin-top: auto;
  padding: 0 8px;
  font-size: 12px; line-height: 18px;
  color: var(--ink-3);
  display: flex; flex-direction: column; gap: 1px;
}

.stamp b {
  color: var(--ink-2);
  font-weight: 600;
  font-family: SFMono-Regular, Menlo, monospace;
  font-variant-numeric: tabular-nums;
}

/* ── 본문 ── */
main { min-width: 0; padding: 26px clamp(16px, 3.5vw, 36px) 72px; background: var(--wash); }
main > * { max-width: 1080px; }

.topbar {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
  margin-bottom: 22px;
}

.topbar h1 {
  margin: 0;
  font-size: 24px; line-height: 32px; font-weight: 600;   /* heading-sm */
  letter-spacing: -0.02em;
}

.headline { display: inline-flex; align-items: center; gap: 7px; font-size: 13px; font-weight: 600; }

/* 알림은 경보가 아니라 안내다 — 색 축인 primary를 쓴다. */
.notice {
  margin: 0 0 20px;
  padding: 12px 16px;
  border: 1px solid var(--primary-edge);
  border-radius: 10px;
  background: var(--primary-wash);
  color: var(--ink-2);
  font-size: 13px; line-height: 20px;
  box-shadow: var(--shadow);
}

.notice b { color: var(--primary-deep); }

/* ── 카드 ── */
.card {
  background: var(--paper);
  border: 1px solid var(--rule);
  border-radius: 10px;
  box-shadow: var(--shadow);
  padding: 6px 18px;
  overflow-x: auto;
}

.stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 12px;
  margin-bottom: 30px;
}

.stat {
  background: var(--paper);
  border: 1px solid var(--rule);
  border-radius: 10px;
  box-shadow: var(--shadow);
  padding: 16px 18px;
  min-width: 0;
}

.stat-label {
  margin: 0 0 8px;
  font-size: 10px; line-height: 14px; font-weight: 500;   /* overline */
  letter-spacing: 0.08em; text-transform: uppercase; color: var(--ink-3);
}

/* 성공·실패 값에만 초록·빨강을 쓴다. 그 외 상태는 회색으로 둔다. */
.stat-value {
  margin: 0;
  font-family: SFMono-Regular, Menlo, monospace;
  font-size: 30px; line-height: 38px; font-weight: 600;
  letter-spacing: -0.02em;
  font-variant-numeric: tabular-nums;
  color: var(--ink);
}

.stat-value.ok { color: var(--ok); }
.stat-value.bad { color: var(--bad); }
.stat-value.warn, .stat-value.idle { color: var(--ink-3); }

.stat-sub { margin: 4px 0 0; font-size: 12px; line-height: 16px; color: var(--ink-3); }

.section {
  margin: 0 0 10px;
  font-size: 10px; line-height: 14px; font-weight: 500;   /* overline */
  letter-spacing: 0.08em; text-transform: uppercase; color: var(--ink-3);
}

.section-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
  margin: 30px 0 10px;
}

.section-head:first-child { margin-top: 0; }
.section-head .section { margin: 0; }

/* ── 표: 카드 안에서 촘촘하게 ── */
.grid { width: 100%; border-collapse: collapse; }

.grid th {
  text-align: left;
  padding: 12px 12px 8px 0;
  border-bottom: 1px solid var(--rule);
  font-size: 11px; line-height: 16px; font-weight: 600;
  letter-spacing: 0.04em;
  color: var(--ink-3);
  white-space: nowrap;
}

.grid td {
  padding: 11px 12px 11px 0;
  border-bottom: 1px solid var(--rule);
  vertical-align: baseline;
  color: var(--ink-2);
}

.grid tr:last-child td { border-bottom: 0; }
.grid th:last-child, .grid td:last-child { padding-right: 0; }
.grid .right { text-align: right; }
.grid .strong { color: var(--ink); font-weight: 600; }
.grid .muted { color: var(--ink-3); }
.grid .col-time { width: 112px; }
.grid .col-key { width: 148px; }

/* 상태 띠와 실패 목록은 같은 행에 딸린 정보라 위 경계선을 지운다. */
.grid .bar-row td { border-bottom: 0; padding: 0 0 10px; }
.grid .fail-row td { padding: 0 0 14px; }

.state { font-size: 12px; line-height: 18px; font-weight: 600; color: var(--ink-3); }
.state.ok { color: var(--ok); }
.state.bad { color: var(--bad); }

/*
 * 가동 띠: 정상 구간을 색으로 칠하면 화면에서 가장 큰 요소가 아무 정보도 없는 띠가
 * 되고 정작 빨간 실패 칸이 묻힌다. 정상은 회색, 실패에만 색.
 */
.bars { display: flex; gap: 1px; height: 14px; align-items: stretch; }
.bars i { flex: 1; background: var(--wash-2); }   /* 기록 없음 */
.bars i.ok { background: var(--rule-strong); }
.bars i.bad { background: var(--bad); }

/*
 * 목록 전체를 하나의 그리드로 둔다(li는 display:contents). 각 li를 개별 그리드로
 * 만들면 행마다 열이 따로 놀아서, 키가 고정폭을 넘는 순간 설명과 붙어버린다.
 */
.fails {
  margin: 0;
  padding: 0;
  list-style: none;
  display: grid;
  grid-template-columns: max-content 1fr;
  column-gap: 14px;
  row-gap: 5px;
  align-items: baseline;
  font-size: 13px;
}

.fails li { display: contents; }
.fails .fail-more { grid-column: 1 / -1; color: var(--ink-3); font-size: 12px; }

.fail-key {
  font-family: SFMono-Regular, Menlo, monospace;
  font-size: 12px; font-weight: 600; color: var(--bad);
}

.fail-note { color: var(--ink-2); overflow-wrap: anywhere; }

.empty { margin: 0; padding: 14px 0; color: var(--ink-3); font-size: 13px; }

[hidden] { display: none !important; }

@media (max-width: 720px) {
  .app { grid-template-columns: 1fr; }
  .sidebar {
    position: static; height: auto;
    flex-direction: row; align-items: center; gap: 12px;
    padding: 12px 16px;
    border-right: 0; border-bottom: 1px solid var(--rule);
    overflow-x: auto;
  }
  .brand, .stamp { display: none; }
  .nav { flex-direction: row; gap: 4px; }
  .nav button { white-space: nowrap; width: auto; padding: 6px 10px; }
  .stats { grid-template-columns: 1fr; }
  .card { padding: 6px 14px; }
  .grid, .grid thead, .grid tbody, .grid tr, .grid td { display: block; }
  .grid thead { display: none; }
  .grid td { border-bottom: 0; padding: 2px 0; }
  .grid tr { border-bottom: 1px solid var(--rule); padding: 10px 0; }
  .grid tr:last-child { border-bottom: 0; }
  .grid .right { text-align: left; }
  .fails { grid-template-columns: 1fr; row-gap: 2px; }
  .fails li { display: block; }
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

    <p class="stamp">
      <span>페이지 갱신 <b>${escape(formatShort(new Date(now).toISOString()))}</b></span>
      <span>마지막 점검 <b>${lastCheck ? escape(formatShort(lastCheck)) : "없음"}</b></span>
    </p>
  </aside>

  <main>
    <div class="topbar">
      <h1 id="page-title">${titles.overview}</h1>
      <span class="headline"><span class="dot ${headlineTone}"></span>${headline}</span>
    </div>
${
  stale
    ? `    <p class="notice">
      <b>자동 점검이 멈춰 있습니다.</b>
      마지막 점검 ${escape(formatShort(lastCheck))} (${relative(lastCheck, now)}).
      아래 수치는 모두 그 시점 기준이며, 지금 서버 상태를 뜻하지 않습니다.
    </p>
`
    : ""
}
${NAV.map(
  (
    item,
    index,
  ) => `    <section role="tabpanel" id="panel-${item.id}" aria-labelledby="tab-${item.id}"${
    index === 0 ? "" : " hidden"
  }>${panels[item.id]}
    </section>`,
).join("\n")}
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
