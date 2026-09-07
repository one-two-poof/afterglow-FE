import { useQuery } from "@tanstack/react-query";

import {
  fetchTourismPlaces,
  type TourismBrowseCategory,
} from "@/lib/tourism-places";

const ONE_DAY_MS = 1000 * 60 * 60 * 24;

export function useTourismPlaces(
  category: TourismBrowseCategory,
  search: string,
) {
  return useQuery({
    queryKey: ["places", "tourism", category, search.trim()],
    queryFn: () => fetchTourismPlaces(category, search),
    staleTime: ONE_DAY_MS,
    gcTime: ONE_DAY_MS,
  });
}
