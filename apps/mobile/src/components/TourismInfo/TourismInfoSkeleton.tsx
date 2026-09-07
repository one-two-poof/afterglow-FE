import { View } from "react-native";

import { useI18n } from "@/i18n/i18n-provider";

export function TourismInfoSkeleton() {
  const { t } = useI18n();

  return (
    <View
      accessibilityRole="progressbar"
      accessibilityLabel={t("tourism.loading")}
      className="bg-surface"
    >
      {Array.from({ length: 5 }).map((_, index) => (
        <View
          key={index}
          className="gap-3 border-border px-5 py-4 flex-row border-b"
        >
          <View className="size-20 bg-surface-muted rounded-[8px]" />
          <View className="gap-2 flex-1 justify-center">
            <View className="h-3 w-20 bg-surface-muted rounded-full" />
            <View className="h-4 bg-surface-muted w-2/3 rounded-full" />
            <View className="h-3 bg-surface-muted w-full rounded-full" />
          </View>
        </View>
      ))}
    </View>
  );
}
