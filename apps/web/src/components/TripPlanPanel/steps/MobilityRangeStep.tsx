"use client";

import { cn } from "@afterglow/utils";
import { Check, MapPin } from "lucide-react";

const MOBILITY_RANGES = [
  {
    value: 1,
    label: "가까운 동네",
    description: "시작 관광지 주변에서 여유롭게 둘러봐요.",
  },
  {
    value: 2,
    label: "인접 지역",
    description: "가까운 지역까지 가볍게 이동해요.",
  },
  {
    value: 3,
    label: "적당한 이동",
    description: "여러 지역을 균형 있게 둘러봐요.",
  },
  {
    value: 4,
    label: "넓은 이동",
    description: "조금 멀어도 원하는 명소를 찾아가요.",
  },
  {
    value: 5,
    label: "도시 전체",
    description: "거리 제한 없이 다양한 지역을 탐방해요.",
  },
];

export interface MobilityRangeStepProps {
  value: number | null;
  onChange: (value: number) => void;
}

export const MobilityRangeStep = ({
  value,
  onChange,
}: MobilityRangeStepProps) => (
  <div className="flex flex-col gap-3 pt-2">
    <p className="text-body-sm text-text-secondary">
      하루의 시작 관광지에서 얼마나 멀리까지 이동해도 괜찮은지 알려주세요.
    </p>
    {MOBILITY_RANGES.map((option) => {
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
          <MapPin
            aria-hidden="true"
            className="shrink-0 text-primary"
            size={18 + option.value * 2}
          />
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
            {selected ? <Check size={14} strokeWidth={3} /> : null}
          </span>
        </button>
      );
    })}
  </div>
);
