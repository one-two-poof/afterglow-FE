/**
 * Maestro JUnit 리포트 → 상태 페이지가 읽는 요약 JSON.
 *
 * Maestro가 뱉는 JUnit XML은 실행마다 스키마가 조금씩 다르다(속성 이름, 자기닫는
 * testcase, failure 메시지가 속성인지 본문인지). 의존성 없이 관대하게 파싱해서
 * "무엇이 몇 개 깨졌고 어디서 멈췄나"만 뽑는다 — 페이지에 필요한 건 그게 전부다.
 *
 * 사용법:
 *   node scripts/e2e-report.mjs --input report.xml --out <status-data 디렉터리>
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

const decodeEntities = (text) =>
  text
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#10;/g, "\n")
    .replace(/&amp;/g, "&");

const attribute = (tag, name) => {
  const match = tag.match(new RegExp(`\\b${name}\\s*=\\s*"([^"]*)"`));
  return match ? decodeEntities(match[1]) : null;
};

/** 실패 사유에서 한 줄만 남긴다 — 카드에 들어갈 자리가 그만큼뿐이다. */
export function summarizeFailureText(text) {
  const firstLine = decodeEntities(text)
    .split("\n")
    .map((line) => line.trim())
    .find((line) => line.length > 0);
  if (!firstLine) return "실패 사유 없음";
  return firstLine.length > 120 ? `${firstLine.slice(0, 117)}...` : firstLine;
}

export function parseJUnit(xml) {
  const cases = [];
  // 자기닫는 <testcase .../>와 본문이 있는 <testcase ...>...</testcase>를 함께 훑는다.
  const pattern = /<testcase\b([^>]*?)(\/>|>([\s\S]*?)<\/testcase>)/g;

  for (const match of xml.matchAll(pattern)) {
    const [, attributes, closing, body = ""] = match;
    const name =
      attribute(attributes, "name") ??
      attribute(attributes, "id") ??
      attribute(attributes, "classname") ??
      "이름 없는 플로우";

    const failure = body.match(
      /<(failure|error)\b([^>]*?)(\/>|>([\s\S]*?)<\/\1>)/,
    );
    if (closing === "/>" || !failure) {
      // maestro 2.10은 status="SUCCESS" 속성도 함께 준다. 있으면 그것까지 본다 —
      // 실패인데 failure 엘리먼트가 없는 형태를 통과로 세지 않기 위해서다.
      const status = attribute(attributes, "status");
      cases.push(
        status && status.toUpperCase() !== "SUCCESS"
          ? { name, ok: false, step: `상태 ${status}` }
          : { name, ok: true },
      );
      continue;
    }

    const [, , failureAttributes, , failureBody = ""] = failure;
    const message =
      attribute(failureAttributes, "message") ?? failureBody.trim();
    cases.push({ name, ok: false, step: summarizeFailureText(message) });
  }

  return cases;
}

export function buildReport(cases, { ts = new Date().toISOString() } = {}) {
  const failed = cases.filter((testCase) => !testCase.ok);
  return {
    ts,
    total: cases.length,
    passed: cases.length - failed.length,
    failed: failed.map(({ name, step }) => ({ name, step })),
  };
}

function parseArguments(argv) {
  const options = { input: null, out: null };
  for (let i = 0; i < argv.length; i += 2) {
    const [flag, value] = [argv[i], argv[i + 1]];
    if (flag === "--input") options.input = value;
    else if (flag === "--out") options.out = value;
    else throw new Error(`알 수 없는 옵션: ${flag}`);
  }
  if (!options.input || !options.out) {
    throw new Error(
      "사용법: --input <report.xml> --out <status-data 디렉터리>",
    );
  }
  return options;
}

async function main() {
  const options = parseArguments(process.argv.slice(2));
  const report = buildReport(parseJUnit(await readFile(options.input, "utf8")));

  const outDir = join(resolve(options.out), "e2e");
  await mkdir(outDir, { recursive: true });
  await writeFile(
    join(outDir, "latest.json"),
    `${JSON.stringify(report, null, 2)}\n`,
    "utf8",
  );

  console.log(
    `E2E 요약: ${report.passed}/${report.total} 통과` +
      (report.failed.length > 0
        ? ` — 실패: ${report.failed.map((flow) => flow.name).join(", ")}`
        : ""),
  );
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
) {
  await main();
}
