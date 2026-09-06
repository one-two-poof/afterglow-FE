import assert from "node:assert/strict";
import test from "node:test";

import {
  buildExternalMapUrl,
  formatPlaceForClipboard,
} from "../src/lib/place-actions.ts";

test("formats a place name and address on separate lines", () => {
  assert.equal(
    formatPlaceForClipboard("경복궁", "서울 종로구 사직로 161"),
    "경복궁\n서울 종로구 사직로 161",
  );
});

test("omits a missing address from copied text", () => {
  assert.equal(formatPlaceForClipboard("경복궁"), "경복궁");
});

test("builds an Apple Maps URL on iOS", () => {
  assert.equal(
    buildExternalMapUrl("ios", {
      latitude: 37.579617,
      longitude: 126.977041,
      label: "경복궁",
    }),
    "https://maps.apple.com/?ll=37.579617%2C126.977041&q=%EA%B2%BD%EB%B3%B5%EA%B6%81",
  );
});

test("builds a geo URL on Android", () => {
  assert.equal(
    buildExternalMapUrl("android", {
      latitude: 37.579617,
      longitude: 126.977041,
      label: "경복궁",
    }),
    "geo:37.579617,126.977041?q=37.579617%2C126.977041(%EA%B2%BD%EB%B3%B5%EA%B6%81)",
  );
});

test("uses Google Maps web on other platforms", () => {
  assert.equal(
    buildExternalMapUrl("web", {
      latitude: 37.579617,
      longitude: 126.977041,
      label: "경복궁",
    }),
    "https://www.google.com/maps/search/?api=1&query=37.579617%2C126.977041",
  );
});
