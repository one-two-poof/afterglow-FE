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
        <Text numberOfLines={2} className="text-label-lg text-text">
          {place.placeName}
        </Text>
        {address ? (
          <Text numberOfLines={2} className="text-body-sm text-text-muted">
            {address}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}
