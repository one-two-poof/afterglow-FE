import {
  addMonths,
  cn,
  getMonthMatrix,
  isBeforeDay,
  isInRange,
  isSameDay,
  nextRange,
  startOfMonth,
  type DateRange,
} from "@afterglow/utils";
import { ChevronLeft, ChevronRight } from "lucide-react-native";
import { useState } from "react";
import { Pressable, Text, View } from "react-native";

import { useI18n } from "@/i18n/i18n-provider";

/**
 * 웹 `@afterglow/ui` Calendar의 RN 이식본.
 *
 * 로직(월 매트릭스, 범위 선택 규칙 nextRange 등)은 `@afterglow/utils`의 순수 TS
 * date-utils를 그대로 재사용한다. 시각/레이아웃만 RN으로 다시 구현했다.
 *
 * 웹과의 차이:
 * - `<div>`/`<button>` → `View`/`Pressable`. 텍스트는 반드시 `<Text>`로 감싼다.
 * - 웹은 CSS Grid(`grid-cols-7`)로 7열을 잡지만 RN엔 grid가 없으므로, 각 주를
 *   `flex-row`로 만들고 각 셀을 `flex-1`로 두어 7등분한다.
 * - 범위 하이라이트 바: 웹은 셀 안 absolute + 반폭 span(left-1/2/right-1/2 = 50%).
 *   RN에서도 셀 안에 `position:absolute` 바를 깔고 그 위에 endpoint 원을 얹는다.
 *   NativeWind에서 `left-1/2`가 항상 안정적이진 않아 바 위치는 style 객체로 직접
 *   퍼센트를 지정한다(아래 주석 참고).
 */

export interface CalendarProps {
  value: DateRange;
  onChange: (range: DateRange) => void;
  /** 시작일 포함 최대 선택 가능 일수 (기본 4일: 15·16·17·18) */
  maxDays?: number;
  startLabel?: string;
  defaultMonth?: Date;
  minimumDate?: Date;
  className?: string;
}

export const Calendar = ({
  value,
  onChange,
  maxDays = 4,
  startLabel,
  defaultMonth,
  minimumDate,
  className,
}: CalendarProps) => {
  const { locale, t } = useI18n();
  const [month, setMonth] = useState(() =>
    startOfMonth(defaultMonth ?? value.start ?? new Date()),
  );

  const weeks = getMonthMatrix(month.getFullYear(), month.getMonth());
  const hasRange = Boolean(value.start && value.end);
  const isPreviousMonthDisabled = Boolean(
    minimumDate && !isBeforeDay(startOfMonth(minimumDate), month),
  );

  return (
    <View className={cn("rounded-[20px] bg-surface p-5", className)}>
      {/* 헤더: 이전/다음 달 이동 + 월 타이틀 */}
      <View className="mb-3 flex-row items-center justify-between">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t("calendar.previousMonth")}
          accessibilityState={{ disabled: isPreviousMonthDisabled }}
          disabled={isPreviousMonthDisabled}
          onPress={() => setMonth((m) => addMonths(m, -1))}
          className="rounded-full p-1 active:bg-surface-muted disabled:opacity-30"
        >
          <ChevronLeft size={20} color="#6b7280" />
        </Pressable>
        <Text className="text-heading-sm text-text">
          {new Intl.DateTimeFormat(locale, {
            year: "numeric",
            month: "long",
          }).format(month)}
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t("calendar.nextMonth")}
          onPress={() => setMonth((m) => addMonths(m, 1))}
          className="rounded-full p-1 active:bg-surface-muted"
        >
          <ChevronRight size={20} color="#6b7280" />
        </Pressable>
      </View>

      {/* 요일 헤더 (일=error, 토=primary) */}
      <View className="flex-row">
        {Array.from({ length: 7 }, (_, i) =>
          new Intl.DateTimeFormat(locale, { weekday: "narrow" }).format(
            new Date(2024, 0, 7 + i),
          ),
        ).map((weekday, i) => (
          <Text
            key={`weekday-${i}`}
            className={cn(
              "flex-1 py-2 text-center text-label-sm",
              i === 0
                ? "text-error-500"
                : i === 6
                  ? "text-primary"
                  : "text-text-secondary",
            )}
          >
            {weekday}
          </Text>
        ))}
      </View>

      {/* 날짜 그리드: 주 = flex-row, 셀 = flex-1 */}
      <View accessibilityLabel={t("calendar.selectDate")}>
        {weeks.map((week, wi) => (
          <View key={wi} className="flex-row">
            {week.map((day, di) =>
              day ? (
                <DayCell
                  key={day.getTime()}
                  day={day}
                  range={value}
                  hasRange={hasRange}
                  locale={locale}
                  startLabel={startLabel}
                  disabled={Boolean(
                    minimumDate && isBeforeDay(day, minimumDate),
                  )}
                  onSelect={() => onChange(nextRange(value, day, maxDays))}
                />
              ) : (
                <View key={`blank-${wi}-${di}`} className="h-11 flex-1" />
              ),
            )}
          </View>
        ))}
      </View>
    </View>
  );
};

