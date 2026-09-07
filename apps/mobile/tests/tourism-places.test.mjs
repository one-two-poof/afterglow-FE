import assert from "node:assert/strict";
import test from "node:test";

import {
  getTourismBrowseCategories,
  mergeTourismPlaces,
  normalizeTourismSearch,
} from "../src/lib/tourism-browse.ts";

test("browses attractions and accommodations when all is selected", () => {
  assert.deepEqual(getTourismBrowseCategories("all"), [
    "attraction",
    "accommodation",
  ]);
});

test("browses only the selected tourism category", () => {
  assert.deepEqual(getTourismBrowseCategories("attraction"), ["attraction"]);
  assert.deepEqual(getTourismBrowseCategories("accommodation"), [
    "accommodation",
  ]);
});

test("uses the backend match-all value for a blank search", () => {
  assert.equal(normalizeTourismSearch("   "), "%");
  assert.equal(normalizeTourismSearch("  경복궁  "), "경복궁");
});

test("merges category results without duplicate places", () => {
  const attraction = { id: 10, placeName: "경복궁" };
  const accommodation = { id: 20, placeName: "서울호텔" };

  assert.deepEqual(
    mergeTourismPlaces([[attraction, accommodation], [accommodation]]),
    [attraction, accommodation],
  );
});
