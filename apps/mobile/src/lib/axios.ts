/**
 * 공용 axios 클라이언트 + 인터셉터.
 * - 요청: 액세스 토큰이 있으면 Bearer 헤더로 자동 첨부 (토큰 조회는 PR 18에서 구현)
 * - 응답: 401/403은 UnauthorizedError로, 그 외 실패는 상태코드를 담은 Error로 정규화
 * - 응답 실패는 정규화로 원래 정보가 사라지기 전에 lib/monitoring으로 리포트한다
 *
 * base URL이 둘이라 인스턴스를 분리한다:
 * - apiClient: 메인 BE (EXPO_PUBLIC_API_URL)
 * - aiClient : ML 추천 서버 (EXPO_PUBLIC_AI_API_URL)
 */
import axios, { AxiosError, type AxiosInstance } from "axios";

import { getAccessToken, UnauthorizedError } from "@/lib/auth";
import { env } from "@/lib/env";
import { reportRequestFailure } from "@/lib/monitoring";

const createClient = (
  baseURL: string | undefined,
  { name, withAuth = false }: { name: string; withAuth?: boolean },
): AxiosInstance => {
  // eslint-disable-next-line import/no-named-as-default-member -- axios 기본 export의 정적 메서드 사용 (의도된 패턴)
  const client = axios.create({
    baseURL,
    headers: { "Content-Type": "application/json" },
  });

  // 요청 인터셉터: withAuth인 클라이언트만 토큰이 있으면 Authorization 첨부
  if (withAuth) {
    client.interceptors.request.use((config) => {
      const token = getAccessToken();
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });
  }

  // 응답 인터셉터: 에러를 앱 표준 형태로 정규화 (401/403 → UnauthorizedError)
  client.interceptors.response.use(
    (response) => response,
    (error: AxiosError) => {
      const status = error.response?.status;
      // 여기까지 온 실패는 아래에서 사용자 문구로 바뀌며 원래 정보가 사라진다.
      // 버리기 전에 리포트한다(401/403과 DSN 미설정은 monitoring 쪽에서 걸러진다).
      reportRequestFailure(error, {
        client: name,
        endpoint: error.config?.url,
        status,
      });
      if (status === 401 || status === 403) {
        return Promise.reject(new UnauthorizedError());
      }
      const message = status
        ? `요청 실패 (${status})`
        : "네트워크 오류가 발생했어요. 잠시 후 다시 시도해주세요.";
      return Promise.reject(new Error(message));
    },
  );

  return client;
};

/** 메인 BE (인증 필요 — 토큰 자동 첨부) */
export const apiClient = createClient(env.apiUrl, {
  name: "main",
  withAuth: true,
});

/** ML 추천 서버 (인증 필요 — 토큰 자동 첨부) */
export const aiClient = createClient(env.aiApiUrl, {
  name: "ai",
  withAuth: true,
});
