"use client";

import { type ReactNode, useCallback, useState } from "react";

import { addDays, formatISODate, type DateRange } from "@/components/Calendar";
import type { Place } from "@/types/place";

import { buildTripPlanPayload } from "../payload";
import { PlaceStep } from "../steps/PlaceStep";
import { PurposeStep } from "../steps/PurposeStep";
import { ScheduleStep } from "../steps/ScheduleStep";
import { TreatmentDateStep } from "../steps/TreatmentDateStep";
import { TreatmentStep } from "../steps/TreatmentStep";
import { ActivityLevelStep } from "../steps/ActivityLevelStep";
import { MobilityRangeStep } from "../steps/MobilityRangeStep";
import type { TripPlanPayload } from "../types";

const MS_PER_DAY = 86400000;

/** 선택한 여행 기간의 일수(시작·종료일 포함). 미선택 시 0 */
const getDayCount = ({ start, end }: DateRange) =>
  start && end
    ? Math.round((end.getTime() - start.getTime()) / MS_PER_DAY) + 1
    : 0;

export interface FormStep {
  title: string;
  /** 다음 단계로 진행 가능한지 */
  canNext: boolean;
  content: ReactNode;
}

export interface TripPlanForm {
  /** 순서대로 진행할 폼 단계들 */
  steps: FormStep[];
  /** 모든 선택 값 초기화 */
  reset: () => void;
  /** 현재 선택 값으로 제출 페이로드 조립 (미완성 시 null) */
  buildPayload: () => TripPlanPayload | null;
}

/**
 * 여행 계획 폼의 상태·핸들러·단계 구성을 소유한다.
 * 패널 컴포넌트는 이 훅이 준 steps/reset/buildPayload만 사용한다.
 */
export const useTripPlanForm = (): TripPlanForm => {
  const [range, setRange] = useState<DateRange>({ start: null, end: null });
  // 선택한 시술 종류(한글)
  const [treatments, setTreatments] = useState<string[]>([]);
  // 시술 → 날짜("YYYY-MM-DD") 매칭 (같은 날짜에 여러 시술 가능)
  const [treatmentDates, setTreatmentDates] = useState<Record<string, string>>(
    {},
  );
  // 여행 주요 목적 (단일 선택)
  const [purpose, setPurpose] = useState<string | null>(null);
  // 도보 선호도 (1~5)
  const [mobilityRange, setMobilityRange] = useState<number | null>(null);
  const [activityLevel, setActivityLevel] = useState<number | null>(null);
  // 여행 일자별 선택 숙소 (인덱스 = n번째 날). null이면 미선택.
  const [selectedPlaces, setSelectedPlaces] = useState<(Place | null)[]>([]);

  // 여행 일수 및 일자 목록(시술 날짜 매칭 / 숙소 단계에서 사용)
  const dayCount = getDayCount(range);
  const tripDays = range.start
    ? Array.from({ length: dayCount }, (_, i) => addDays(range.start!, i))
    : [];
  const tripDayISO = tripDays.map(formatISODate);

  const toggleTreatment = (name: string) => {
    const isSelected = treatments.includes(name);
    setTreatments((prev) =>
      isSelected ? prev.filter((t) => t !== name) : [...prev, name],
    );
    // 해제 시 매칭된 날짜도 제거
    if (isSelected) {
      setTreatmentDates((prev) => {
        const next = { ...prev };
        delete next[name];
        return next;
      });
    }
  };

  const assignTreatmentDate = (name: string, date: string) =>
    setTreatmentDates((prev) => ({ ...prev, [name]: date }));

  // place가 null이면 해당 날의 선택을 취소한다.
  const selectPlace = (dayIndex: number, place: Place | null) =>
    setSelectedPlaces((prev) => {
      const next = [...prev];
      next[dayIndex] = place;
      return next;
    });

  // 모든 선택 시술이 현재 여행 일자 내로 매칭되었는지
  const allTreatmentsDated =
    treatments.length > 0 &&
    treatments.every((t) => tripDayISO.includes(treatmentDates[t] ?? ""));

  const steps: FormStep[] = [
    {
      title: "여행 일정 선택",
      canNext: Boolean(range.start && range.end),
      content: <ScheduleStep value={range} onChange={setRange} />,
    },
    {
      title: "시술 종류 선택",
      canNext: treatments.length > 0,
      content: (
        <TreatmentStep selected={treatments} onToggle={toggleTreatment} />
      ),
    },
    {
      title: "시술 날짜 선택",
      canNext: allTreatmentsDated,
      content: (
        <TreatmentDateStep
          treatments={treatments}
          days={tripDays}
          value={treatmentDates}
          onAssign={assignTreatmentDate}
        />
      ),
    },
    ...(dayCount > 0
      ? [
          {
            title: "관광지 선택",
            // 모든 날짜에 장소가 채워져야 다음으로
            canNext: Array.from({ length: dayCount }).every((_, i) =>
              Boolean(selectedPlaces[i]),
            ),
            content: (
              <PlaceStep
                days={tripDays}
                selected={selectedPlaces}
                onSelect={selectPlace}
              />
            ),
          },
        ]
      : []),
    {
      title: "여행 주요 목적 선택",
      canNext: Boolean(purpose),
      content: <PurposeStep value={purpose} onChange={setPurpose} />,
    },
    {
      title: "활동 반경 선택",
      canNext: mobilityRange !== null,
      content: (
        <MobilityRangeStep value={mobilityRange} onChange={setMobilityRange} />
      ),
    },
    {
      title: "활동 강도 선택",
      canNext: activityLevel !== null,
      content: (
        <ActivityLevelStep value={activityLevel} onChange={setActivityLevel} />
      ),
    },
  ];

  // setter들은 참조 안정적 → 빈 deps로 memoize (패널 handleClose 의존성 안정화)
  const reset = useCallback(() => {
    setRange({ start: null, end: null });
    setTreatments([]);
    setTreatmentDates({});
    setPurpose(null);
    setMobilityRange(null);
    setActivityLevel(null);
    setSelectedPlaces([]);
  }, []);

  const buildPayload = () =>
    buildTripPlanPayload(
      range,
      // 여행 일수만큼만 (기간 축소 시 남은 이전 선택 제외)
      selectedPlaces.slice(0, dayCount).map((place) => place?.id ?? null),
      treatments,
      treatmentDates,
      purpose ?? "",
      mobilityRange ?? 3,
      activityLevel ?? 3,
    );

  return { steps, reset, buildPayload };
};
