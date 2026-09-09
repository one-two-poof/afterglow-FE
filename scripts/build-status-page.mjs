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
        .slice(-5)
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

const relative = (iso, now) => {
  if (!iso) return "";
  const minutes = Math.round((now - Date.parse(iso)) / 60_000);
  if (minutes < 1) return "방금";
  if (minutes < 60) return `${minutes}분 전`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}시간 전`;
  return `${Math.round(hours / 24)}일 전`;
};

const statusWord = (probe) => {
  if (!probe.latest) return { text: "대기 중", tone: "none" };
  return probe.latest.ok
    ? { text: "정상", tone: "ok" }
    : { text: "이상", tone: "bad" };
};

function renderProbeCard(probe, now) {
  const state = statusWord(probe);
  const uptime = probe.uptime === null ? "—" : `${probe.uptime.toFixed(1)}%`;
  const latency = probe.medianMs === null ? "—" : `${probe.medianMs}ms`;

  return `
      <article class="card ${state.tone}">
        <header>
          <span class="label">${escape(probe.label)}</span>
          <span class="state ${state.tone}">${state.text}</span>
        </header>
        <p class="value">${uptime}</p>
        <p class="sub">24시간 가용률 · 중간 응답 ${latency} · 표본 ${probe.samples}건</p>
        <div class="bars" role="img" aria-label="최근 24시간 30분 단위 상태">
          ${probe.buckets.map((bucket) => `<i class="${bucket}"></i>`).join("")}
        </div>
        <p class="foot">
          <code>${escape(probe.url.replace(/^https?:\/\//, ""))}</code>
          <span>${probe.latest ? `${probe.latest.status} · ${relative(probe.latest.ts, now)}` : "—"}</span>
        </p>
        ${
          probe.failures.length > 0
            ? `<ul class="fails">${probe.failures
                .map(
                  (failure) =>
                    `<li><b>${escape(formatTime(failure.ts))}</b> ${escape(failure.note || `상태코드 ${failure.status}`)}</li>`,
                )
                .join("")}</ul>`
            : ""
        }
      </article>`;
}

function renderE2E(e2e, now) {
  if (!e2e) {
    return `
      <article class="card none pending">
        <header><span class="label">E2E</span><span class="state none">준비 중</span></header>
        <p class="value">—</p>
        <p class="sub">Maestro CI 워크플로가 붙으면 여기에 표시된다</p>
      </article>`;
  }
  const failed = e2e.failed ?? [];
  const tone = failed.length > 0 ? "bad" : "ok";
  return `
      <article class="card ${tone}">
        <header>
          <span class="label">E2E</span>
          <span class="state ${tone}">${failed.length > 0 ? "실패" : "통과"}</span>
        </header>
        <p class="value">${e2e.passed}/${e2e.total}</p>
        <p class="sub">${escape(formatTime(e2e.ts))} · ${relative(e2e.ts, now)}</p>
        ${
          failed.length > 0
            ? `<ul class="fails">${failed
                .map(
                  (flow) =>
                    `<li><b>${escape(flow.name)}</b> ${escape(flow.step ?? "")}</li>`,
                )
                .join("")}</ul>`
            : ""
        }
      </article>`;
}

function renderSentry(sentry, now) {
  if (!sentry) {
    return `
      <article class="card none pending">
        <header><span class="label">앱 에러</span><span class="state none">준비 중</span></header>
        <p class="value">—</p>
        <p class="sub">Sentry 연동 후 24시간 이벤트 수가 표시된다</p>
      </article>`;
  }
  const tone = sentry.count24h > 0 ? "warn" : "ok";
  return `
      <article class="card ${tone}">
        <header>
          <span class="label">앱 에러</span>
          <span class="state ${tone}">Sentry</span>
        </header>
        <p class="value">${sentry.count24h}</p>
        <p class="sub">24시간 이벤트 · ${relative(sentry.ts, now)}</p>
        ${
          (sentry.issues ?? []).length > 0
            ? `<ul class="fails">${sentry.issues
                .map(
                  (issue) =>
                    `<li><b>${issue.count}회</b> ${escape(issue.title)}</li>`,
                )
                .join("")}</ul>`
            : ""
        }
      </article>`;
}

export function renderStatusPage({
  probes,
  e2e = null,
  sentry = null,
  now = Date.now(),
}) {
  const allOk = probes.every((probe) => probe.latest?.ok !== false);
  const headline = allOk
    ? "백엔드 정상"
    : `이상 ${probes.filter((probe) => probe.latest?.ok === false).length}건`;

  return `<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light dark">
<!-- 열어둔 탭이 낡지 않도록 5분마다 새로 받는다. -->
<meta http-equiv="refresh" content="300">
<title>Afterglow 상태</title>
<style>
:root {
  --ground: #f7f8f8; --surface: #ffffff; --sunk: #f2f4f6;
  --ink: #171c21; --ink-soft: #3f4b58; --ink-mute: #8894a6;
  --line: #d4dce5; --line-soft: #e6eaf0;
  --ok: #1f9d55; --warn: #b7791f; --bad: #c62828; --idle: #d4dce5;
}
@media (prefers-color-scheme: dark) {
  :root {
    --ground: #11161f; --surface: #1a2233; --sunk: #151d2b;
    --ink: #dce4ef; --ink-soft: #aec6da; --ink-mute: #7f90a6;
    --line: #2f4054; --line-soft: #26344a;
    --ok: #2ecc71; --warn: #f4b400; --bad: #ff6b66; --idle: #2f4054;
  }
}
* { box-sizing: border-box; }
body {
  margin: 0; background: var(--ground); color: var(--ink);
  font: 16px/1.6 -apple-system, BlinkMacSystemFont, "Apple SD Gothic Neo", "Segoe UI", sans-serif;
  -webkit-font-smoothing: antialiased; word-break: keep-all;
}
.wrap { max-width: 46rem; margin: 0 auto; padding: 2rem 1.1rem 4rem; display: flex; flex-direction: column; gap: 1.6rem; }
header.top { display: flex; flex-direction: column; gap: 0.35rem; padding-bottom: 1.2rem; border-bottom: 2px solid var(--ink); }
h1 { margin: 0; font-size: 1.6rem; letter-spacing: -0.02em; }
h1 .dot { display: inline-block; width: 0.6rem; height: 0.6rem; border-radius: 50%; margin-right: 0.5rem; vertical-align: 0.08em; }
h1 .dot.ok { background: var(--ok); } h1 .dot.bad { background: var(--bad); }
.stamp { font-family: ui-monospace, SFMono-Regular, monospace; font-size: 0.78rem; color: var(--ink-mute); }
.grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(15rem, 1fr)); gap: 0.8rem; }
.card {
  background: var(--surface); border: 1px solid var(--line); border-left: 3px solid var(--idle);
  border-radius: 5px; padding: 0.9rem 1rem; display: flex; flex-direction: column; gap: 0.3rem; min-width: 0;
}
.card.ok { border-left-color: var(--ok); } .card.bad { border-left-color: var(--bad); }
.card.warn { border-left-color: var(--warn); } .card.pending { opacity: 0.72; }
.card header { display: flex; align-items: baseline; justify-content: space-between; gap: 0.6rem; }
.label { font-size: 0.82rem; font-weight: 600; }
.state { font-family: ui-monospace, monospace; font-size: 0.68rem; letter-spacing: 0.06em; text-transform: uppercase; }
.state.ok { color: var(--ok); } .state.bad { color: var(--bad); }
.state.warn { color: var(--warn); } .state.none { color: var(--ink-mute); }
.value { margin: 0; font-size: 1.5rem; font-weight: 600; font-variant-numeric: tabular-nums; line-height: 1.2; }
.sub { margin: 0; font-size: 0.76rem; color: var(--ink-mute); }
.bars { display: flex; gap: 1px; height: 22px; align-items: stretch; margin-top: 0.35rem; }
.bars i { flex: 1; border-radius: 1px; background: var(--idle); }
.bars i.ok { background: var(--ok); } .bars i.bad { background: var(--bad); }
.foot { margin: 0.35rem 0 0; display: flex; justify-content: space-between; gap: 0.6rem; font-size: 0.7rem; color: var(--ink-mute); }
.foot code { font-family: ui-monospace, monospace; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.fails { margin: 0.5rem 0 0; padding: 0.5rem 0 0; list-style: none; border-top: 1px solid var(--line-soft); display: flex; flex-direction: column; gap: 0.3rem; font-size: 0.74rem; color: var(--ink-soft); }
.fails b { font-family: ui-monospace, monospace; font-weight: 600; color: var(--bad); }
footer { font-size: 0.75rem; color: var(--ink-mute); border-top: 1px solid var(--line); padding-top: 1rem; }
footer code { font-family: ui-monospace, monospace; }
</style>
</head>
<body>
<div class="wrap">
  <header class="top">
    <h1><span class="dot ${allOk ? "ok" : "bad"}"></span>${headline}</h1>
    <p class="stamp">갱신 ${escape(KST.format(new Date(now)))} KST · 30분마다 자동 점검</p>
  </header>

  <div class="grid">
${probes.map((probe) => renderProbeCard(probe, now)).join("\n")}
${renderE2E(e2e, now)}
${renderSentry(sentry, now)}
  </div>

  <footer>
    이 페이지는 <code>.github/workflows/health.yml</code>이 남긴 기록을 구운 정적 문서다.
    갱신 시각이 30분 넘게 멈춰 있으면 서버가 아니라 <b>워크플로가 멈춘 것</b>이다
    (스케줄 워크플로는 저장소가 60일간 조용하면 GitHub이 자동 비활성화한다).
  </footer>
</div>
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
