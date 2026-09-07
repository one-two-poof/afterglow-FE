import { useLocalSearchParams, useRouter } from "expo-router";
import { Pressable, ScrollView, Text, View } from "react-native";

import { PlaceDetailContent } from "@/components/PlaceDetailContent";
import { ScreenHeader } from "@/components/ScreenHeader";
import { usePlaceDetail } from "@/hooks/use-place-detail";
import { useI18n } from "@/i18n/i18n-provider";
import { tourismPlaceToMapParams } from "@/lib/tourism-place-navigation";

export function TourismPlaceDetail() {
  const { t } = useI18n();
  const router = useRouter();
  const { id: rawId, placeType } = useLocalSearchParams<{
    id?: string;
    placeType?: string;
  }>();
  const id = Number(rawId);
  const isValidPlace = Number.isInteger(id) && id > 0 && Boolean(placeType);
  const placeDetailQuery = usePlaceDetail(id, placeType, {
    enabled: isValidPlace,
  });
  const place = placeDetailQuery.data;

  if (!isValidPlace) {
    return (
      <View className="bg-bg flex-1">
        <ScreenHeader title={t("tourism.detail.title")} />
        <View className="px-6 flex-1 items-center justify-center">
          <Text className="text-body-md text-text-secondary">
            {t("tourism.loadFailed")}
          </Text>
        </View>
      </View>
    );
  }

  const detail = {
    id,
    title: place?.placeName ?? t("tourism.detail.title"),
    subtitle: place?.primaryTypeName ?? place?.categoryName ?? undefined,
    address: place?.addressName ?? undefined,
    image: place?.image ?? undefined,
    phone: place?.phone ?? undefined,
    placeType,
    primaryTypeName: place?.primaryTypeName ?? undefined,
  };
  const canOpenMap = Boolean(
    place && Number.isFinite(place.mapX) && Number.isFinite(place.mapY),
  );

  return (
    <View className="bg-bg flex-1">
      <ScreenHeader title={detail.title} />
      <ScrollView contentContainerClassName="gap-5 px-5 py-5 pb-10">
        <PlaceDetailContent
          detail={detail}
          placeInfo={place}
          loading={placeDetailQuery.isLoading}
          error={placeDetailQuery.isError}
          onRetry={() => void placeDetailQuery.refetch()}
        />
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ disabled: !canOpenMap }}
          disabled={!canOpenMap}
          onPress={() => {
            if (!place) return;
            router.replace({
              pathname: "/",
              params: tourismPlaceToMapParams(place),
            });
          }}
          className={
            canOpenMap
              ? "min-h-12 bg-primary px-5 active:bg-action-primary-hover items-center justify-center rounded-[8px]"
              : "min-h-12 bg-surface-muted px-5 items-center justify-center rounded-[8px]"
          }
        >
          <Text
            className={
              canOpenMap
                ? "text-label-md text-on-action-primary"
                : "text-label-md text-text-muted"
            }
          >
            {t("tourism.detail.openMap")}
          </Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}
