"use client";

import { cn } from "@afterglow/utils";
import { Check } from "lucide-react";

export interface ActivityLevelOption {
  /** 제출 값 (1~5) */
  value: number;
  label: string;
  emoji: string;
  description: string;
}

/** 활동 강도 선택지. 기존 도보 선호도 값과 동일한 1~5 척도를 사용한다. */
export const ACTIVITY_LEVELS: ActivityLevelOption[] = [
  {
    value: 1,
    label: "여유형",
    emoji: "🚗",
    description: "도보 10분 미만, 택시/지하철 바로 앞 명소 위주",
  },
  {
    value: 2,
    label: "가벼운 활동형",
    emoji: "🚶",
    description: "도보 10~30분, 가벼운 가로수길이나 쇼핑몰 산책",
  },
  {
    value: 3,
    label: "표준 활동형",
    emoji: "🏃",
    description: "도보 30분 이상, 활동적인 트레킹이나 광범위 탐방",
  },
  {
    value: 4,
    label: "적극 활동형",
    emoji: "🏃",
    description: "도보 30분 이상, 활동적인 트레킹이나 광범위 탐방",
  },
  {
    value: 5,
    label: "도보 탐방형",
    emoji: "🏃",
    description: "도보 30분 이상, 활동적인 트레킹이나 광범위 탐방",
  },
];

export interface ActivityLevelStepProps {
  value: number | null;
  onChange: (value: number) => void;
}

/** 활동 강도 선택 (단일 선택). 1~5 숫자를 제출 */
export const ActivityLevelStep = ({
  value,
  onChange,
}: ActivityLevelStepProps) => (
  <div className="flex flex-col gap-3 pt-2">
    <p className="text-body-sm text-text-secondary">
      시술 후 체력 및 회복 상태를 고려해 도보 정도를 알려주세요.
    </p>

    {ACTIVITY_LEVELS.map((option) => {
      const selected = value === option.value;
      return (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          aria-pressed={selected}
          className={cn(
            "flex w-full items-center gap-3 rounded-[12px] border-2 bg-surface p-3 text-left shadow-sm transition-colors focus-visible:ring-2 focus-visible:ring-border-focus focus-visible:outline-none",
            selected
              ? "border-primary"
              : "border-transparent hover:border-border",
          )}
        >
          <span aria-hidden="true" className="text-2xl leading-none">
            {option.emoji}
          </span>

          <div className="min-w-0 flex-1">
            <p className="text-label-lg text-text">{option.label}</p>
            <p className="text-body-sm text-text-muted">{option.description}</p>
          </div>

          <span
            aria-hidden="true"
            className={cn(
              "flex size-6 shrink-0 items-center justify-center rounded-full",
              selected
                ? "bg-primary text-neutral-0"
                : "border-2 border-neutral-300",
            )}
          >
            {selected && <Check size={14} strokeWidth={3} />}
          </span>
        </button>
      );
    })}
  </div>
);
