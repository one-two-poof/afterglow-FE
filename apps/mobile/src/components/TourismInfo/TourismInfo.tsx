import { colors } from "@afterglow/tokens";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  Text,
  View,
} from "react-native";
import { useMemo, useState } from "react";
import { SafeAreaView } from "react-native-safe-area-context";

import { PlaceDetailSheet } from "@/components/PlaceDetailSheet";
import { TourismInfoHeader } from "@/components/TourismInfo/TourismInfoHeader";
import { TourismInfoSkeleton } from "@/components/TourismInfo/TourismInfoSkeleton";
import { TourismPlaceCard } from "@/components/TourismInfo/TourismPlaceCard";
import { useDebounce } from "@/hooks/use-debounce";
import { useTourismPlaces } from "@/hooks/use-tourism-places";
import { useTourismPlaceActions } from "@/hooks/use-tourism-place-actions";
import { useI18n } from "@/i18n/i18n-provider";
import type { TourismBrowseCategory } from "@/lib/tourism-browse";
import type { Place } from "@/types/place";

export function TourismInfo() {
  const { t } = useI18n();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<TourismBrowseCategory>("all");
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);
  const [detailExpanded, setDetailExpanded] = useState(true);
  const debouncedSearch = useDebounce(search, 300);
  const {
    data: places = [],
    isLoading,
    isFetching,
    isError,
    refetch,
  } = useTourismPlaces(category, debouncedSearch);
  const { copyPlace, openInExternalMap } =
    useTourismPlaceActions(selectedPlace);

  const selectedDetail = useMemo(
    () =>
      selectedPlace
        ? {
            id: selectedPlace.id,
            title: selectedPlace.placeName,
            subtitle:
              selectedPlace.primaryTypeName || selectedPlace.categoryName,
            address: selectedPlace.roadAddressName || selectedPlace.addressName,
            image: selectedPlace.image || undefined,
            phone: selectedPlace.phone || undefined,
            placeType: selectedPlace.placeType,
            primaryTypeName: selectedPlace.primaryTypeName,
          }
        : null,
    [selectedPlace],
  );

  const chooseCategory = (nextCategory: TourismBrowseCategory) => {
    setCategory(nextCategory);
    setSelectedPlace(null);
  };

  const openPlace = (place: Place) => {
    setSelectedPlace(place);
    setDetailExpanded(true);
  };

  return (
    <SafeAreaView edges={["top"]} className="bg-bg flex-1">
      <TourismInfoHeader
        search={search}
        category={category}
        onSearchChange={setSearch}
        onCategoryChange={chooseCategory}
      />
      <View className="px-5 py-3 flex-row items-center justify-between">
        <Text className="text-label-md text-text">
          {t("tourism.results", { count: places.length })}
        </Text>
        {isFetching && !isLoading ? (
          <ActivityIndicator size="small" color={colors.primary} />
        ) : null}
      </View>

      {isLoading ? (
        <TourismInfoSkeleton />
      ) : isError ? (
        <View className="gap-3 px-6 flex-1 items-center justify-center">
          <Text className="text-heading-sm text-text">
            {t("tourism.loadFailed")}
          </Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => void refetch()}
            className="min-h-11 bg-primary px-5 active:bg-action-primary-hover justify-center rounded-[8px]"
          >
            <Text className="text-label-md text-on-action-primary">
              {t("common.retry")}
            </Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={places}
          keyExtractor={(place) => String(place.id)}
          renderItem={({ item }) => (
            <TourismPlaceCard place={item} onPress={() => openPlace(item)} />
          )}
          keyboardDismissMode="on-drag"
          keyboardShouldPersistTaps="handled"
          contentContainerClassName={
            places.length === 0 ? "flex-grow" : undefined
          }
          ListEmptyComponent={
            <View className="gap-1 px-6 pb-20 flex-1 items-center justify-center">
              <Text className="text-label-lg text-text">
                {t("tourism.emptyTitle")}
              </Text>
              <Text className="text-body-sm text-text-muted text-center">
                {t("tourism.emptyDescription")}
              </Text>
            </View>
          }
        />
      )}

      {selectedDetail ? (
        <PlaceDetailSheet
          detail={selectedDetail}
          expanded={detailExpanded}
          onExpandedChange={setDetailExpanded}
          onClose={() => setSelectedPlace(null)}
          onCopyPress={() => void copyPlace()}
          onExternalMapPress={() => void openInExternalMap()}
        />
      ) : null}
    </SafeAreaView>
  );
}
