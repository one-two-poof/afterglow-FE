/**
 * Expo 공개 환경변수 접근.
 *
 * Expo는 `EXPO_PUBLIC_` 접두사가 붙은 변수만 클라이언트 번들에 인라인한다(웹의
 * `NEXT_PUBLIC_`에 해당). babel-preset-expo가 빌드 시 `process.env.EXPO_PUBLIC_*`
 * 정적 참조를 실제 문자열로 치환하므로, 반드시 이 형태로 직접 읽어야 한다.
 *
 * 값은 `.env`(로컬) 또는 EAS 빌드 환경에서 주입된다. 예시는 `.env.example` 참고.
 */
export const env = {
  /** 메인 BE (인증/코스/장소 등) */
  apiUrl: process.env.EXPO_PUBLIC_API_URL,
  /** ML 추천 서버 */
  aiApiUrl: process.env.EXPO_PUBLIC_AI_API_URL,
  /** 건물 PMTiles 타일 URL (지도, PR 14~) */
  buildingsPmtilesUrl: process.env.EXPO_PUBLIC_BUILDINGS_PMTILES_URL,
  /**
   * Sentry DSN. 없으면 에러 리포팅이 통째로 꺼진다(lib/monitoring.ts).
   * DSN은 공개돼도 되는 값이라 EXPO_PUBLIC_로 두고 eas.json에 넣어도 된다.
   */
  sentryDsn: process.env.EXPO_PUBLIC_SENTRY_DSN,
} as const;
