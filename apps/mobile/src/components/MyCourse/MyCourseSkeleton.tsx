import { View } from "react-native";
import { useI18n } from "@/i18n/i18n-provider";

/**
 * 인증 확인 / 코스 로딩 중 스켈레톤. RN엔 animate-pulse가 없어
 * 정적 회색 박스로 대체한다(필요 시 이후 Animated 펄스 추가).
 */
export function MyCourseSkeleton() {
  const { t } = useI18n();
  return (
    <View accessibilityLabel={t("course.loading")} className="px-5 py-6">
      <View className="h-7 w-24 rounded bg-surface-muted" />
      <View className="mt-4 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <View
            key={i}
            className="rounded-[16px] border border-border bg-surface p-4"
          >
            <View className="h-5 w-32 rounded bg-surface-muted" />
            <View className="mt-3 h-24 rounded bg-surface-muted" />
          </View>
        ))}
      </View>
    </View>
  );
}
