import { useQuery } from "@tanstack/react-query";

import { fetchPlaces } from "@/lib/places";

/**
 * 장소(숙소·병원 등) 목록을 조회한다.
 * @param name 검색어. 생략 시 전체 목록.
 * @param options.enabled false면 요청하지 않음 (예: 빈 검색어일 때)
 */
export const usePlaces = (name?: string, options?: { enabled?: boolean }) =>
  useQuery({
    queryKey: ["places", name?.trim() ?? ""],
    queryFn: () => fetchPlaces(name),
    enabled: options?.enabled ?? true,
  });
