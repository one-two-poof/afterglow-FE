/**
 * 앱 인증 유틸 (axios 인터셉터 · MyPage가 사용).
 *
 * 로그인은 **백엔드 OAuth2 리다이렉트** 방식이다(Spring Security).
 * 백엔드가 Google 인증 전 과정을 서버에서 처리하고, 최종적으로 토큰을 URL 쿼리로
 * 돌려준다. 앱은 인앱 브라우저로 로그인 URL을 열고, 백엔드가 앱 딥링크
 * `afterglow://oauth/callback?token=...` 로 리다이렉트하면 그 URL에서 token을 꺼낸다.
 *   앱 → openAuthSessionAsync({API}/api/auth/login/google) → (백엔드 OAuth2) →
 *   afterglow://oauth/callback?token=... → token 저장
 *
 * 토큰 저장 제약: axios 요청 인터셉터와 useAccessToken은 토큰을 **동기(sync)** 로
 * 읽어야 하는데 expo-secure-store는 **비동기(async)** 다. 그래서:
 *   - 부팅 시 `hydrateAccessToken()`으로 secure-store → **메모리 캐시**에 1회 로드
 *   - 이후 `getAccessToken()`은 메모리 캐시를 동기로 반환
 *   - 로그인/로그아웃은 메모리 + secure-store를 갱신하고 구독자에게 통지(emit)
 */
import * as Linking from "expo-linking";
import * as SecureStore from "expo-secure-store";
import * as WebBrowser from "expo-web-browser";

import { env } from "@/lib/env";

const ACCESS_TOKEN_KEY = "accessToken";

/**
 * 백엔드가 로그인 성공 후 토큰을 붙여 리다이렉트할 앱 딥링크.
 * app.json의 `"scheme": "afterglow"` 에 대응하며, dev build·배포 빌드 모두 동작한다.
 */
const OAUTH_REDIRECT_URI = "afterglow://oauth/callback";

/** 백엔드 OAuth2 로그인 진입 경로. GET 진입 → 서버가 Google로 리다이렉트. */
const GOOGLE_LOGIN_PATH = "api/auth/login/google";

/** 로그인 사용자 정보 (GET /api/auth/me 응답) */
export interface AuthUser {
  id: number;
  name: string;
  email: string;
  /** Google 프로필 이미지 URL (없을 수 있음) */
  profileImageUrl?: string;
  role?: string;
  createdAt?: string;
}

/** 401/403 등 인증 실패를 일반 에러와 구분하기 위한 타입 */
export class UnauthorizedError extends Error {
  constructor(message = "Unauthorized") {
    super(message);
    this.name = "UnauthorizedError";
  }
}

// --- 메모리 캐시 + 구독 모델 (useSyncExternalStore용) -----------------------
// undefined: 아직 secure-store에서 로드 전(hydrate 전) → 로딩 스켈레톤
// null      : 토큰 없음 → 로그인 안내
// string    : 로그인됨
let currentToken: string | null | undefined = undefined;

const listeners = new Set<() => void>();
const emit = () => listeners.forEach((listener) => listener());

/** 토큰 변경 구독. useSyncExternalStore가 리렌더를 위해 사용한다. */
export const subscribeAccessToken = (onChange: () => void): (() => void) => {
  listeners.add(onChange);
  return () => {
    listeners.delete(onChange);
  };
};

/** 액세스 토큰 동기 조회 (메모리 캐시). axios 인터셉터·useAccessToken이 사용. */
export const getAccessToken = (): string | null | undefined => currentToken;

/**
 * 앱 부팅 시 1회 호출. secure-store의 토큰을 메모리 캐시로 로드한다.
 * 로드 후 currentToken은 string(로그인) 또는 null(미로그인)로 확정된다.
 */
export const hydrateAccessToken = async (): Promise<void> => {
  try {
    const stored = await SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
    currentToken = stored ?? null;
  } catch {
    // secure-store 접근 실패 시 미로그인으로 간주(로그인 화면으로 유도)
    currentToken = null;
  }
  emit();
};

/** 토큰 저장 (로그인 성공 시). 메모리·구독자 먼저 갱신하고 secure-store에 기록. */
const setAccessToken = async (token: string): Promise<void> => {
  currentToken = token;
  emit();
  try {
    await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, token);
  } catch {
    // 저장 실패해도 이번 세션은 메모리 토큰으로 동작한다.
  }
};

/**
 * 액세스 토큰 삭제 (로그아웃/만료 시).
 * 컴포넌트에서 동기로 호출되므로 메모리·통지는 즉시, secure-store 삭제는 비동기로.
 */
export const clearAccessToken = (): void => {
  currentToken = null;
  emit();
  void SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY).catch(() => {
    // 삭제 실패는 무시 (다음 실행 시 401로 정리됨)
  });
};

/** `env.apiUrl` 기준으로 백엔드 경로 URL을 만든다(슬래시 중복/누락 방지). */
const buildApiUrl = (path: string): string => {
  const base = (env.apiUrl ?? "").replace(/\/$/, "");
  return `${base}/${path.replace(/^\//, "")}`;
};

/**
 * Google 로그인 시작.
 * 인앱 브라우저로 백엔드 로그인 URL을 열고, 백엔드가 `OAUTH_REDIRECT_URI`로
 * 토큰을 붙여 리다이렉트하면 그 URL을 받아 token을 저장한다.
 *
 * @returns 로그인 성공 여부 (사용자가 취소하면 false)
 * @throws  응답에 token이 없으면 Error (호출부에서 토스트로 안내)
 */
export const startGoogleLogin = async (): Promise<boolean> => {
  // 로그인 진입 URL만 연다(별도 파라미터 없음). 백엔드가 모바일
  // 요청을 앱 딥링크(OAUTH_REDIRECT_URI)로 리다이렉트하도록 설정돼 있다.
  const loginUrl = buildApiUrl(GOOGLE_LOGIN_PATH);

  const result = await WebBrowser.openAuthSessionAsync(
    loginUrl,
    OAUTH_REDIRECT_URI,
  );

  if (result.type !== "success" || !result.url) {
    // dismiss/cancel 등 — 로그인 미완료
    return false;
  }
  const { queryParams } = Linking.parse(result.url);
  const token = queryParams?.token;
  if (typeof token !== "string" || token.length === 0) {
    throw new Error("로그인 응답에 토큰이 없습니다.");
  }

  await setAccessToken(token);
  return true;
};
