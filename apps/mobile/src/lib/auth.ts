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

/**
 * 백엔드 Apple 로그인 진입 경로. Google과 동일한 서버 리다이렉트 방식이다.
 *
 * NOTE: iOS 네이티브 Apple 로그인(expo-apple-authentication)으로 바꾸려면 이 상수
 * 대신 네이티브 SDK로 identityToken을 받아 백엔드에 POST하도록 startAppleLogin만
 * 교체하면 된다. 화면/버튼 UI는 그대로 재사용된다.
 */
const APPLE_LOGIN_PATH = "api/auth/login/apple";

/** 자체(이메일) 로그인 경로. POST { email, password } → { accessToken, ... }. */
const EMAIL_LOGIN_PATH = "api/auth/login";

/** 자체(이메일) 회원가입 경로. POST { email, password, passwordConfirm } → { accessToken, ... }. */
const EMAIL_SIGNUP_PATH = "api/auth/signup";

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
 * 백엔드 OAuth2 리다이렉트 로그인 공통 처리(Google·Apple 공유).
 * 인앱 브라우저로 백엔드 로그인 URL을 열고, 백엔드가 `OAUTH_REDIRECT_URI`로
 * 토큰을 붙여 리다이렉트하면 그 URL에서 token을 꺼내 저장한다.
 *
 * @returns 로그인 성공 여부 (사용자가 취소하면 false)
 * @throws  응답에 token이 없으면 Error (호출부에서 토스트로 안내)
 */
const startOAuthRedirectLogin = async (loginPath: string): Promise<boolean> => {
  const loginUrl = buildApiUrl(loginPath);

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

/**
 * Google 로그인 시작. 백엔드가 모바일 요청을 앱 딥링크로 리다이렉트한다.
 * @returns 로그인 성공 여부 (사용자가 취소하면 false)
 */
export const startGoogleLogin = (): Promise<boolean> =>
  startOAuthRedirectLogin(GOOGLE_LOGIN_PATH);

/**
 * Apple 로그인 시작. 현재는 Google과 동일한 백엔드 리다이렉트 방식이다.
 * (네이티브 Apple 로그인으로의 교체 지점은 `APPLE_LOGIN_PATH` 주석 참고)
 * @returns 로그인 성공 여부 (사용자가 취소하면 false)
 */
export const startAppleLogin = (): Promise<boolean> =>
  startOAuthRedirectLogin(APPLE_LOGIN_PATH);

/**
 * 자체 로그인/회원가입 성공 응답 형태.
 * 백엔드는 `{ accessToken, tokenType, expiresIn }`을 돌려준다. 현재 앱은
 * accessToken만 저장해 Bearer로 쓰고, tokenType·expiresIn은 아직 사용하지 않는다.
 */
interface TokenResponse {
  accessToken: string;
  tokenType: string;
  expiresIn: number;
}

/**
 * 자체 인증 엔드포인트(POST)에 JSON을 보내고 { accessToken }을 받아 저장한다.
 * apiClient(lib/axios) 대신 fetch를 쓰는 이유: apiClient는 lib/auth를 import하므로
 * 여기서 apiClient를 쓰면 순환 참조가 된다. 로그인 전이라 인증 헤더도 필요 없다.
 *
 * @throws 네트워크 실패 또는 4xx/5xx 응답 시 Error (호출부에서 토스트로 안내)
 */
const postCredentials = async (
  path: string,
  body: Record<string, string>,
): Promise<void> => {
  const response = await fetch(buildApiUrl(path), {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      throw new UnauthorizedError();
    }
    throw new Error(`인증 요청 실패 (${response.status})`);
  }

  const data = (await response.json()) as Partial<TokenResponse>;
  if (typeof data.accessToken !== "string" || data.accessToken.length === 0) {
    throw new Error("응답에 토큰이 없습니다.");
  }

  await setAccessToken(data.accessToken);
};

/** 이메일·비밀번호로 로그인한다. 성공 시 토큰을 저장한다. */
export const loginWithEmail = (params: {
  email: string;
  password: string;
}): Promise<void> =>
  postCredentials(EMAIL_LOGIN_PATH, {
    email: params.email,
    password: params.password,
  });

/**
 * 이메일·비밀번호로 회원가입한다. 성공 시 바로 로그인 상태가 된다.
 * 백엔드가 서버에서도 일치를 검증하므로 passwordConfirm까지 함께 보낸다.
 */
export const signUpWithEmail = (params: {
  email: string;
  password: string;
  passwordConfirm: string;
}): Promise<void> =>
  postCredentials(EMAIL_SIGNUP_PATH, {
    email: params.email,
    password: params.password,
    passwordConfirm: params.passwordConfirm,
  });
