import { colors } from "@afterglow/tokens";
import { cn } from "@afterglow/utils";
import { Check } from "lucide-react-native";
import { Pressable, Text, View } from "react-native";
import Svg, { Circle, Path, Rect } from "react-native-svg";

import type { TranslationKey } from "@/i18n/config";
import { useI18n } from "@/i18n/i18n-provider";

type TreatmentIconName =
  | "윤곽/체형주사"
  | "보톡스"
  | "필러"
  | "제모"
  | "피부레이저"
  | "리프팅"
  | "필링"
  | "스킨부스터"
  | "피부관리"
  | "비만(약처방)";

type TreatmentIconDefinition = {
  paths: string[];
  circles?: { cx: number; cy: number; r: number }[];
  rect?: {
    x: number;
    y: number;
    width: number;
    height: number;
    rx: number;
    transform: string;
  };
};

const TREATMENT_ICON_COLOR = "#0787D0";
const TREATMENT_ICONS: Record<TreatmentIconName, TreatmentIconDefinition> = {
  "윤곽/체형주사": {
    paths: [
      "M18 11c4 9 4 17 0 26",
      "M30 11c-4 9-4 17 0 26",
      "M7 24h6M41 24h-6",
      "M11 21l2 3-2 3M37 21l-2 3 2 3",
    ],
  },
  보톡스: {
    paths: [
      "M9 12c3-3 5 3 8 0",
      "M17 12h22",
      "M9 24c3-3 5 3 8 0",
      "M17 24h22",
      "M9 36c3-3 5 3 8 0",
      "M17 36h22",
    ],
  },
  필러: {
    paths: ["M10 37C10 5 38 5 38 37", "M24 35V20", "M19.5 24.5 24 20l4.5 4.5"],
  },
  제모: {
    paths: [
      "M9 36h30",
      "M14 36c-6-8 6-12 0-24",
      "M22 36c-6-8 6-12 0-24",
      "M33 17l1.3 3.7L38 22l-3.7 1.3L33 27l-1.3-3.7L28 22l3.7-1.3z",
    ],
  },
  피부레이저: {
    paths: [
      "M24 12V8M24 36v4M12 24H8M36 24h4",
      "M15.5 15.5l-2.9-2.9M32.5 32.5l2.9 2.9M32.5 15.5l2.9-2.9M15.5 32.5l-2.9 2.9",
    ],
    circles: [
      { cx: 24, cy: 24, r: 6 },
      { cx: 24, cy: 24, r: 1.6 },
    ],
  },
  리프팅: {
    paths: ["M13 11h22v14a11 11 0 0 1-22 0z", "M24 33V17", "M19 22l5-5 5 5"],
  },
  필링: {
    paths: ["M9 37h30", "M11 27c8-9 19-9 26-3", "M32 23l5 1-1 5"],
    circles: [
      { cx: 14, cy: 17, r: 1.4 },
      { cx: 21, cy: 13, r: 1.4 },
      { cx: 28, cy: 16, r: 1.4 },
    ],
  },
  스킨부스터: {
    paths: [
      "M24 12c5.5 7.5 8 11 8 14.5a8 8 0 0 1-16 0C16 23 18.5 19.5 24 12z",
      "M13 17l-3-3M35 17l3-3M9 29H5M39 29h4",
    ],
  },
  피부관리: {
    paths: [
      "M16 29c3 3.5 7 3.5 10 0",
      "M34 10l1.3 3.7L39 15l-3.7 1.3L34 20l-1.3-3.7L29 15l3.7-1.3z",
    ],
    circles: [{ cx: 21, cy: 27, r: 10 }],
  },
  "비만(약처방)": {
    paths: ["M9 37a15 15 0 0 1 30 0", "M9 37h30", "M24 37l-6-7"],
    rect: {
      x: 27,
      y: 11.5,
      width: 12,
      height: 7,
      rx: 3.5,
      transform: "rotate(-25 33 15)",
    },
  },
};

function TreatmentIcon({ name }: { name: TreatmentIconName }) {
  const icon = TREATMENT_ICONS[name];

  return (
    <Svg width={24} height={24} viewBox="0 0 48 48" fill="none">
      {icon.paths.map((path) => (
        <Path
          key={path}
          d={path}
          stroke={TREATMENT_ICON_COLOR}
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ))}
      {icon.circles?.map((circle) => (
        <Circle
          key={`${circle.cx}-${circle.cy}-${circle.r}`}
          {...circle}
          stroke={TREATMENT_ICON_COLOR}
          strokeWidth={2}
        />
      ))}
      {icon.rect ? (
        <Rect
          {...icon.rect}
          stroke={TREATMENT_ICON_COLOR}
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ) : null}
    </Svg>
  );
}

export interface TreatmentOption {
  /** 제출 값(한글) 겸 표시 라벨 */
  name: string;
  labelKey: TranslationKey;
  icon: TreatmentIconName;
}

/** 선택 가능한 시술 종류. name이 곧 제출 값 */
export const TREATMENTS: TreatmentOption[] = [
  { name: "리프팅", labelKey: "treatment.lifting", icon: "리프팅" },
  { name: "보톡스", labelKey: "treatment.botox", icon: "보톡스" },
  { name: "비만(약처방)", labelKey: "treatment.obesity", icon: "비만(약처방)" },
  { name: "스킨부스터", labelKey: "treatment.skinBooster", icon: "스킨부스터" },
  {
    name: "윤곽/체형주사",
    labelKey: "treatment.contour",
    icon: "윤곽/체형주사",
  },
  { name: "제모", labelKey: "treatment.hairRemoval", icon: "제모" },
  { name: "피부관리", labelKey: "treatment.skinCare", icon: "피부관리" },
  { name: "피부레이저", labelKey: "treatment.skinLaser", icon: "피부레이저" },
  { name: "필러", labelKey: "treatment.filler", icon: "필러" },
  { name: "필링", labelKey: "treatment.peeling", icon: "필링" },
];

export interface TreatmentStepProps {
  selected: string[];
  onToggle: (name: string) => void;
}

/** 시술 종류 선택 (다중 선택). name 문자열을 그대로 제출. 2열 wrap */
export function TreatmentStep({ selected, onToggle }: TreatmentStepProps) {
  const { t } = useI18n();
  return (
    <View className="gap-3 pt-2">
      <Text className="text-body-sm text-text-secondary">
        {t("plan.treatment.prompt")}
      </Text>

      <View className="flex-row flex-wrap justify-between">
        {TREATMENTS.map((option) => {
          const isSelected = selected.includes(option.name);
          return (
            <Pressable
              key={option.name}
              accessibilityRole="button"
              accessibilityState={{ selected: isSelected }}
              onPress={() => onToggle(option.name)}
              className={cn(
                "mb-3 w-[48%] gap-3 rounded-[12px] border-2 bg-surface p-3",
                isSelected ? "border-primary" : "border-transparent",
              )}
            >
              <View className="flex-row items-start justify-between">
                <TreatmentIcon name={option.icon} />
                <View
                  className={cn(
                    "size-5 items-center justify-center rounded-full",
                    isSelected ? "bg-primary" : "border-2 border-neutral-300",
                  )}
                >
                  {isSelected && (
                    <Check
                      size={12}
                      strokeWidth={3}
                      color={colors["neutral-0"]}
                    />
                  )}
                </View>
              </View>
              <Text className="text-label-lg text-text">
                {t(option.labelKey)}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
