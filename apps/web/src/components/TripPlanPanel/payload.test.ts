import { buildTripPlanPayload } from "./payload";

describe("buildTripPlanPayload", () => {
  it("maps mobility range and activity level to the ML course request", () => {
    const payload = buildTripPlanPayload(
      {
        start: new Date(2026, 5, 7),
        end: new Date(2026, 5, 10),
      },
      [7, 5, null, null],
      ["비만(약처방)", "리프팅", "제모"],
      {
        "비만(약처방)": "2026-06-08",
        리프팅: "2026-06-08",
        제모: "2026-06-09",
      },
      "휴식",
      5,
      3,
    );

    expect(payload).toMatchObject({
      trip_start_date: "2026-06-07",
      trip_end_date: "2026-06-10",
      user_purpose: "휴식",
      mobility_range: 5,
      activity_level: 3,
      daily_startList: [
        { date: "2026-06-07", start_id: 7 },
        { date: "2026-06-08", start_id: 5 },
      ],
    });
    expect(payload).not.toHaveProperty("user_walk_preference");
  });
});
