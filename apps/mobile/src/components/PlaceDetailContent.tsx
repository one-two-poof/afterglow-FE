import { colors } from "@afterglow/tokens";
import { Phone } from "lucide-react-native";
import { Pressable, ScrollView, Text, View } from "react-native";

import { Image } from "@/components/Image";
import type { MarkerDetail } from "@/components/MapLibreMap/types";
import { PlaceDetailFacts } from "@/components/PlaceDetailFacts";
import { useI18n } from "@/i18n/i18n-provider";
import {
  getPlaceDetailImages,
  normalizePlaceDetailText,
} from "@/lib/place-detail";
import type { PlaceDetail } from "@/types/place";

interface PlaceDetailContentProps {
  detail: MarkerDetail;
  placeInfo?: PlaceDetail;
  loading: boolean;
  error: boolean;
  onRetry: () => void;
}

export function PlaceDetailContent({
  detail,
  placeInfo,
  loading,
  error,
  onRetry,
}: PlaceDetailContentProps) {
  const { t } = useI18n();
  const images = getPlaceDetailImages({
    image: placeInfo?.image ?? detail.image,
    images: placeInfo?.images,
  });
  const address = placeInfo?.addressName || detail.address;
  const phone = placeInfo?.phone || detail.phone;

  return (
    <View className="gap-5 pb-2">
      {images.length > 0 ? (
        <View className="gap-2">
          <Text className="text-label-sm text-text-muted">
            {t("home.detail.section.gallery")}
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerClassName="gap-2"
          >
            {images.map((uri, index) => (
              <Image
                key={uri}
                source={{ uri }}
                accessibilityLabel={t("home.detail.imageLabel", {
                  index: index + 1,
                })}
                className="h-36 w-60 rounded-[8px] bg-surface-muted"
                contentFit="cover"
                cachePolicy="memory-disk"
                recyclingKey={uri}
                transition={100}
              />
            ))}
          </ScrollView>
        </View>
      ) : null}

      {address ? (
        <View>
          <Text className="text-label-sm text-text-muted">
            {t("home.detail.address")}
          </Text>
          <Text className="mt-1 text-body-md text-text">{address}</Text>
        </View>
      ) : null}

      {detail.description ? (
        <Text className="text-body-md text-text-secondary">
          {detail.description}
        </Text>
      ) : null}

      {phone ? (
        <View className="flex-row items-center gap-2">
          <Phone size={18} color={colors["text-secondary"]} />
          <Text className="text-body-md text-text">{phone}</Text>
        </View>
      ) : null}

      {loading ? (
        <View
          accessibilityRole="progressbar"
          className="rounded-[8px] bg-surface-muted p-4"
        >
          <Text className="text-body-sm text-text-secondary">
            {t("home.detail.loading")}
          </Text>
        </View>
      ) : null}

      {error ? (
        <View
          accessibilityRole="alert"
          className="items-start gap-2 rounded-[8px] bg-surface-muted p-4"
        >
          <Text className="text-body-sm text-text-secondary">
            {t("home.detail.error")}
          </Text>
          <Pressable
            accessibilityRole="button"
            onPress={onRetry}
            className="min-h-11 justify-center"
          >
            <Text className="text-label-md text-primary">
              {t("home.detail.retry")}
            </Text>
          </Pressable>
        </View>
      ) : null}

      {placeInfo?.overview ? (
        <View className="gap-1">
          <Text className="text-label-sm text-text-muted">
            {t("home.detail.section.overview")}
          </Text>
          <Text className="text-body-md text-text-secondary">
            {normalizePlaceDetailText(placeInfo.overview)}
          </Text>
        </View>
      ) : null}

      {placeInfo ? <PlaceDetailFacts placeInfo={placeInfo} /> : null}
    </View>
  );
}
