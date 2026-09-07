import { colors } from "@afterglow/tokens";
import { ExternalLink } from "lucide-react-native";
import { Linking, Pressable, Text, View } from "react-native";

import type { TranslationKey } from "@/i18n/config";
import { useI18n } from "@/i18n/i18n-provider";
import {
  buildPlaceDetailFacts,
  getSafeWebUrl,
  type PlaceDetailFact,
} from "@/lib/place-detail";
import type { PlaceDetail } from "@/types/place";

const labelKey = (key: PlaceDetailFact["key"]): TranslationKey =>
  `home.detail.field.${key}` as TranslationKey;

export function PlaceDetailFacts({ placeInfo }: { placeInfo: PlaceDetail }) {
  const { t } = useI18n();
  const facts = buildPlaceDetailFacts(placeInfo);

  if (facts.length === 0) return null;

  const formatValue = (fact: PlaceDetailFact) => {
    if (fact.key === "isIndoor") {
      return t(
        fact.value ? "home.detail.value.indoor" : "home.detail.value.outdoor",
      );
    }
    if (fact.format === "boolean") {
      return t(fact.value ? "home.detail.value.yes" : "home.detail.value.no");
    }
    if (fact.format === "availability") {
      const available = ["Y", "YES", "TRUE", "1"].includes(
        String(fact.value).trim().toUpperCase(),
      );
      return t(
        available
          ? "home.detail.value.available"
          : "home.detail.value.unavailable",
      );
    }
    return String(fact.value);
  };

  return (
    <View className="gap-2">
      <Text className="text-label-sm text-text-muted">
        {t("home.detail.section.info")}
      </Text>
      <View className="overflow-hidden rounded-[8px] border border-border">
        {facts.map((fact, index) => {
          const value = formatValue(fact);
          const safeUrl =
            fact.format === "link" ? getSafeWebUrl(value) : undefined;
          return (
            <View
              key={fact.key}
              className={`gap-1 px-3 py-3 ${index > 0 ? "border-t border-border" : ""}`}
            >
              <Text className="text-label-sm text-text-muted">
                {t(labelKey(fact.key))}
              </Text>
              {safeUrl ? (
                <Pressable
                  accessibilityRole="link"
                  onPress={() => void Linking.openURL(safeUrl)}
                  className="min-h-6 flex-row items-center gap-1"
                >
                  <Text className="flex-1 text-body-md text-primary">
                    {value}
                  </Text>
                  <ExternalLink size={14} color={colors.primary} />
                </Pressable>
              ) : (
                <Text className="text-body-md text-text">{value}</Text>
              )}
            </View>
          );
        })}
      </View>
    </View>
  );
}
