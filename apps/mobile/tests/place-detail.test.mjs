import assert from "node:assert/strict";
import test from "node:test";

import {
  buildPlaceDetailRequest,
  buildPlaceDetailFacts,
  getPlaceDetailImages,
  getSafeWebUrl,
} from "../src/lib/place-detail.ts";

test("builds the backend place detail request with an uppercase place type", () => {
  assert.deepEqual(buildPlaceDetailRequest(2986, "accommodation"), {
    url: "/api/places/2986",
    params: { placeType: "ACCOMMODATION" },
  });
});

test("builds hospital facts and omits missing values", () => {
  const facts = buildPlaceDetailFacts({
    placeType: "HOSPITAL",
    skinTreatmentConfidence: "medium",
    skinTreatmentSignals: "필러",
    extraInfo: {
      mainSubject: "이비인후과, 성형외과",
      specialProcedure: "코 성형 및 비염 수술",
      serviceLanguage: "영어, 일본어",
      onlineReservation: "N",
      specialFacility: null,
    },
  });

  assert.deepEqual(
    facts.map(({ key, value, format }) => ({ key, value, format })),
    [
      {
        key: "skinTreatmentConfidence",
        value: "medium",
        format: "confidence",
      },
      { key: "skinTreatmentSignals", value: "필러", format: "text" },
      {
        key: "mainSubject",
        value: "이비인후과, 성형외과",
        format: "text",
      },
      {
        key: "specialProcedure",
        value: "코 성형 및 비염 수술",
        format: "text",
      },
      {
        key: "serviceLanguage",
        value: "영어, 일본어",
        format: "text",
      },
      {
        key: "onlineReservation",
        value: "N",
        format: "availability",
      },
    ],
  );
});

test("keeps false attraction flags because they are meaningful", () => {
  const facts = buildPlaceDetailFacts({
    placeType: "ATTRACTION",
    isIndoor: false,
    isHeatSource: false,
    isMassageSpot: false,
    walkHard: 4,
    extraInfo: {
      useTime: "월~금 10:00~20:00",
      restDate: "일요일, 월요일",
    },
  });

  assert.deepEqual(
    facts.slice(0, 4).map(({ key, value }) => ({ key, value })),
    [
      { key: "isIndoor", value: false },
      { key: "isHeatSource", value: false },
      { key: "isMassageSpot", value: false },
      { key: "walkHard", value: 4 },
    ],
  );
});

test("returns unique non-empty detail images with the primary image first", () => {
  assert.deepEqual(
    getPlaceDetailImages({
      image: "https://example.com/main.jpg",
      images: [
        "https://example.com/main.jpg",
        "",
        "file:///private/user-data.jpg",
        "https://example.com/room.jpg",
      ],
    }),
    ["https://example.com/main.jpg", "https://example.com/room.jpg"],
  );
});

test("only allows http and https homepage links", () => {
  assert.equal(
    getSafeWebUrl("https://example.com/reserve"),
    "https://example.com/reserve",
  );
  assert.equal(getSafeWebUrl("http://example.com"), "http://example.com/");
  assert.equal(getSafeWebUrl("javascript:alert(1)"), undefined);
  assert.equal(getSafeWebUrl("not a url"), undefined);
});
