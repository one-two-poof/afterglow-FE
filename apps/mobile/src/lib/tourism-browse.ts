import type { Place } from "@/types/place";

export type TourismBrowseCategory =
  | "all"
  | "hospital"
  | "attraction"
  | "accommodation";
export type TourismPlaceCategory = Exclude<TourismBrowseCategory, "all">;
export type TourismAttractionCategory =
  | "all"
  | "culture"
  | "nature"
  | "shopping"
  | "wellness"
  | "experience";

type AttractionCategoryFields = Pick<
  Place,
  "primaryTypeName" | "categoryName"
>;

const ATTRACTION_CATEGORY_PATTERNS: Array<{
  category: Exclude<TourismAttractionCategory, "all" | "experience">;
  pattern: RegExp;
}> = [
  {
    category: "culture",
    pattern: /인문|문화|예술|역사|박물관|미술관|공연|영화|고궁|궁궐|유적|사찰|종교/i,
  },
  {
    category: "nature",
    pattern: /자연|공원|산|해변|수목원|휴양림|거리|산책|전망/i,
  },
  {
    category: "shopping",
    pattern: /쇼핑|백화점|시장|면세|드럭스토어/i,
  },
  {
    category: "wellness",
    pattern: /뷰티|찜질|사우나|안마|스파|마사지|웰니스/i,
  },
];

export function getTourismAttractionCategory(
  place: AttractionCategoryFields,
): Exclude<TourismAttractionCategory, "all"> {
  const searchable = `${place.primaryTypeName} ${place.categoryName}`;
  return (
    ATTRACTION_CATEGORY_PATTERNS.find(({ pattern }) =>
      pattern.test(searchable),
    )?.category ?? "experience"
  );
}

export function filterTourismAttractions<T extends AttractionCategoryFields>(
  places: T[],
  category: TourismAttractionCategory,
): T[] {
  return category === "all"
    ? places
    : places.filter(
        (place) => getTourismAttractionCategory(place) === category,
      );
}

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
  const placesById = new Map<string, Place>();
  groups.flat().forEach((place) => {
    const key = `${place.placeType.toUpperCase()}:${place.id}`;
    if (!placesById.has(key)) placesById.set(key, place);
  });
  return [...placesById.values()];
}
