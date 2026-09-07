import { keepPreviousData, useQuery } from "@tanstack/react-query";

import { fetchPlaces } from "@/lib/places";

/**
 * 장소(숙소·병원 등) 목록을 조회한다.
 * @param name 검색어. 생략 시 전체 목록.
 * @param options.enabled false면 요청하지 않음 (예: 빈 검색어일 때)
 *
 * 검색은 타이핑마다 queryKey가 바뀌므로:
 * - placeholderData: 새 검색어 로딩 중에도 직전 결과를 유지해 화면이 깜빡이지 않게 한다.
 * - retry 0: 검색은 재시도로 매달리기보다 빠르게 실패하는 편이 체감이 낫다.
 */
export const usePlaces = (name?: string, options?: { enabled?: boolean }) =>
  useQuery({
    queryKey: ["places", name?.trim() ?? ""],
    queryFn: () => fetchPlaces(name),
    enabled: options?.enabled ?? true,
    placeholderData: keepPreviousData,
    retry: 0,
  });
