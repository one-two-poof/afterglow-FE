import assert from "node:assert/strict";
import test from "node:test";

import { findClosestPlaceAddress } from "../src/lib/place-match.ts";

const places = [
  {
    placeName: "갤러리엘르",
    roadAddressName: "서울 강남구 테헤란로 1",
    addressName: "서울 강남구 역삼동 1",
    mapX: 127.1,
    mapY: 37.5,
  },
  {
    placeName: "갤러리엘르",
    roadAddressName: "",
    addressName: "서울 강남구 역삼동 652-3",
    mapX: 127.03,
    mapY: 37.5,
  },
];

test("returns the address of the nearest exact-name place", () => {
  assert.equal(
    findClosestPlaceAddress(places, {
      name: "갤러리엘르",
      lat: 37.5,
      lng: 127.031,
    }),
    "서울 강남구 역삼동 652-3",
  );
});

test("prefers a road address when the matched place has one", () => {
  assert.equal(
    findClosestPlaceAddress(places, {
      name: "갤러리엘르",
      lat: 37.5,
      lng: 127.099,
    }),
    "서울 강남구 테헤란로 1",
  );
});

test("does not use the address of a differently named place", () => {
  assert.equal(
    findClosestPlaceAddress(places, {
      name: "다른 장소",
      lat: 37.5,
      lng: 127.03,
    }),
    undefined,
  );
});

test("does not use a same-name place that is too far away", () => {
  assert.equal(
    findClosestPlaceAddress(places, {
      name: "갤러리엘르",
      lat: 35.1,
      lng: 129.04,
    }),
    undefined,
  );
});
