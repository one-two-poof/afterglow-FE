import { cn, type DateRange } from "@afterglow/utils";
import { Text, View } from "react-native";

import { useI18n } from "@/i18n/i18n-provider";

/** 선택한 여행 기간(시작·종료일) 요약 카드. */
export interface TripSummaryCardProps {
  range: DateRange;
  className?: string;
}

export const TripSummaryCard = ({ range, className }: TripSummaryCardProps) => {
  const { locale, t } = useI18n();
  return (
    <View
      className={cn(
        "flex-row items-stretch rounded-[20px] bg-surface p-5",
        className,
      )}
    >
      <SummaryItem
        label={t("summary.start")}
        value={range.start}
        locale={locale}
        emphasized
      />
      <View className="mx-4 w-px self-stretch bg-border" />
      <SummaryItem label={t("summary.end")} value={range.end} locale={locale} />
    </View>
  );
};

interface SummaryItemProps {
  label: string;
  value: Date | null;
  locale: string;
  emphasized?: boolean;
}

const SummaryItem = ({
  label,
  value,
  locale,
  emphasized,
}: SummaryItemProps) => (
  <View className="flex-1">
    <Text className="text-label-sm text-text-muted">{label}</Text>
    <Text
      className={cn(
        "mt-1 text-heading-sm",
        emphasized ? "text-primary" : "text-text",
      )}
    >
      {value
        ? new Intl.DateTimeFormat(locale, {
            month: "long",
            day: "numeric",
            weekday: "short",
          }).format(value)
        : "-"}
    </Text>
  </View>
);
