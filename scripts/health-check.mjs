/**
 * 백엔드 합성 헬스체크.
 *
 * 실사용자 트래픽이 없어도 서버가 살아 있는지 알기 위해, CI가 주기적으로 주요
 * 엔드포인트를 직접 호출하고 결과를 JSONL 한 줄로 남긴다. 상태 페이지
 * (scripts/build-status-page.mjs)가 그 파일을 읽어 렌더한다.
 *
 * 사용법:
 *   node scripts/health-check.mjs --out <디렉터리>   # <디렉터리>/health/YYYY-MM.jsonl 에 append
 *   node scripts/health-check.mjs                    # 파일 없이 콘솔 출력만 (로컬 확인용)
 *
 * 실패가 하나라도 있으면 exit 1 — 스케줄 워크플로가 빨간 X로 남고 GitHub이
 * 저장소 소유자에게 실패 메일을 보낸다(별도 알림 서비스 없이 쓰는 1차 경보).
 */
import { appendFile, mkdir, readdir, rm } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

const MAIN_API = "https://after-glow.duckdns.org";
const ML_API = "https://after-glow-ml.duckdns.org";

const TIMEOUT_MS = 10_000;

/**
 * 프로브 정의.
 *
 * ⚠️ 인증이 필요한 엔드포인트(/api/places 등)는 아직 넣지 않는다 — 전용 테스트
 *    계정이 생기면 토큰을 Secrets로 주입해 200 프로브를 추가한다.
 */
export const PROBES = [
  {
    id: "main-api",
    label: "메인 BE",
    url: `${MAIN_API}/api/auth/me`,
    method: "GET",
    // 토큰 없이 부르므로 401이 "정상"이다. 서버가 죽거나 라우팅이 깨지면
    // 5xx·타임아웃이 나오고, 200이 나오면 인증이 뚫린 것이므로 둘 다 실패로 본다.
    expectStatus: [401],
  },
  {
    id: "ml-api",
    label: "ML 추천 서버",
    url: `${ML_API}/api/course-selection`,
    // 실제 코스 추천은 POST다. 프로브가 데이터를 만들지 않도록 GET으로 두드리기만
    // 하고 405(메서드 불가)를 받는다 — 라우트가 살아 있다는 증거는 그걸로 충분하다.
    method: "GET",
    // 5xx(앱 다운·502)면 실패. 404면 라우트 자체가 사라진 것이므로 역시 실패.
    expectBelow: 500,
    rejectStatus: [404],
  },
  {
    id: "buildings-pmtiles",
    label: "건물 PMTiles",
    url: `${MAIN_API}/data/buildings.pmtiles`,
    method: "GET",
    // 앱은 32MB 원본을 통째로 받지 않고 Range로 잘라 읽는다(PMTilesFileSource).
    // Range가 막히면 지도의 건물·그림자가 통째로 죽으므로 206을 직접 확인한다.
    headers: { Range: "bytes=0-16" },
    expectStatus: [206],
    checkHeaders: assertCacheable,
  },
];

/**
 * pmtiles가 캐시 불가로 서빙되는지 검사한다.
 *
 * 과거 이 파일이 `Cache-Control: no-store`로 서빙되던 시절 MapLibre Native의
 * PMTilesFileSource가 SIGSEGV로 죽어 앱이 실행 즉시 종료됐다(2026-09-04 서버
 * 수정으로 해결). 서버 재배포로 헤더가 되돌아가는 회귀를 사람보다 먼저 잡는다.
 */
export function assertCacheable(headers) {
  const cacheControl = headers.get("cache-control") ?? "";
  if (/no-store/i.test(cacheControl)) {
    return `Cache-Control에 no-store가 돌아왔다 (앱 크래시 회귀 위험): ${cacheControl}`;
  }
  if (headers.get("accept-ranges") === null) {
    return "Accept-Ranges 헤더가 없다 (Range 지원 중단 의심)";
  }
  return null;
}

/** 응답이 프로브의 기대에 맞는지 판정한다. 네트워크 계층과 분리해 단위 테스트한다. */
export function evaluateResponse(probe, response) {
  if (probe.expectStatus && !probe.expectStatus.includes(response.status)) {
    return {
      ok: false,
      note: `기대 상태코드 ${probe.expectStatus.join("|")}, 실제 ${response.status}`,
    };
  }
  if (probe.expectBelow !== undefined && response.status >= probe.expectBelow) {
    return {
      ok: false,
      note: `상태코드 ${response.status} (${probe.expectBelow} 미만 기대)`,
    };
  }
  if (probe.rejectStatus?.includes(response.status)) {
    return { ok: false, note: `상태코드 ${response.status} (라우트 사라짐)` };
  }
  const headerProblem = probe.checkHeaders?.(response.headers) ?? null;
  if (headerProblem) {
    return { ok: false, note: headerProblem };
  }
  return { ok: true, note: "" };
}

