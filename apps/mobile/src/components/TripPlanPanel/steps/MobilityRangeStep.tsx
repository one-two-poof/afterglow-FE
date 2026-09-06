import { colors } from "@afterglow/tokens";
import { cn } from "@afterglow/utils";
import { Check, MapPin } from "lucide-react-native";
import { Pressable, Text, View } from "react-native";

import type { TranslationKey } from "@/i18n/config";
import { useI18n } from "@/i18n/i18n-provider";

interface MobilityRangeOption {
  value: number;
  labelKey: TranslationKey;
  descriptionKey: TranslationKey;
}

export const MOBILITY_RANGES: MobilityRangeOption[] = [1, 2, 3, 4, 5].map(
  (value) => ({
    value,
    labelKey: `plan.mobility.${value}` as TranslationKey,
    descriptionKey: `plan.mobility.${value}Desc` as TranslationKey,
  }),
);

export interface MobilityRangeStepProps {
  value: number | null;
  onChange: (value: number) => void;
}

/** 하루 시작 관광지를 기준으로 허용할 이동 반경을 1~5 중에서 선택한다. */
export function MobilityRangeStep({ value, onChange }: MobilityRangeStepProps) {
  const { t } = useI18n();

  return (
    <View className="gap-3 pt-2">
      <Text className="text-body-sm text-text-secondary">
        {t("plan.mobility.prompt")}
      </Text>

      {MOBILITY_RANGES.map((option) => {
        const selected = value === option.value;
        return (
          <Pressable
            key={option.value}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            onPress={() => onChange(option.value)}
            className={cn(
              "flex-row items-center gap-3 rounded-[12px] border-2 bg-surface p-3",
              selected ? "border-primary" : "border-transparent",
            )}
          >
            <View className="size-6 items-center justify-center">
              <MapPin
                size={16 + option.value * 2}
                strokeWidth={1.5}
                color={colors.primary}
              />
            </View>

            <View className="flex-1">
              <Text className="text-label-lg text-text">
                {t(option.labelKey)}
              </Text>
              <Text className="text-body-sm text-text-muted">
                {t(option.descriptionKey)}
              </Text>
            </View>

            <View
              className={cn(
                "size-6 items-center justify-center rounded-full",
                selected ? "bg-primary" : "border-2 border-neutral-300",
              )}
            >
              {selected ? (
                <Check size={14} strokeWidth={3} color={colors["neutral-0"]} />
              ) : null}
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}
