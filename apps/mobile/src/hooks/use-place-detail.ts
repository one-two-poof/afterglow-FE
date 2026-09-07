import { useQuery } from "@tanstack/react-query";

import { fetchPlaceDetail } from "@/lib/places";

const ONE_DAY_MS = 1000 * 60 * 60 * 24;

export const usePlaceDetail = (
  id?: number,
  placeType?: string,
  options?: { enabled?: boolean },
) =>
  useQuery({
    queryKey: ["places", "detail", id, placeType?.toUpperCase()],
    queryFn: () => fetchPlaceDetail(id!, placeType!),
    enabled:
      (options?.enabled ?? true) && id !== undefined && Boolean(placeType),
    staleTime: ONE_DAY_MS,
    gcTime: ONE_DAY_MS,
  });