/** 프로브 하나를 실행해 기록 한 건을 만든다. fetch는 테스트에서 주입한다. */
export async function runProbe(
  probe,
  { fetchImpl = fetch, now = Date.now } = {},
) {
  const startedAt = now();
  try {
    const response = await fetchImpl(probe.url, {
      method: probe.method,
      headers: probe.headers,
      body: probe.body,
      redirect: "manual",
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    const { ok, note } = evaluateResponse(probe, response);
    return {
      id: probe.id,
      ok,
      status: response.status,
      ms: now() - startedAt,
      note,
    };
  } catch (error) {
    // 타임아웃·DNS·TLS 실패는 모두 여기로 온다. status 0 = 응답 자체가 없었음.
    return {
      id: probe.id,
      ok: false,
      status: 0,
      ms: now() - startedAt,
      note: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * 네트워크 계층 실패(status 0)만 한 번 더 시도한다.
 *
 * duckdns의 A 레코드 TTL은 60초라 레코드 갱신 순간 리졸버에 따라 짧게 NXDOMAIN이
 * 뜬다(실측: 같은 시각에 8.8.8.8은 실패, 1.1.1.1은 성공). 이걸 그대로 실패로 세면
 * 서버는 멀쩡한데 실패 메일만 쌓인다. 반면 5xx는 서버가 실제로 응답한 신호이므로
 * 재시도하지 않는다 — 감추면 안 되는 값이다.
 */
export async function runProbeWithRetry(probe, options = {}) {
  const { retryDelayMs = 3000, sleep = defaultSleep } = options;
  const first = await runProbe(probe, options);
  if (first.status !== 0) return first;

  await sleep(retryDelayMs);
  const second = await runProbe(probe, options);
  return {
    ...second,
    note: second.ok
      ? `1차 시도 실패 후 재시도 성공 (${first.note})`
      : `2회 연속 실패: ${second.note}`,
  };
}

const defaultSleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** JSONL 파일 경로 — 월별로 쪼개 한 파일이 무한정 커지지 않게 한다. */
export function historyFileFor(dataDir, timestamp) {
  const month = timestamp.slice(0, 7); // YYYY-MM
  return join(dataDir, "health", `${month}.jsonl`);
}

/**
 * 보존 기간이 지난 월별 기록 파일을 고른다.
 * 페이지는 24시간만 그리지만, 되짚어 볼 여지로 최근 두 달치는 남긴다.
 */
export function expiredHistoryFiles(fileNames, timestamp, keepMonths = 2) {
  const cutoff = new Date(`${timestamp.slice(0, 7)}-01T00:00:00.000Z`);
  cutoff.setUTCMonth(cutoff.getUTCMonth() - (keepMonths - 1));
  const oldest = cutoff.toISOString().slice(0, 7);
  return fileNames.filter((name) => {
    const month = name.replace(/\.jsonl$/, "");
    return /^\d{4}-\d{2}$/.test(month) && month < oldest;
  });
}

async function main() {
  const outIndex = process.argv.indexOf("--out");
  const dataDir = outIndex >= 0 ? process.argv[outIndex + 1] : null;

  const ts = new Date().toISOString();
  const results = [];
  for (const probe of PROBES) {
    results.push(await runProbeWithRetry(probe));
  }

  for (const result of results) {
    const mark = result.ok ? "✓" : "✗";
    const detail = result.note ? ` — ${result.note}` : "";
    console.log(
      `${mark} ${result.id.padEnd(18)} ${String(result.status).padStart(3)} ${String(result.ms).padStart(5)}ms${detail}`,
    );
  }

  if (dataDir) {
    const file = historyFileFor(resolve(dataDir), ts);
    await mkdir(dirname(file), { recursive: true });
    const lines = results.map((result) => JSON.stringify({ ts, ...result }));
    await appendFile(file, `${lines.join("\n")}\n`, "utf8");
    console.log(`기록: ${file}`);

    const historyDir = dirname(file);
    for (const stale of expiredHistoryFiles(await readdir(historyDir), ts)) {
      await rm(join(historyDir, stale));
      console.log(`보존기간 만료 삭제: ${stale}`);
    }
  }

  const failed = results.filter((result) => !result.ok);
  if (failed.length > 0) {
    console.error(
      `실패한 프로브 ${failed.length}건: ${failed.map((r) => r.id).join(", ")}`,
    );
    process.exitCode = 1;
  }
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
) {
  await main();
}
