export type MapProvider = "apple" | "google" | "kakao" | "naver";

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

export function buildMapUrl(
  provider: MapProvider,
  { latitude, longitude, label }: ExternalMapDestination,
) {
  const coordinates = `${latitude},${longitude}`;

  if (provider === "apple") {
    const query = new URLSearchParams({ ll: coordinates, q: label });
    return `https://maps.apple.com/?${query.toString()}`;
  }

  if (provider === "naver") {
    return (
      `nmap://place?lat=${latitude}&lng=${longitude}` +
      `&name=${encodeURIComponent(label)}` +
      "&appname=com.dunaduneos.afterglow"
    );
  }

  if (provider === "kakao") {
    const query = new URLSearchParams({ p: coordinates });
    return `kakaomap://look?${query.toString()}`;
  }

  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(label)}`;
}