interface DayCellProps {
  day: Date;
  range: DateRange;
  hasRange: boolean;
  locale: string;
  startLabel?: string;
  disabled: boolean;
  onSelect: () => void;
}

const DayCell = ({
  day,
  range,
  hasRange,
  locale,
  startLabel,
  disabled,
  onSelect,
}: DayCellProps) => {
  const isStart = Boolean(range.start && isSameDay(day, range.start));
  const isEnd = Boolean(range.end && isSameDay(day, range.end));
  const inMiddle = isInRange(day, range);
  const isEndpoint = isStart || isEnd;
  // 당일 선택(시작=종료)은 연결 바 없이 원만 표시
  const isSingle = isStart && isEnd;
  const weekday = day.getDay();

  const baseColor =
    weekday === 0
      ? "text-error-500"
      : weekday === 6
        ? "text-primary"
        : "text-text";

  const accessibilityLabel = `${new Intl.DateTimeFormat(locale, {
    dateStyle: "full",
  }).format(day)}${isStart && startLabel ? `, ${startLabel}` : ""}`;

  const showBar = hasRange && !isSingle && (inMiddle || isEndpoint);

  // 하이라이트 바 위치: 중간 날짜는 셀 전체 폭, 시작일은 오른쪽 절반(left 50%),
  // 종료일은 왼쪽 절반(right 50%). 웹의 left-1/2 / right-1/2와 동일한 의미를
  // 퍼센트 style로 직접 지정한다(NativeWind의 분수 위치보다 안정적).
  const barPosition = inMiddle
    ? { left: 0, right: 0 }
    : isStart
      ? { left: "50%" as const, right: 0 }
      : { left: 0, right: "50%" as const };

  return (
    <View accessibilityRole="button" className="flex-1">
      <Pressable
        onPress={onSelect}
        disabled={disabled}
        accessibilityLabel={accessibilityLabel}
        accessibilityState={{
          disabled,
          selected: isEndpoint || inMiddle,
        }}
        className="relative h-11 w-full items-center justify-center rounded-full"
      >
        {showBar && (
          <View
            className="absolute bg-primary-100"
            style={{ top: 4, bottom: 4, ...barPosition }}
          />
        )}

        {isEndpoint ? (
          <View
            className={cn(
              "z-10 items-center justify-center rounded-full bg-primary-500",
              isStart && startLabel ? "h-11 w-9 flex-col gap-0.5" : "size-9",
            )}
          >
            <Text className="text-body-sm leading-none text-neutral-0">
              {day.getDate()}
            </Text>
            {isStart && startLabel && (
              <Text className="text-[9px] leading-none text-neutral-0">
                {startLabel}
              </Text>
            )}
          </View>
        ) : (
          <Text
            className={cn(
              "z-10 text-body-md",
              disabled
                ? "text-text-disabled"
                : inMiddle
                  ? "text-primary-700"
                  : baseColor,
            )}
          >
            {day.getDate()}
          </Text>
        )}
      </Pressable>
    </View>
  );
};
