interface PlaceAddressCandidate {
  placeName: string;
  roadAddressName: string;
  addressName: string;
  mapX: number;
  mapY: number;
}

interface PlaceLocation {
  name: string;
  lat: number;
  lng: number;
}

const MAX_DISTANCE_SQUARED = 0.01 ** 2;

export function findClosestPlaceAddress(
  places: PlaceAddressCandidate[],
  location: PlaceLocation,
) {
  const match = places
    .filter((place) => place.placeName.trim() === location.name.trim())
    .map((place) => ({
      place,
      distanceSquared:
        (place.mapY - location.lat) ** 2 + (place.mapX - location.lng) ** 2,
    }))
    .filter(({ distanceSquared }) => distanceSquared <= MAX_DISTANCE_SQUARED)
    .sort((a, b) => a.distanceSquared - b.distanceSquared)[0]?.place;

  return match?.roadAddressName || match?.addressName || undefined;
}
