import { colors } from "@afterglow/tokens";
import { cn } from "@afterglow/utils";
import { Check } from "lucide-react-native";
import { Pressable, Text, View } from "react-native";
import Svg, { Path } from "react-native-svg";

import type { TranslationKey } from "@/i18n/config";
import { useI18n } from "@/i18n/i18n-provider";

const MOBILITY_ICON_COLOR = colors.primary;

/**
 * 이동 반경 단계별 아이콘. 반경이 넓어질수록 동네 → 도시로 확장되는 느낌을 준다.
 * 대부분 stroke 기반(viewBox 24)이나, "인접 지역"은 채움형(viewBox 50)이라 개별 렌더한다.
 */
const MOBILITY_STROKE_PATHS: Record<number, string[]> = {
  // 1. 가까운 동네 (building-community)
  1: [
    "M8 9l5 5v7h-5v-4m0 4h-5v-7l5 -5m1 1v-6a1 1 0 0 1 1 -1h10a1 1 0 0 1 1 1v17h-8",
    "M13 7l0 .01",
    "M17 7l0 .01",
    "M17 11l0 .01",
    "M17 15l0 .01",
  ],
  // 3. 적당한 이동 (footsteps)
  3: [
    "M4 16.5a2.5 2.5 0 0 0 5 0a1.5 1.5 0 0 0 -1.5 -1.5h-2a1.5 1.5 0 0 0 -1.5 1.5",
    "M15 18.5a2.5 2.5 0 0 0 5 0a1.5 1.5 0 0 0 -1.5 -1.5h-2a1.5 1.5 0 0 0 -1.5 1.5",
    "M8.52 12h-4.04c-.348 0 -.678 -.179 -.823 -.496c-1.326 -2.904 -.774 -8.504 2.843 -8.504s4.17 5.6 2.843 8.504c-.145 .317 -.475 .496 -.824 .496",
    "M19.52 14h-4.04c-.348 0 -.678 -.179 -.823 -.496c-1.326 -2.904 -.774 -8.504 2.843 -8.504s4.17 5.6 2.843 8.504c-.145 .317 -.475 .496 -.824 .496",
  ],
  // 4. 넓은 이동 (bus-stop)
  4: [
    "M3 4a1 1 0 0 1 1 -1h2a1 1 0 0 1 1 1v4a1 1 0 0 1 -1 1h-2a1 1 0 0 1 -1 -1l0 -4",
    "M16 17a2 2 0 1 0 4 0a2 2 0 1 0 -4 0",
    "M10 5h7c2.761 0 5 3.134 5 7v5h-2",
    "M16 17h-8",
    "M16 5l1.5 7h4.5",
    "M9.5 10h7.5",
    "M12 5v5",
    "M5 9v11",
  ],
  // 5. 도시 전체 (world-map)
  5: [
    "M20 8h-2a2 2 0 0 0 -2 2a2 2 0 1 1 -4 0v-1a2 2 0 0 0 -2 -2h-1a2 2 0 0 1 -2 -2v-.5",
    "M3 12h3a2 2 0 0 1 2 2v.5a1.5 1.5 0 0 0 1.5 1.5a1.5 1.5 0 0 1 1.5 1.5v3.25",
    "M15 20.5v-3.5a2 2 0 0 1 2 -2h3.5",
    "M3 12a9 9 0 1 0 18 0a9 9 0 1 0 -18 0",
  ],
};

// 2. 인접 지역 (buildings) — 채움형 단일 패스, viewBox 50
const MOBILITY_BUILDINGS_PATH =
  "M15 5 A 1.0001 1.0001 0 0 0 14 6L14 25L7 25 A 1.0001 1.0001 0 0 0 6 26L6 29.716797L0.048828125 43.605469 A 1.0001 1.0001 0 0 0 0.96679688 45L49.140625 45 A 1.0001 1.0001 0 0 0 50.046875 43.576172L44 30.621094L44 22 A 1.0001 1.0001 0 0 0 43 21L37 21L37 14 A 1.0001 1.0001 0 0 0 36 13L29 13L29 6 A 1.0001 1.0001 0 0 0 28 5L15 5 z M 16 7L27 7L27 13L23 13 A 1.0001 1.0001 0 0 0 22 14L22 25L16 25L16 7 z M 18 9L18 11L20 11L20 9L18 9 z M 23 9L23 11L25 11L25 9L23 9 z M 18 13L18 15L20 15L20 13L18 13 z M 24 15L35 15L35 21L31 21 A 1.0001 1.0001 0 0 0 30 22L30 39L24 39L24 26L24 15 z M 18 17L18 19L20 19L20 17L18 17 z M 26 17L26 19L28 19L28 17L26 17 z M 31 17L31 19L33 19L33 17L31 17 z M 18 21L18 23L20 23L20 21L18 21 z M 26 21L26 23L28 23L28 21L26 21 z M 32 23L42 23L42 39L34 39L32 39L32 23 z M 26 25L26 27L28 27L28 25L26 25 z M 34 25L34 27L36 27L36 25L34 25 z M 38 25L38 27L40 27L40 25L38 25 z M 8 27L22 27L22 39L8 39L8 27 z M 10 29L10 31L12 31L12 29L10 29 z M 14 29L14 31L16 31L16 29L14 29 z M 18 29L18 31L20 31L20 29L18 29 z M 26 29L26 31L28 31L28 29L26 29 z M 34 29L34 31L36 31L36 29L34 29 z M 38 29L38 31L40 31L40 29L38 29 z M 10 33L10 35L12 35L12 33L10 33 z M 14 33L14 35L16 35L16 33L14 33 z M 18 33L18 35L20 35L20 33L18 33 z M 26 33L26 35L28 35L28 33L26 33 z M 34 33L34 35L36 35L36 33L34 33 z M 38 33L38 35L40 35L40 33L38 33 z M 6 34.796875L6 40 A 1.0001 1.0001 0 0 0 7 41L23 41L34 41L43 41 A 1.0001 1.0001 0 0 0 44 40L44 35.349609L47.570312 43L2.484375 43L6 34.796875 z";

/** 이동 반경(1~5) 단계별 아이콘. */
function MobilityRangeIcon({ value }: { value: number }) {
  if (value === 2) {
    return (
      <Svg width={24} height={24} viewBox="0 0 50 50">
        <Path d={MOBILITY_BUILDINGS_PATH} fill={MOBILITY_ICON_COLOR} />
      </Svg>
    );
  }

  const paths = MOBILITY_STROKE_PATHS[value] ?? MOBILITY_STROKE_PATHS[1]!;
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
      {paths.map((path) => (
        <Path
          key={path}
          d={path}
          stroke={MOBILITY_ICON_COLOR}
          strokeWidth={1}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ))}
    </Svg>
  );
}

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
              <MobilityRangeIcon value={option.value} />
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
