/**
 * 저장된(내) 코스 목록 API 클라이언트.
 * 인증 헤더 첨부·에러 정규화는 apiClient 인터셉터(lib/axios, PR 2)가 담당한다.
 */
import { apiClient } from "@/lib/axios";
import type { SavedCourse } from "@/types/recommendation";

/** 저장된 코스 목록 조회 (파라미터 없음). */
export async function fetchRecommendations(): Promise<SavedCourse[]> {
  const { data } = await apiClient.get<SavedCourse[]>("/api/recommendations");
  return data;
}
