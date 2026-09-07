import { useToastStore } from "@afterglow/stores";
import {
  ActionSheetIOS,
  Alert,
  Linking,
  Platform,
} from "react-native";

import { useI18n } from "@/i18n/i18n-provider";
import {
  buildMapUrl,
  copyPlaceToClipboard,
  type MapProvider,
} from "@/lib/place-actions";
import type { Place } from "@/types/place";

export function useTourismPlaceActions(place: Place | null) {
  const { t } = useI18n();
  const showToast = useToastStore((state) => state.show);

  const copyPlace = async () => {
    if (!place) return;
    try {
      await copyPlaceToClipboard(
        place.placeName,
        place.roadAddressName || place.addressName,
      );
      showToast(t("home.detail.copySuccess"));
    } catch {
      showToast(t("home.detail.copyFailed"));
    }
  };

  const openInExternalMap = async () => {
    if (!place) return;
    const destination = {
      latitude: place.mapY,
      longitude: place.mapX,
      label: place.placeName,
      address: place.roadAddressName || place.addressName,
    };
    const openProvider = async (provider: MapProvider) => {
      try {
        await Linking.openURL(buildMapUrl(provider, destination));
      } catch {
        showToast(t("home.detail.externalMapFailed"));
      }
    };

    if (Platform.OS === "web") {
      await openProvider("google");
      return;
    }

    const nativeProviders = await Promise.all(
      (["naver", "kakao"] as const).map(async (provider) => ({
        provider,
        installed: await Linking.canOpenURL(
          provider === "naver" ? "nmap://" : "kakaomap://",
        ).catch(() => false),
      })),
    );
    const providers: MapProvider[] = [
      ...nativeProviders
        .filter(({ installed }) => installed)
        .map(({ provider }) => provider),
      "google",
      ...(Platform.OS === "ios" ? (["apple"] as const) : []),
    ];
    const labels = providers.map((provider) =>
      t(`home.detail.mapProvider.${provider}`),
    );

    if (Platform.OS === "ios") {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          title: t("home.detail.mapPickerTitle"),
          options: [...labels, t("common.cancel")],
          cancelButtonIndex: labels.length,
        },
        (index) => {
          const provider = providers[index];
          if (provider) void openProvider(provider);
        },
      );
      return;
    }

    Alert.alert(t("home.detail.mapPickerTitle"), undefined, [
      ...providers.map((provider, index) => ({
        text: labels[index],
        onPress: () => void openProvider(provider),
      })),
    ]);
  };

  return { copyPlace, openInExternalMap };
}
