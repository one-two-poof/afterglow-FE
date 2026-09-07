/**
 * 코스 선택(저장) API 클라이언트.
 * 인증 헤더 첨부·에러 정규화는 aiClient 인터셉터(lib/axios)가 담당한다.
 */
import { aiClient } from "@/lib/axios";

/** 코스 선택 요청 스키마 */
export interface CourseSelectionRequest {
  course_id: number;
}

/** 코스를 선택(저장)한다. */
export async function postCourseSelection(courseId: number): Promise<unknown> {
  const body: CourseSelectionRequest = { course_id: courseId };
  const { data } = await aiClient.post("/api/course-selection", body);
  return data;
}
