/**
 * 통합 추천 코스 API(ML 서버) 응답 계약.
 * (요청 페이로드는 components/TripPlanPanel/types.ts 의 TripPlanPayload)
 *
 * 구조: daily_recommendations[] = rank별 "완성된 다일 일정" 하나. 사용자는 rank 단위로
 * 통째로 채택/스킵한다.
 *
 * 지도용 좌표 변환 헬퍼(courseToMarkers 등)는 지도 PR(14~16)에서 함께 이식한다.
 */
import type { LatLng, MapPoint } from "@afterglow/utils";

import type {
  MapConnectionLine,
  MarkerDetail,
} from "@/components/MapLibreMap/types";

/** 날짜 순서대로 순환하는 코스 전용 팔레트. 흰색 번호가 읽히도록 중명도 색을 사용한다. */
export const COURSE_DAY_COLORS = [
  "#0f766e",
  "#c2410c",
  "#7c3aed",
  "#1d4ed8",
  "#be185d",
  "#15803d",
] as const;

/**
 * 코스 좌표(mapX=위도/mapY=경도) → 지도 좌표(lat/lng).
 * ⚠️ BE 장소용 toLatLng(mapX=경도)와 **반대 관례**다. ML 추천 서버의 코스 응답은
 * mapX에 위도, mapY에 경도를 담아 내려주므로 여기서만 별도로 변환한다.
 */
const courseToLatLng = (point: MapPoint): LatLng => ({
  lat: point.mapX,
  lng: point.mapY,
});

/** 코스에 포함된 개별 장소 (방문 순서대로) */
export interface RecommendedPlace extends MapPoint {
  /** 방문 순서 (1부터) */
  visit_order: number;
  place_name: string;
  /** 명소 / 쇼핑 / 숙소 등 */
  place_category: string;
  /** 실내 여부 (0: 실외, 1: 실내) */
  is_indoor: 0 | 1;
  /** 도보 난이도 (1~5) */
  walk_hard: number;
  /** 직전 장소로부터의 거리(km). 첫 장소는 0 */
  dist_to_prev_km: number;
}

/** 코스 안의 하루치 일정 */
export interface DailySchedule {
  /** "YYYY-MM-DD" */
  date: string;
  /** 그날의 출발지(숙소·병원 등) */
  start_location: MapPoint & { name: string };
  places: RecommendedPlace[];
}

/** rank별 완성 일정 (전체 여행 기간 묶음, 채택/스킵 단위) */
export interface RecommendedCourse {
  /** 추천 순위 (1이 최상위) */
  rank: number;
  /** 코스 식별자 예: "C00003" */
  course_id: string;
  /** 코스 전체 이동 거리(km, 사전 계산값) */
  total_distance_km: number;
  /** 여행 기간 중 받는 시술 에코 (날짜별 매핑) */
  treatment: { name: string; date: string }[];
  /** 날짜별 일정 */
  daily_schedules: DailySchedule[];
}

/** 통합 추천 코스 API 최상위 응답 (rank 순 코스 배열) */
export interface RecommendationResponse {
  daily_recommendations: RecommendedCourse[];
}

/**
 * GET /api/recommendations 응답 아이템 (저장된 "내 코스").
 * 구조는 추천 코스(RecommendedCourse)와 동일하고 selectionId/selectedAt만 추가된다.
 */
export interface SavedCourse extends RecommendedCourse {
  /** 저장 선택 식별자 (서버 부여) */
  selectionId: number;
  /** 저장 시각 (ISO 8601) */
  selectedAt: string;
}

/**
 * 코스 표시용 제목. 홈 지도의 저장 코스 태그 라벨과 **동일한 규칙**을 공유한다:
 * 첫날 출발지(숙소 등) 이름을 제목으로 쓰고, 없으면 course_id로 폴백.
 * 태그(index.tsx)와 카드/상세(MyCourse)가 같은 규칙을 쓰도록 이 헬퍼로 단일화한다.
 */
export function courseTitle(
  course: Pick<RecommendedCourse, "daily_schedules" | "course_id">,
): string {
  return course.daily_schedules[0]?.start_location.name ?? course.course_id;
}

/** 코스 요약 통계 (일수 · 방문 장소 수 · 총 이동 거리). 카드/상세 요약에 쓴다. */
export function courseSummary(course: RecommendedCourse) {
  const days = course.daily_schedules.length;
  const placeCount = course.daily_schedules.reduce(
    (sum, day) => sum + day.places.length,
    0,
  );
  return { days, placeCount, distanceKm: course.total_distance_km };
}

/** 지도 마커 (좌표 + 라벨 + 상세). 모바일 MapMarker와 호환된다. */
export type CourseMarker = LatLng & {
  label: string;
  detail: MarkerDetail;
  color?: string;
  sequenceLabel?: string;
};

export interface SavedCourseMapDecoration {
  markers: CourseMarker[];
  connectionLines: MapConnectionLine[];
  days: { date: string; color: string }[];
}

