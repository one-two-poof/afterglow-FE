/**
 * 장소(숙소·병원 등) 목록 API 클라이언트. 웹 lib/places의 앱 버전.
 * 인증 헤더 첨부·에러 정규화는 apiClient 인터셉터(lib/axios, PR 2)가 담당한다.
 */
import type { MapBounds } from "@/components/MapLibreMap/types";
import { apiClient } from "@/lib/axios";
import { buildPlaceDetailRequest } from "@/lib/place-detail";
import type { Place, PlaceDetail } from "@/types/place";

/** 같은 id가 여러 번 오면 첫 항목만 남긴다 (입력 순서 유지). */
const dedupeById = (places: Place[]): Place[] => {
  const byId = new Map<number, Place>();
  for (const place of places) {
    if (!byId.has(place.id)) {
      byId.set(place.id, place);
    }
  }
  return [...byId.values()];
};

// 백엔드 지오코딩 실패분은 한국 밖 sentinel 좌표(예: mapX 117.99 / mapY 19.69)로
// 내려온다. 실제 주소는 서울인데 좌표만 엉뚱해, 지도에 찍으면 마커가 바다에
// 떨어지고 fitBounds가 지도를 엉뚱한 곳(서울~남중국해 중간)으로 끌고 간다.
// 한국 대략 경계를 벗어난 좌표는 표시 대상에서 제외한다.
const KOREA_BOUNDS = { minLng: 124, maxLng: 132, minLat: 33, maxLat: 39 };
const hasValidKoreaCoord = (p: Place): boolean =>
  typeof p.mapX === "number" &&
  typeof p.mapY === "number" &&
  p.mapX >= KOREA_BOUNDS.minLng &&
  p.mapX <= KOREA_BOUNDS.maxLng &&
  p.mapY >= KOREA_BOUNDS.minLat &&
  p.mapY <= KOREA_BOUNDS.maxLat;

/** 중복 제거 + 지도에 찍을 수 없는(한국 밖) 좌표 제외. */
const sanitize = (places: Place[]): Place[] =>
  dedupeById(places).filter(hasValidKoreaCoord);

/** 장소 목록 조회. name으로 검색, 생략 시 전체 조회. */
export async function fetchPlaces(name?: string): Promise<Place[]> {
  const { data } = await apiClient.get<Place[]>("/api/places", {
    params: name ? { name } : undefined,
  });
  // 중복 제거 + 잘못된(한국 밖) 좌표 제외
  return sanitize(data);
}

/** 장소 ID와 유형으로 상세 정보(소개, 이미지, 유형별 부가 정보)를 조회한다. */
export async function fetchPlaceDetail(
  id: number,
  placeType: string,
): Promise<PlaceDetail> {
  const request = buildPlaceDetailRequest(id, placeType);
  const { data } = await apiClient.get<Omit<PlaceDetail, "placeType">>(
    request.url,
    { params: request.params },
  );
  return { ...data, placeType: request.params.placeType };
}

/** 지도 카테고리 필터 종류 (웹 lib/places와 동일). */
export type PlaceCategory = "hospital" | "accommodation" | "attraction";

/**
 * 카테고리별 장소 조회. name 생략 시 해당 카테고리 전체.
 * bounds를 주면 지도 뷰포트(swLat/neLat/swLng/neLng)로 결과를 제한한다.
 * (넷 다 함께 보내야 하며, 생략 시 전체 반환 — 백엔드 계약)
 */
const fetchPlacesByCategory = async (
  category: PlaceCategory,
  name?: string,
  bounds?: MapBounds,
): Promise<Place[]> => {
  const { data } = await apiClient.get<Place[]>(`/api/places/${category}`, {
    params: {
      ...(name ? { name } : {}),
      ...(bounds ?? {}),
    },
  });
  return sanitize(data);
};

/** 병원 목록 (name 생략 시 전체, bounds 주면 뷰포트로 제한) */
export const fetchHospitals = (name?: string, bounds?: MapBounds) =>
  fetchPlacesByCategory("hospital", name, bounds);

/** 숙소 목록 (name 생략 시 전체, bounds 주면 뷰포트로 제한) */
export const fetchAccommodations = (name?: string, bounds?: MapBounds) =>
  fetchPlacesByCategory("accommodation", name, bounds);

/** 관광명소 목록 (name 생략 시 전체, bounds 주면 뷰포트로 제한) */
export const fetchAttractions = (name?: string, bounds?: MapBounds) =>
  fetchPlacesByCategory("attraction", name, bounds);
