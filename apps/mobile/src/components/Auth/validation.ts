/**
 * 클라이언트 측 인증 폼 유효성 검사.
 * 서버 검증을 대체하는 게 아니라, 명백한 입력 실수를 제출 전에 잡아 UX를 개선한다.
 */

/** 최소 비밀번호 길이(회원가입). 백엔드 정책과 맞춰야 한다. */
export const MIN_PASSWORD_LENGTH = 8;

// 지나치게 엄격하면 유효한 주소를 막으므로, 공백 없는 local@domain.tld 정도만 확인한다.
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const isValidEmail = (value: string): boolean =>
  EMAIL_PATTERN.test(value.trim());
