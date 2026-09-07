import { useQuery } from "@tanstack/react-query";

import type { MapBounds } from "@/components/MapLibreMap/types";
import {
  fetchAccommodations,
  fetchAttractions,
  fetchHospitals,
  type PlaceCategory,
} from "@/lib/places";
import type { Place } from "@/types/place";

const FETCHERS: Record<
  PlaceCategory,
  (name?: string, bounds?: MapBounds) => Promise<Place[]>
> = {
  hospital: fetchHospitals,
  accommodation: fetchAccommodations,
  attraction: fetchAttractions,
};

// 병원·관광명소·숙소는 거의 변하지 않으므로 하루 동안 캐시를 신선하게 유지.
// (뷰포트가 바뀌면 queryKey가 달라져 해당 영역을 새로 조회한다)
const ONE_DAY_MS = 1000 * 60 * 60 * 24;

// The category endpoints currently require a non-empty `name` parameter.
// `%` is the backend's match-all value, so bounds remain the actual filter.
const ALL_NAMES = "%";

/**
 * 선택한 카테고리의 장소 목록을 조회한다.
 * category가 null("전체")이면 요청하지 않는다.
 * bounds를 주면 지도 뷰포트로 결과를 제한하고, 뷰포트가 바뀔 때마다 다시 조회한다.
 */
export const useCategoryPlaces = (
  category: PlaceCategory | null,
  bounds?: MapBounds | null,
) =>
  useQuery({
    queryKey: ["places", "category", category, bounds ?? null],
    queryFn: () => FETCHERS[category!](ALL_NAMES, bounds!),
    enabled: category !== null && bounds != null,
    staleTime: ONE_DAY_MS,
    gcTime: ONE_DAY_MS,
  });
