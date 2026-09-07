/** 여행 계획 폼 제출 페이로드 (백엔드 계약). */

export interface DailyStart {
  /** "YYYY-MM-DD" */
  date: string;
  /** 병원·숙소 데이터 아이디 (출발점) */
  start_id: number;
  /** 출발점 장소 유형 (Place.placeType, 예: "HOSPITAL") */
  place_type: string;
}

export interface TreatmentSelection {
  /** 시술 종류 (한글 라벨 그대로 제출) */
  name: string;
  /** 시술 받는 날짜 "YYYY-MM-DD" (같은 날짜에 여러 시술 가능) */
  date: string;
}

export interface TripPlanPayload {
  /** "YYYY-MM-DD" */
  trip_start_date: string;
  /** "YYYY-MM-DD" */
  trip_end_date: string;
  /** 선택한 시술 종류 + 각 시술의 날짜 */
  treatmentList: TreatmentSelection[];
  user_purpose: string;
  /** 하루 시작 관광지에서 이동 가능한 활동 반경 (1~5) */
  mobility_range: number;
  /** 여행 중 원하는 활동 강도 (1~5) */
  activity_level: number;
  daily_startList: DailyStart[];
}
