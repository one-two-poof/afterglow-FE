import { useMutation } from "@tanstack/react-query";

import { fetchRecommendedCourses } from "@/lib/course";

/**
 * 여행 계획 폼 제출 → ML ① 추천 코스 목록을 받는 mutation.
 * 결과는 mutation.data 로 노출된다 (rank 순 RecommendedCourse[]).
 */
export const useRecommendCourses = () =>
  useMutation({
    mutationFn: fetchRecommendedCourses,
  });
