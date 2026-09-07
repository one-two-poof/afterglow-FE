import { addDays, formatISODate, type DateRange } from "@afterglow/utils";

import type { TripPlanPayload } from "./types";

/**
 * 폼 선택 값을 제출 페이로드 형태로 조립(순수 함수).
 * 필수 값(여행 기간)이 없으면 null. date-utils는 PR 9에서 승격된 @afterglow/utils 사용.
 */
export const buildTripPlanPayload = (
  range: DateRange,
  starts: ({ id: number; place_type: string } | null)[],
  treatments: string[],
  treatmentDates: Record<string, string>,
  userPurpose: string,
  mobilityRange: number,
  activityLevel: number,
): TripPlanPayload | null => {
  const { start, end } = range;
  if (!start || !end) {
    return null;
  }

  const daily_startList: TripPlanPayload["daily_startList"] = [];
  starts.forEach((s, i) => {
    if (s === null) {
      return;
    }
    daily_startList.push({
      date: formatISODate(addDays(start, i)),
      start_id: s.id,
      place_type: s.place_type,
    });
  });

  return {
    trip_start_date: formatISODate(start),
    trip_end_date: formatISODate(end),
    treatmentList: treatments
      .filter((name) => treatmentDates[name])
      .map((name) => ({ name, date: treatmentDates[name]! })),
    user_purpose: userPurpose,
    mobility_range: mobilityRange,
    activity_level: activityLevel,
    daily_startList,
  };
};
