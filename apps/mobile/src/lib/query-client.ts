import { QueryClient } from "@tanstack/react-query";

/**
 * react-query 클라이언트 팩토리.
 *
 * 컴포넌트 밖에서 단 한 번 생성해 재사용해야 하므로, 프로바이더의 useState 초기화
 * 함수에서 호출한다.
 */
export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000,
        retry: 2,
      },
    },
  });
}
