/**
 * 앱 공용 이미지 컴포넌트.
 *
 * RN 기본 `Image`는 메모리·디스크 캐시 제어가 약해 원격 이미지를 스크롤/재조회 때마다
 * 다시 받는다. 대신 `expo-image`를 쓰되, NativeWind가 `expo-image`를 내장 지원하지
 * 않으므로 `cssInterop`으로 `className → style` 매핑을 이 모듈에서 1회 등록한다.
 *
 * 앱 내 모든 원격 이미지는 이 모듈의 `Image`를 사용해 캐시를 공유한다.
 */
import { Image } from "expo-image";
import { cssInterop } from "nativewind";

cssInterop(Image, { className: "style" });

export { Image };
