import type { Place } from "@/types/place";

export type TourismBrowseCategory = "all" | "attraction" | "accommodation";
export type TourismPlaceCategory = Exclude<TourismBrowseCategory, "all">;

export function getTourismBrowseCategories(
  category: TourismBrowseCategory,
): TourismPlaceCategory[] {
  return category === "all" ? ["attraction", "accommodation"] : [category];
}

export function normalizeTourismSearch(search: string): string {
  return search.trim() || "%";
}

export function mergeTourismPlaces(groups: Place[][]): Place[] {
  const placesById = new Map<number, Place>();
  groups.flat().forEach((place) => {
    if (!placesById.has(place.id)) placesById.set(place.id, place);
  });
  return [...placesById.values()];
}
