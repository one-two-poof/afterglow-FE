import { useMutation, useQueryClient } from "@tanstack/react-query";

import { postCourseSelection } from "@/lib/course-selection";

/**
 * 코스 선택(저장) mutation.
 *
 * 저장에 성공하면 저장 코스 목록 쿼리(["recommendations"])를 무효화한다.
 * 이 쿼리는 홈 지도 하단의 코스 태그(index.tsx)와 내 코스 목록(MyCourse) 양쪽이
 * 함께 읽으므로, 무효화 한 번으로 두 화면이 모두 최신화된다.
 */
export const useCourseSelection = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: postCourseSelection,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recommendations"] });
    },
  });
};
