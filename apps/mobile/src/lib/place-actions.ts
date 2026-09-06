export type ExternalMapPlatform = "android" | "ios" | "web";

interface ExternalMapDestination {
  latitude: number;
  longitude: number;
  label: string;
}

interface ClipboardModule {
  setStringAsync: (text: string) => Promise<unknown>;
}

type ClipboardLoader = () => Promise<ClipboardModule>;

export function formatPlaceForClipboard(name: string, address?: string) {
  return address ? `${name}\n${address}` : name;
}

export async function copyPlaceToClipboard(
  name: string,
  address?: string,
  loadClipboard: ClipboardLoader = () => import("expo-clipboard"),
) {
  const clipboard = await loadClipboard();
  await clipboard.setStringAsync(formatPlaceForClipboard(name, address));
}

export function buildExternalMapUrl(
  platform: ExternalMapPlatform,
  { latitude, longitude, label }: ExternalMapDestination,
) {
  const coordinates = `${latitude},${longitude}`;

  if (platform === "ios") {
    const query = new URLSearchParams({ ll: coordinates, q: label });
    return `https://maps.apple.com/?${query.toString()}`;
  }

  if (platform === "android") {
    const query = encodeURIComponent(`${coordinates}(${label})`);
    return `geo:${coordinates}?q=${query}`;
  }

  const query = new URLSearchParams({ api: "1", query: coordinates });
  return `https://www.google.com/maps/search/?${query.toString()}`;
}
