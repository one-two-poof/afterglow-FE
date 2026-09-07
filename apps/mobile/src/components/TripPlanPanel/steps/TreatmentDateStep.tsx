import { cn, formatISODate } from "@afterglow/utils";
import { Pressable, Text, View } from "react-native";

import { useI18n } from "@/i18n/i18n-provider";

import { TREATMENTS } from "./TreatmentStep";

export interface TreatmentDateStepProps {
  /** 선택된 시술 종류 */
  treatments: string[];
  /** 여행 일자 목록(순서대로) */
  days: Date[];
  /** 시술 → 선택 날짜("YYYY-MM-DD") 매핑 */
  value: Record<string, string>;
  onAssign: (treatment: string, date: string) => void;
}

/** 선택한 시술별로 받을 날짜(Day)를 매칭. */
export function TreatmentDateStep({
  treatments,
  days,
  value,
  onAssign,
}: TreatmentDateStepProps) {
  const { locale, t } = useI18n();
  return (
    <View className="gap-3 pt-2">
      <Text className="text-body-sm text-text-secondary">
        {t("plan.treatmentDate.prompt")}
      </Text>

      {treatments.map((treatment) => (
        <View key={treatment} className="gap-3 rounded-[16px] bg-surface p-4">
          <Text className="text-label-lg text-text">
            {(() => {
              const option = TREATMENTS.find((item) => item.name === treatment);
              return option ? t(option.labelKey) : treatment;
            })()}
          </Text>
          <View className="flex-row gap-2">
            {days.map((day, i) => {
              const iso = formatISODate(day);
              const active = value[treatment] === iso;
              return (
                <Pressable
                  key={iso}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  accessibilityLabel={`${treatment}, Day ${i + 1}, ${new Intl.DateTimeFormat(locale, { dateStyle: "full" }).format(day)}`}
                  onPress={() => onAssign(treatment, iso)}
                  className={cn(
                    "flex-1 items-center gap-0.5 rounded-[12px] border-2 py-3",
                    active
                      ? "border-primary bg-primary-100"
                      : "border-border bg-bg",
                  )}
                >
                  <Text
                    className={cn(
                      "text-label-md",
                      active ? "text-primary-700" : "text-text-secondary",
                    )}
                  >
                    Day {i + 1}
                  </Text>
                  <Text
                    className={cn(
                      "text-caption",
                      active ? "text-primary-700" : "text-text-secondary",
                    )}
                  >
                    {new Intl.DateTimeFormat(locale, {
                      month: "numeric",
                      day: "numeric",
                      weekday: "short",
                    }).format(day)}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      ))}
    </View>
  );
}