/** 코스 장소(RecommendedPlace)를 마커 상세 카드용 정보로 변환. */
const placeToDetail = (place: RecommendedPlace): MarkerDetail => {
  const subtitle = [
    place.place_category,
    place.visit_order ? `${place.visit_order}번째 방문` : "",
  ]
    .filter(Boolean)
    .join(" · ");
  const description = [
    place.dist_to_prev_km > 0 ? `이전 지점서 ${place.dist_to_prev_km}km` : "",
    place.is_indoor === 1 ? "실내" : "실외",
  ]
    .filter(Boolean)
    .join(" · ");
  return {
    title: place.place_name,
    subtitle: subtitle || undefined,
    description: description || undefined,
  };
};

/**
 * 추천 코스(RecommendedCourse)의 "출발지 → 도착지" 두 지점만 마커로 찍는다.
 * - 출발지 = 코스의 맨 처음 지점(첫날 start_location)
 * - 도착지 = 코스의 맨 마지막 지점(마지막 방문 장소)
 * (경로 API 연동 전 임시 표시)
 */
export function courseToMarkers(course: RecommendedCourse): CourseMarker[] {
  const points: (MapPoint & { name?: string; place_name?: string })[] =
    course.daily_schedules.flatMap((day) => [
      day.start_location,
      ...day.places,
    ]);
  const first = points[0];
  const last = points[points.length - 1];
  if (!first || !last || first === last) {
    return [];
  }

  const nameOf = (p: (typeof points)[number]) => p.place_name ?? p.name ?? "";
  return [
    {
      ...courseToLatLng(first),
      label: `출발지${nameOf(first) ? ` · ${nameOf(first)}` : ""}`,
      detail: { title: nameOf(first) || "출발지", subtitle: "출발지" },
    },
    {
      ...courseToLatLng(last),
      label: `도착지${nameOf(last) ? ` · ${nameOf(last)}` : ""}`,
      detail: { title: nameOf(last) || "도착지", subtitle: "도착지" },
    },
  ];
}

/**
 * 저장된 코스(SavedCourse)의 모든 지점을 마커로.
 * 각 날의 출발지 + 방문 장소 전체를 이름 라벨과 함께 반환한다.
 */
export function savedCourseToMarkers(course: SavedCourse): CourseMarker[] {
  return savedCourseToMapDecoration(course).markers;
}

/** 추천 중인 코스도 저장된 코스와 동일한 지도 표현으로 변환한다. */
export function recommendedCourseToMapDecoration(
  course: RecommendedCourse,
): SavedCourseMapDecoration {
  return buildCourseMapDecoration(course);
}

/**
 * 저장 코스를 날짜별 색상으로 꾸민 지도 데이터로 변환한다.
 * 출발지는 선에는 포함하지만 번호를 부여하지 않고, 방문 장소만 그날의 순서로 표시한다.
 */
export function savedCourseToMapDecoration(
  course: SavedCourse,
): SavedCourseMapDecoration {
  return buildCourseMapDecoration(course);
}

function buildCourseMapDecoration(
  course: RecommendedCourse,
): SavedCourseMapDecoration {
  const markers: CourseMarker[] = [];
  const connectionLines: MapConnectionLine[] = [];
  const days: SavedCourseMapDecoration["days"] = [];

  course.daily_schedules.forEach((day, dayIndex) => {
    const color = COURSE_DAY_COLORS[dayIndex % COURSE_DAY_COLORS.length]!;
    days.push({ date: day.date, color });
    const start = courseToLatLng(day.start_location);
    const orderedPlaces = [...day.places].sort(
      (a, b) => a.visit_order - b.visit_order,
    );

    markers.push({
      ...start,
      label: day.start_location.name,
      color,
      detail: { title: day.start_location.name, subtitle: "출발지" },
    });
    markers.push(
      ...orderedPlaces.map((place, placeIndex) => ({
        ...courseToLatLng(place),
        label: place.place_name,
        color,
        sequenceLabel: String(place.visit_order || placeIndex + 1),
        detail: placeToDetail(place),
      })),
    );

    const coordinates = [
      [start.lng, start.lat],
      ...orderedPlaces.map((place) => {
        const point = courseToLatLng(place);
        return [point.lng, point.lat];
      }),
    ];
    if (coordinates.length > 1) {
      connectionLines.push({ coordinates, color });
    }
  });

  return { markers, connectionLines, days };
}

/** 코스의 방문 장소(RecommendedPlace) 하나를 지도 마커(좌표+상세 카드)로 변환. */
export function recommendedPlaceToMarker(place: RecommendedPlace): CourseMarker {
  return {
    ...courseToLatLng(place),
    label: place.place_name,
    detail: placeToDetail(place),
  };
}

/** 코스의 하루 출발지(start_location)를 지도 마커(좌표+상세 카드)로 변환. */
export function courseStartToMarker(
  start: DailySchedule["start_location"],
): CourseMarker {
  return {
    ...courseToLatLng(start),
    label: start.name,
    detail: { title: start.name, subtitle: "출발지" },
  };
}
