import assert from "node:assert/strict";
import test from "node:test";

import {
  filterTourismApiPlaces,
  filterTourismAttractions,
  getTourismBrowseCategories,
  mergeTourismPlaces,
  normalizeTourismSearch,
} from "../src/lib/tourism-browse.ts";

test("keeps only places whose source includes the Tourism API", () => {
  const places = [
    { id: 1, source: "CSV" },
    { id: 2, source: "KAKAO_API" },
    { id: 3, source: "TOURISM_API" },
    { id: 4, source: "TOURISM_API+KAKAO" },
    { id: 5, source: "NOT_TOURISM_API" },
  ];

  assert.deepEqual(
    filterTourismApiPlaces(places).map(({ id }) => id),
    [3, 4],
  );
});

test("browses every tourism-backed category when all is selected", () => {
  assert.deepEqual(getTourismBrowseCategories("all"), [
    "hospital",
    "attraction",
    "accommodation",
  ]);
});

test("browses only the selected tourism category", () => {
  assert.deepEqual(getTourismBrowseCategories("attraction"), ["attraction"]);
  assert.deepEqual(getTourismBrowseCategories("accommodation"), [
    "accommodation",
  ]);
  assert.deepEqual(getTourismBrowseCategories("hospital"), ["hospital"]);
});

test("uses the backend match-all value for a blank search", () => {
  assert.equal(normalizeTourismSearch("   "), "%");
  assert.equal(normalizeTourismSearch("  경복궁  "), "경복궁");
});

test("merges category results without duplicate places", () => {
  const attraction = { id: 10, placeType: "ATTRACTION", placeName: "경복궁" };
  const accommodation = {
    id: 20,
    placeType: "ACCOMMODATION",
    placeName: "서울호텔",
  };

  assert.deepEqual(
    mergeTourismPlaces([[attraction, accommodation], [accommodation]]),
    [attraction, accommodation],
  );
});

test("keeps places from different categories when their numeric ids overlap", () => {
  const hospital = { id: 1, placeType: "HOSPITAL", placeName: "서울의원" };
  const attraction = { id: 1, placeType: "ATTRACTION", placeName: "경복궁" };
  const accommodation = {
    id: 1,
    placeType: "ACCOMMODATION",
    placeName: "서울호텔",
  };

  assert.deepEqual(
    mergeTourismPlaces([[hospital], [attraction], [accommodation]]),
    [hospital, attraction, accommodation],
  );
});

test("groups attractions into the five approved browse categories", () => {
  const places = [
    { id: 1, primaryTypeName: "미술관", categoryName: "문화시설" },
    { id: 2, primaryTypeName: "공원", categoryName: "자연" },
    { id: 3, primaryTypeName: "백화점", categoryName: "쇼핑" },
    { id: 4, primaryTypeName: "찜질방/사우나", categoryName: "웰니스" },
    { id: 5, primaryTypeName: "이색체험", categoryName: "체험관광지" },
  ];

  assert.deepEqual(
    filterTourismAttractions(places, "culture").map(({ id }) => id),
    [1],
  );
  assert.deepEqual(
    filterTourismAttractions(places, "nature").map(({ id }) => id),
    [2],
  );
  assert.deepEqual(
    filterTourismAttractions(places, "shopping").map(({ id }) => id),
    [3],
  );
  assert.deepEqual(
    filterTourismAttractions(places, "wellness").map(({ id }) => id),
    [4],
  );
  assert.deepEqual(
    filterTourismAttractions(places, "experience").map(({ id }) => id),
    [5],
  );
  assert.deepEqual(filterTourismAttractions(places, "all"), places);
});
