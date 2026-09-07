import type { Place } from "@/types/place";

export type TourismBrowseCategory =
  | "all"
  | "hospital"
  | "attraction"
  | "accommodation";
export type TourismPlaceCategory = Exclude<TourismBrowseCategory, "all">;

export function filterTourismApiPlaces<T extends Pick<Place, "source">>(
  places: T[],
): T[] {
  return places.filter((place) =>
    place.source
      .split("+")
      .some((source) => source.trim().toUpperCase() === "TOURISM_API"),
  );
}

export function getTourismBrowseCategories(
  category: TourismBrowseCategory,
): TourismPlaceCategory[] {
  return category === "all"
    ? ["hospital", "attraction", "accommodation"]
    : [category];
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
