interface PlaceCandidate {
  placeName: string;
  mapX: number;
  mapY: number;
}

interface PlaceAddressCandidate extends PlaceCandidate {
  roadAddressName: string;
  addressName: string;
}

interface PlaceLocation {
  name: string;
  lat: number;
  lng: number;
}

const MAX_DISTANCE_SQUARED = 0.01 ** 2;

export function findClosestPlace<T extends PlaceCandidate>(
  places: T[],
  location: PlaceLocation,
): T | undefined {
  return places
    .filter((place) => place.placeName.trim() === location.name.trim())
    .map((place) => ({
      place,
      distanceSquared:
        (place.mapY - location.lat) ** 2 + (place.mapX - location.lng) ** 2,
    }))
    .filter(({ distanceSquared }) => distanceSquared <= MAX_DISTANCE_SQUARED)
    .sort((a, b) => a.distanceSquared - b.distanceSquared)[0]?.place;
}

export function findClosestPlaceAddress(
  places: PlaceAddressCandidate[],
  location: PlaceLocation,
) {
  const match = findClosestPlace(places, location);

  return match?.roadAddressName || match?.addressName || undefined;
}
