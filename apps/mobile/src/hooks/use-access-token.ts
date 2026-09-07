import { useSyncExternalStore } from "react";

import { getAccessToken, subscribeAccessToken } from "@/lib/auth";

/**
 * 액세스 토큰을 반응형으로 읽는다.
 * - `undefined` : 아직 확인 전(hydrate 전) → 로딩 스켈레톤
 * - `null`      : 토큰 없음 → 로그인 안내
 * - `string`    : 로그인됨
 *
 * 토큰은 lib/auth의 메모리 캐시 + 구독 모델로 관리된다. 로그인/로그아웃 시
 * emit()으로 통지되어 이 훅을 쓰는 컴포넌트가 리렌더된다.
 */
export const useAccessToken = (): string | null | undefined =>
  useSyncExternalStore(subscribeAccessToken, getAccessToken);
