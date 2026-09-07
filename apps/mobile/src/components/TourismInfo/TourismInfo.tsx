import { FlatList, Pressable, Text, View } from "react-native";
import { useMemo, useState } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";

import { TourismInfoHeader } from "@/components/TourismInfo/TourismInfoHeader";
import { TourismInfoSkeleton } from "@/components/TourismInfo/TourismInfoSkeleton";
import { TourismPlaceCard } from "@/components/TourismInfo/TourismPlaceCard";
import { useDebounce } from "@/hooks/use-debounce";
import { useTourismPlaces } from "@/hooks/use-tourism-places";
import { useI18n } from "@/i18n/i18n-provider";
import {
  filterTourismAttractions,
  getTourismBrowseCategory,
  prioritizeTourismPlacesWithImages,
  type TourismInfoCategory,
} from "@/lib/tourism-browse";
import type { Place } from "@/types/place";

export function TourismInfo() {
  const { t } = useI18n();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<TourismInfoCategory>("all");
  const router = useRouter();
  const debouncedSearch = useDebounce(search, 300);
  const {
    data: places = [],
    isLoading,
    isError,
    refetch,
  } = useTourismPlaces(getTourismBrowseCategory(category), debouncedSearch);
  const visiblePlaces = useMemo(() => {
    const categoryPlaces =
      category === "hospital" || category === "accommodation"
        ? places
        : filterTourismAttractions(places, category);
    return prioritizeTourismPlacesWithImages(categoryPlaces);
  }, [category, places]);

  const chooseCategory = (nextCategory: TourismInfoCategory) => {
    setCategory(nextCategory);
  };

  const openPlace = (place: Place) => {
    router.push({
      pathname: "/tourism/[placeType]/[id]",
      params: { placeType: place.placeType, id: String(place.id) },
    });
  };

  return (
    <SafeAreaView edges={["top"]} className="bg-bg flex-1">
      <TourismInfoHeader
        search={search}
        category={category}
        onSearchChange={setSearch}
        onCategoryChange={chooseCategory}
      />

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
          data={visiblePlaces}
          keyExtractor={(place) => `${place.placeType}:${place.id}`}
          renderItem={({ item }) => (
            <TourismPlaceCard place={item} onPress={() => openPlace(item)} />
          )}
          keyboardDismissMode="on-drag"
          keyboardShouldPersistTaps="handled"
          contentContainerClassName={
            visiblePlaces.length === 0 ? "flex-grow" : undefined
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
    </SafeAreaView>
  );
}
