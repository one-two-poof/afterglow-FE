/**
 * Sentry Issues API → 상태 페이지가 읽는 요약 JSON.
 *
 * 페이지는 정적 HTML이라 브라우저에서 Sentry를 부를 수 없다(토큰이 공개된다).
 * 그래서 워크플로가 대신 읽어 status-data 브랜치에 요약만 남긴다.
 *
 * 토큰·조직·프로젝트가 설정돼 있지 않으면 **아무것도 하지 않고 정상 종료한다** —
 * Sentry 계정이 없는 동안에도 워크플로가 빨갛게 뜨지 않도록.
 *
 * 사용법:
 *   SENTRY_AUTH_TOKEN=... SENTRY_ORG=... SENTRY_PROJECT=... \
 *     node scripts/sentry-summary.mjs --out <status-data 디렉터리>
 */
import { mkdir, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

const API_BASE = "https://sentry.io/api/0";
/** 카드에 보여줄 상위 이슈 수. 나머지는 건수로만 합산된다. */
const TOP_ISSUES = 3;

/** Issues API 응답 → 페이지가 읽는 형태. count는 문자열로 오므로 수로 바꾼다. */
export function summarizeIssues(
  issues,
  { ts = new Date().toISOString() } = {},
) {
  const counted = issues.map((issue) => ({
    title: issue.title ?? issue.metadata?.type ?? "제목 없음",
    count: Number(issue.count ?? 0),
  }));

  return {
    ts,
    count24h: counted.reduce((sum, issue) => sum + issue.count, 0),
    issues: [...counted].sort((a, b) => b.count - a.count).slice(0, TOP_ISSUES),
  };
}

/** 설정이 다 있는지 본다. 하나라도 없으면 이 단계는 통째로 건너뛴다. */
export function readConfig(environment) {
  const token = environment.SENTRY_AUTH_TOKEN;
  const org = environment.SENTRY_ORG;
  const project = environment.SENTRY_PROJECT;
  if (!token || !org || !project) {
    return null;
  }
  return { token, org, project };
}

export async function fetchIssues(config, { fetchImpl = fetch } = {}) {
  const url =
    `${API_BASE}/projects/${config.org}/${config.project}/issues/` +
    `?statsPeriod=24h&query=${encodeURIComponent("is:unresolved")}&limit=25`;

  const response = await fetchImpl(url, {
    headers: { Authorization: `Bearer ${config.token}` },
    signal: AbortSignal.timeout(15_000),
  });

  if (!response.ok) {
    throw new Error(`Sentry API ${response.status}`);
  }
  return response.json();
}

function parseArguments(argv) {
  const outIndex = argv.indexOf("--out");
  if (outIndex < 0 || !argv[outIndex + 1]) {
    throw new Error("사용법: --out <status-data 디렉터리>");
  }
  return { out: argv[outIndex + 1] };
}

async function main() {
  const options = parseArguments(process.argv.slice(2));

  const config = readConfig(process.env);
  if (!config) {
    console.log(
      "SENTRY_AUTH_TOKEN·SENTRY_ORG·SENTRY_PROJECT가 없다 — Sentry 요약을 건너뛴다",
    );
    return;
  }

  const summary = summarizeIssues(await fetchIssues(config));

  const outDir = join(resolve(options.out), "sentry");
  await mkdir(outDir, { recursive: true });
  await writeFile(
    join(outDir, "latest.json"),
    `${JSON.stringify(summary, null, 2)}\n`,
    "utf8",
  );

  console.log(
    `Sentry 24시간 이벤트 ${summary.count24h}건 (미해결 이슈 상위 ${summary.issues.length}개 기록)`,
  );
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
) {
  await main();
}
