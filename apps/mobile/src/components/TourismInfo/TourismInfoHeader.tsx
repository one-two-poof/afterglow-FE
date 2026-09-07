import { colors } from "@afterglow/tokens";
import { Input } from "@afterglow/ui-native";
import { Search, X } from "lucide-react-native";
import { Pressable, Text, View } from "react-native";

import { useI18n } from "@/i18n/i18n-provider";
import type { TourismBrowseCategory } from "@/lib/tourism-browse";

const CATEGORIES: TourismBrowseCategory[] = [
  "all",
  "attraction",
  "accommodation",
  "hospital",
];

export function TourismInfoHeader({
  search,
  category,
  onSearchChange,
  onCategoryChange,
}: {
  search: string;
  category: TourismBrowseCategory;
  onSearchChange: (search: string) => void;
  onCategoryChange: (category: TourismBrowseCategory) => void;
}) {
  const { t } = useI18n();

  return (
    <View className="border-b border-border bg-bg px-5 pt-5 pb-3">
      <View className="mb-5 gap-1">
        <Text className="text-heading-sm text-text">{t("tourism.title")}</Text>
        <Text className="text-body-sm text-text-secondary">
          {t("tourism.description")}
        </Text>
      </View>

      <Input
        accessibilityLabel={t("tourism.search.label")}
        value={search}
        onChangeText={onSearchChange}
        placeholder={t("tourism.search.placeholder")}
        returnKeyType="search"
        leftIcon={<Search size={20} color={colors["text-muted"]} />}
        rightIcon={
          search ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t("tourism.search.clear")}
              onPress={() => onSearchChange("")}
              hitSlop={8}
            >
              <X size={18} color={colors["text-muted"]} />
            </Pressable>
          ) : undefined
        }
      />

      <Text className="mt-5 mb-2 text-label-sm text-text-secondary">
        {t("tourism.category.label")}
      </Text>
      <View
        accessibilityRole="radiogroup"
        className="flex-row flex-wrap gap-2"
      >
        {CATEGORIES.map((item) => {
          const selected = item === category;
          return (
            <Pressable
              key={item}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              onPress={() => onCategoryChange(item)}
              className={
                selected
                  ? "min-h-10 justify-center rounded-full bg-primary px-4"
                  : "min-h-10 justify-center rounded-full border border-border bg-surface px-4 active:bg-surface-muted"
              }
            >
              <Text
                className={
                  selected
                    ? "text-label-md text-on-action-primary"
                    : "text-label-md text-text-secondary"
                }
              >
                {t(`tourism.category.${item}`)}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
