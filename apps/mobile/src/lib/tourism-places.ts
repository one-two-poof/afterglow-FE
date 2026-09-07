import {
  fetchAccommodations,
  fetchAttractions,
  fetchHospitals,
} from "@/lib/places";
import {
  filterTourismApiPlaces,
  getTourismBrowseCategories,
  mergeTourismPlaces,
  normalizeTourismSearch,
  type TourismBrowseCategory,
  type TourismPlaceCategory,
} from "@/lib/tourism-browse";
import type { Place } from "@/types/place";

export type { TourismBrowseCategory } from "@/lib/tourism-browse";

const TOURISM_FETCHERS: Record<
  TourismPlaceCategory,
  (name?: string) => Promise<Place[]>
> = {
  hospital: fetchHospitals,
  attraction: fetchAttractions,
  accommodation: fetchAccommodations,
};

export async function fetchTourismPlaces(
  category: TourismBrowseCategory,
  search: string,
): Promise<Place[]> {
  const name = normalizeTourismSearch(search);
  const groups = await Promise.all(
    getTourismBrowseCategories(category).map((item) =>
      TOURISM_FETCHERS[item](name),
    ),
  );
  return filterTourismApiPlaces(mergeTourismPlaces(groups));
}
