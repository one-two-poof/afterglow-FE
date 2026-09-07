import { useQuery } from "@tanstack/react-query";

import { fetchRecommendations } from "@/lib/recommendations";

/**
 * 저장된(내) 코스 목록을 조회한다.
 * @param enabled false면 요청하지 않음 (예: 미로그인 상태)
 */
export const useRecommendations = (enabled = true) =>
  useQuery({
    queryKey: ["recommendations"],
    queryFn: fetchRecommendations,
    enabled,
  });
