/**
 * 통합 추천 코스 API(ML 서버) 클라이언트.
 * 여행 계획 폼 페이로드(TripPlanPayload)를 보내 rank별 추천 코스를 받는다.
 * 인증 헤더 첨부·에러 정규화는 aiClient 인터셉터(lib/axios, PR 2)가 담당한다.
 */
import type { TripPlanPayload } from "@/components/TripPlanPanel/types";
import { aiClient } from "@/lib/axios";
import type {
  RecommendationResponse,
  RecommendedCourse,
} from "@/types/recommendation";

/** 폼 제출 → rank 순 추천 코스 목록 */
export async function fetchRecommendedCourses(
  payload: TripPlanPayload,
): Promise<RecommendedCourse[]> {
  const { data } = await aiClient.post<RecommendationResponse>(
    "/api/course",
    payload,
  );
  return data.daily_recommendations;
}
