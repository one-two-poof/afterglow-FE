import assert from "node:assert/strict";
import test from "node:test";

import { recommendedCourseToMapDecoration } from "../src/types/recommendation.ts";

test("builds ordered markers and connecting lines for a recommended course", () => {
  const decoration = recommendedCourseToMapDecoration({
    rank: 1,
    course_id: "C00001",
    total_distance_km: 1.2,
    treatment: [],
    daily_schedules: [
      {
        date: "2026-09-27",
        start_location: { name: "숙소", mapX: 37.58, mapY: 126.98 },
        places: [
          {
            visit_order: 2,
            place_name: "두 번째 장소",
            place_category: "관광지",
            is_indoor: 0,
            walk_hard: 2,
            dist_to_prev_km: 0.5,
            mapX: 37.6,
            mapY: 127,
          },
          {
            visit_order: 1,
            place_name: "첫 번째 장소",
            place_category: "카페",
            is_indoor: 1,
            walk_hard: 1,
            dist_to_prev_km: 0.3,
            mapX: 37.59,
            mapY: 126.99,
          },
        ],
      },
    ],
  });

  assert.deepEqual(
    decoration.markers.map(({ label, sequenceLabel }) => ({
      label,
      sequenceLabel,
    })),
    [
      { label: "숙소", sequenceLabel: undefined },
      { label: "첫 번째 장소", sequenceLabel: "1" },
      { label: "두 번째 장소", sequenceLabel: "2" },
    ],
  );
  assert.deepEqual(decoration.connectionLines[0]?.coordinates, [
    [126.98, 37.58],
    [126.99, 37.59],
    [127, 37.6],
  ]);
  assert.equal(decoration.days[0]?.date, "2026-09-27");
});
