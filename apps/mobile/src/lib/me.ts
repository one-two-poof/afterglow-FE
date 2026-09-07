/**
 * 로그인 사용자 정보 API 클라이언트.
 * apiClient(lib/axios)가 다시
 * lib/auth를 import하므로 순환을 피하려고 별도 파일로 분리한다. 인증 헤더 첨부·
 * 401/403 → UnauthorizedError 정규화는 apiClient 인터셉터(PR 2)가 담당한다.
 */
import type { AuthUser } from "@/lib/auth";
import { apiClient } from "@/lib/axios";

/** 현재 로그인한 사용자 정보 조회. */
export async function getMe(): Promise<AuthUser> {
  const { data } = await apiClient.get<AuthUser>("/api/auth/me");
  return data;
}

/** 현재 로그인한 사용자의 계정과 연결된 데이터를 삭제한다. */
export async function deleteMe(): Promise<void> {
  await apiClient.delete("/api/auth/me");
}
