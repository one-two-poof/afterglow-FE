import type { Place } from "@/types/place";

type TourismMapPlace = Pick<
  Place,
  | "id"
  | "placeType"
  | "placeName"
  | "categoryName"
  | "addressName"
  | "mapX"
  | "mapY"
> & {
  image: string | null;
  phone: string | null;
  primaryTypeName: string | null;
};

export function tourismPlaceToMapParams(place: TourismMapPlace) {
  return {
    tourismPlaceId: String(place.id),
    tourismPlaceType: place.placeType,
    tourismPlaceName: place.placeName,
    tourismPlaceCategory: place.categoryName,
    tourismPlaceAddress: place.addressName,
    tourismPlaceLat: String(place.mapY),
    tourismPlaceLng: String(place.mapX),
    tourismPlaceImage: place.image ?? "",
    tourismPlacePhone: place.phone ?? "",
    tourismPlacePrimaryTypeName: place.primaryTypeName ?? "",
  };
}
