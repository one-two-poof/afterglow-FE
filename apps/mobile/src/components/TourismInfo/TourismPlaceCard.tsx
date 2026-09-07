import { Pressable, Text } from "react-native";

import { useI18n } from "@/i18n/i18n-provider";
import type { Place } from "@/types/place";

export function TourismPlaceCard({
  place,
  onPress,
}: {
  place: Place;
  onPress: () => void;
}) {
  const { t } = useI18n();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t("tourism.place.open", { name: place.placeName })}
      onPress={onPress}
      className="min-h-14 border-border bg-surface px-5 active:bg-surface-muted justify-center border-b"
    >
      <Text numberOfLines={1} className="text-label-lg text-text">
        {place.placeName}
      </Text>
    </Pressable>
  );
}
