import assert from "node:assert/strict";
import test from "node:test";

import {
  buildReport,
  parseJUnit,
  summarizeFailureText,
} from "./e2e-report.mjs";

test("통과·실패 케이스를 함께 읽는다", () => {
  const cases = parseJUnit(`<?xml version='1.0' encoding='UTF-8'?>
<testsuites>
  <testsuite name="Test Suite" tests="3" failures="1">
    <testcase id="tab-navigation" name="tab-navigation" classname="tab-navigation" time="41.2"/>
    <testcase id="login-validation" name="login-validation" time="33.9"></testcase>
    <testcase id="signup-validation" name="signup-validation" time="12.1">
      <failure>Assertion is false: &quot;비밀번호가 일치하지 않아요.&quot; is visible
      at signup-validation.yaml:88</failure>
    </testcase>
  </testsuite>
</testsuites>`);

  assert.equal(cases.length, 3);
  assert.deepEqual(
    cases.map((c) => c.ok),
    [true, true, false],
  );
  assert.equal(cases[2].name, "signup-validation");
  assert.match(cases[2].step, /비밀번호가 일치하지 않아요/);
});

test("failure 메시지가 속성으로 오는 형태도 읽는다", () => {
  const [testCase] = parseJUnit(
    `<testcase name="login-validation"><failure message="Element not found: id=login-email-input" type="AssertionError"/></testcase>`,
  );

  assert.equal(testCase.ok, false);
  assert.equal(testCase.step, "Element not found: id=login-email-input");
});

test("error 엘리먼트도 실패로 센다", () => {
  const [testCase] = parseJUnit(
    `<testcase name="tab-navigation"><error>App crashed</error></testcase>`,
  );

  assert.equal(testCase.ok, false);
  assert.equal(testCase.step, "App crashed");
});

test("이름 속성이 없으면 id·classname 순으로 대체한다", () => {
  assert.equal(parseJUnit(`<testcase id="flow-a"/>`)[0].name, "flow-a");
  assert.equal(parseJUnit(`<testcase classname="flow-b"/>`)[0].name, "flow-b");
  assert.equal(parseJUnit(`<testcase/>`)[0].name, "이름 없는 플로우");
});

test("실패 사유는 첫 줄만, 길면 잘라서 남긴다", () => {
  assert.equal(summarizeFailureText("\n\n  첫 줄  \n둘째 줄"), "첫 줄");
  assert.equal(summarizeFailureText("   "), "실패 사유 없음");
  assert.equal(summarizeFailureText("가".repeat(200)).length, 120);
});

test("상태 페이지가 읽는 형태로 집계한다", () => {
  const report = buildReport(
    [
      { name: "tab-navigation", ok: true },
      { name: "login-validation", ok: true },
      { name: "signup-validation", ok: false, step: "타임아웃" },
    ],
    { ts: "2026-09-09T12:00:00.000Z" },
  );

  assert.deepEqual(report, {
    ts: "2026-09-09T12:00:00.000Z",
    total: 3,
    passed: 2,
    failed: [{ name: "signup-validation", step: "타임아웃" }],
  });
});

test("리포트가 비어 있어도 터지지 않는다", () => {
  assert.deepEqual(buildReport(parseJUnit("<testsuites/>"), { ts: "t" }), {
    ts: "t",
    total: 0,
    passed: 0,
    failed: [],
  });
});
