import assert from "node:assert/strict";
import test from "node:test";

import {
  buildMapUrl,
  copyPlaceToClipboard,
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

test("loads the native clipboard only when copy is requested", async () => {
  let copiedText;

  await copyPlaceToClipboard("경복궁", "서울 종로구 사직로 161", async () => ({
    setStringAsync: async (text) => {
      copiedText = text;
    },
  }));

  assert.equal(copiedText, "경복궁\n서울 종로구 사직로 161");
});

test("builds an Apple Maps URL", () => {
  assert.equal(
    buildMapUrl("apple", {
      latitude: 37.579617,
      longitude: 126.977041,
      label: "경복궁",
    }),
    "https://maps.apple.com/?ll=37.579617%2C126.977041&q=%EA%B2%BD%EB%B3%B5%EA%B6%81",
  );
});

test("builds a Google Maps universal URL", () => {
  assert.equal(
    buildMapUrl("google", {
      latitude: 37.579617,
      longitude: 126.977041,
      label: "경복궁",
    }),
    "https://www.google.com/maps/search/?api=1&query=37.579617%2C126.977041",
  );
});

test("builds a Naver Map app URL", () => {
  assert.equal(
    buildMapUrl("naver", {
      latitude: 37.579617,
      longitude: 126.977041,
      label: "경복궁",
    }),
    "nmap://place?lat=37.579617&lng=126.977041&name=%EA%B2%BD%EB%B3%B5%EA%B6%81&appname=com.dunaduneos.afterglow",
  );
});

test("builds a Kakao Map app URL", () => {
  assert.equal(
    buildMapUrl("kakao", {
      latitude: 37.579617,
      longitude: 126.977041,
      label: "경복궁",
    }),
    "kakaomap://look?p=37.579617%2C126.977041",
  );
});
