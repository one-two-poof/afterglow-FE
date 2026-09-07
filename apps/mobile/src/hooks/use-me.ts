import { useQuery } from "@tanstack/react-query";

import { UnauthorizedError } from "@/lib/auth";
import { getMe } from "@/lib/me";

/**
 * 로그인한 사용자 정보를 조회한다.
 * @param enabled 토큰 존재가 확인된 뒤에만 요청하도록 제어
 */
export const useMe = (enabled: boolean) =>
  useQuery({
    queryKey: ["me"],
    queryFn: getMe,
    enabled,
    staleTime: 5 * 60 * 1000,
    // 인증 실패(401/403)는 재시도해도 소용없으므로 즉시 실패 처리
    retry: (failureCount, error) =>
      !(error instanceof UnauthorizedError) && failureCount < 1,
  });
