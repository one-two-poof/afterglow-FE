import { colors } from "@afterglow/tokens";
import { ChevronRight } from "lucide-react-native";
import { Pressable, Text, View } from "react-native";

import { PlaceThumbnail } from "@/components/PlaceThumbnail";
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
  const address = place.roadAddressName || place.addressName;
  const normalizedPlaceType = place.placeType.toUpperCase();
  const fallbackCategory =
    normalizedPlaceType === "HOSPITAL"
      ? t("tourism.category.hospital")
      : normalizedPlaceType === "ACCOMMODATION"
        ? t("tourism.category.accommodation")
        : t("tourism.category.attraction");
  const category =
    place.primaryTypeName ||
    place.categoryName ||
    fallbackCategory;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t("tourism.place.open", { name: place.placeName })}
      onPress={onPress}
      className="gap-3 border-border bg-surface px-5 py-4 active:bg-surface-muted flex-row items-center border-b"
    >
      <PlaceThumbnail
        imageUrl={place.image}
        placeType={place.placeType}
        primaryTypeName={place.primaryTypeName}
        className="size-20 rounded-[8px]"
      />
      <View className="min-w-0 gap-1 flex-1">
        <Text className="text-label-sm text-primary">{category}</Text>
        <Text numberOfLines={2} className="text-label-lg text-text">
          {place.placeName}
        </Text>
        {address ? (
          <Text numberOfLines={2} className="text-body-sm text-text-muted">
            {address}
          </Text>
        ) : null}
      </View>
      <ChevronRight size={20} color={colors["text-muted"]} />
    </Pressable>
  );
}
