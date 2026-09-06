import { colors } from "@afterglow/tokens";
import {
  CalendarDays,
  ChevronRight,
  Home,
  MapPin,
  Route,
  Sparkles,
} from "lucide-react-native";
import { Pressable, Text, View } from "react-native";

import { useI18n } from "@/i18n/i18n-provider";

import {
  type CourseMarker,
  courseStartToMarker,
  courseSummary,
  type DailySchedule,
  recommendedPlaceToMarker,
  type RecommendedCourse,
  type RecommendedPlace,
} from "@/types/recommendation";

/** "YYYY-MM-DD" → "M월 D일 (요일)" (정오 기준으로 만들어 타임존 영향 제거) */
const formatDayLong = (iso: string, locale: string) => {
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return iso;
  return new Intl.DateTimeFormat(locale, {
    month: "long",
    day: "numeric",
    weekday: "short",
  }).format(new Date(y, m - 1, d, 12));
};

/** 요약 통계 카드 한 칸 (아이콘 + 값 + 라벨). */
function StatCard({
  icon,
  value,
  label,
}: {
  icon: React.ReactNode;
  value: string;
  label: string;
}) {
  return (
    <View className="flex-1 items-center gap-1 rounded-[12px] bg-surface-muted py-3">
      {icon}
      <Text className="text-label-lg text-text">{value}</Text>
      <Text className="text-caption text-text-muted">{label}</Text>
    </View>
  );
}

/** 장소 메타 정보 칩 (카테고리 · 실내/실외 · 도보 난이도). */
function MetaChip({ children }: { children: string }) {
  return (
    <View className="rounded-full bg-surface-muted px-2 py-0.5">
      <Text className="text-caption text-text-secondary">{children}</Text>
    </View>
  );
}

/** 타임라인의 한 노드(출발지 또는 방문 장소). 왼쪽 레일(원+세로선) + 오른쪽 내용. */
function TimelineNode({
  isLast,
  node,
  children,
}: {
  isLast: boolean;
  /** 원 안에 들어갈 표시 (숫자 또는 아이콘) */
  node: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <View className="flex-row gap-3">
      <View className="items-center">
        <View className="size-7 items-center justify-center rounded-full border border-primary bg-surface">
          {node}
        </View>
        {/* 마지막 노드가 아니면 다음 노드로 이어지는 세로선 */}
        <View
          className={isLast ? "w-px" : "w-px flex-1 bg-border"}
          accessibilityElementsHidden
        />
      </View>
      <View className="min-w-0 flex-1 pb-5">{children}</View>
    </View>
  );
}

/**
 * 노드 본문을 탭 가능하게 감싼다. onPress가 없으면(저장 코스 상세 등) 그대로 렌더.
 * 탭 가능하면 이름 옆에 셰브론을 곁들여 "눌러서 상세" 어포던스를 준다.
 */
function NodeBody({
  onPress,
  label,
  children,
}: {
  onPress?: () => void;
  label: string;
  children: React.ReactNode;
}) {
  if (!onPress) {
    return <>{children}</>;
  }
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      className="active:opacity-70"
    >
      {children}
    </Pressable>
  );
}

/** 방문 장소 한 곳. onPress가 주어지면 탭해서 지도 상세로 이동할 수 있다. */
function PlaceNode({
  place,
  isLast,
  onPress,
}: {
  place: RecommendedPlace;
  isLast: boolean;
  onPress?: () => void;
}) {
  const { t } = useI18n();
  const meta = [
    place.place_category,
    place.is_indoor === 1 ? t("course.indoor") : t("course.outdoor"),
    place.walk_hard
      ? t("course.walkDifficulty", { level: place.walk_hard })
      : "",
  ].filter(Boolean);

  return (
    <TimelineNode
      isLast={isLast}
      node={
        <Text className="text-label-sm text-primary">{place.visit_order}</Text>
      }
    >
      <NodeBody
        onPress={onPress}
        label={t("course.viewOnMap", { name: place.place_name })}
      >
        {place.dist_to_prev_km > 0 ? (
          <Text className="text-caption text-text-muted">
            {t("course.distanceFromPrevious", {
              distance: place.dist_to_prev_km,
            })}
          </Text>
        ) : null}
        <View className="flex-row items-center gap-1">
          <Text className="text-label-lg text-text">{place.place_name}</Text>
          {onPress ? (
            <ChevronRight size={16} color={colors["text-muted"]} />
          ) : null}
        </View>
        {meta.length > 0 ? (
          <View className="mt-1.5 flex-row flex-wrap gap-1.5">
            {meta.map((m) => (
              <MetaChip key={m}>{m}</MetaChip>
            ))}
          </View>
        ) : null}
      </NodeBody>
    </TimelineNode>
  );
}

/** 하루치 일정 섹션 (날짜 헤더 + 시술 안내 + 출발지 + 방문 장소 타임라인). */
function DaySection({
  day,
  index,
  treatments,
  onPlacePress,
}: {
  day: DailySchedule;
  index: number;
  treatments: RecommendedCourse["treatment"];
  /** 노드(출발지·방문 장소) 탭 시 해당 지점 마커로 호출. 없으면 비대화형. */
  onPlacePress?: (marker: CourseMarker) => void;
}) {
  const { locale, t } = useI18n();
  const dayTreatments = treatments.filter((t) => t.date === day.date);

  return (
    <View className="rounded-[16px] border border-border bg-surface p-4">
      <View className="mb-3 flex-row items-baseline gap-2">
        <Text className="text-overline text-primary">DAY {index + 1}</Text>
        <Text className="text-label-md text-text">
          {formatDayLong(day.date, locale)}
        </Text>
      </View>

      {dayTreatments.length > 0 ? (
        <View className="mb-3 flex-row flex-wrap items-center gap-1.5 rounded-[12px] bg-surface-accent px-3 py-2">
          <Sparkles size={14} color={colors.primary} />
          {dayTreatments.map((t) => (
            <Text key={t.name} className="text-label-sm text-primary">
              {t.name}
            </Text>
          ))}
          <Text className="text-caption text-text-secondary">
            {t("course.treatmentScheduled")}
          </Text>
        </View>
      ) : null}

      {/* 출발지 노드 */}
      <TimelineNode
        isLast={day.places.length === 0}
        node={<Home size={14} color={colors.primary} />}
      >
        <NodeBody
          onPress={
            onPlacePress
              ? () => onPlacePress(courseStartToMarker(day.start_location))
              : undefined
          }
          label={t("course.viewOnMap", { name: day.start_location.name })}
        >
          <Text className="text-caption text-primary">
            {t("course.departure")}
          </Text>
          <View className="flex-row items-center gap-1">
            <Text className="text-label-lg text-text">
              {day.start_location.name}
            </Text>
            {onPlacePress ? (
              <ChevronRight size={16} color={colors["text-muted"]} />
            ) : null}
          </View>
        </NodeBody>
      </TimelineNode>

      {day.places.map((place, i) => (
        <PlaceNode
          key={place.visit_order}
          place={place}
          isLast={i === day.places.length - 1}
          onPress={
            onPlacePress
              ? () => onPlacePress(recommendedPlaceToMarker(place))
              : undefined
          }
        />
      ))}
    </View>
  );
}

/**
 * 코스 하나의 본문(요약 통계 + 시술 태그 + 날짜별 일정 타임라인).
 * 저장 코스 상세(CourseDetail)와 추천 결과(ResultStep)가 동일한 표현을 공유하도록
 * 분리한 재사용 컴포넌트. RecommendedCourse면 되므로 SavedCourse도 그대로 받는다.
 */
export function CourseItinerary({
  course,
  onPlacePress,
  summaryAction,
}: {
  course: RecommendedCourse;
  /** 타임라인 노드 탭 시 해당 지점 마커로 호출(추천 패널 전용). 없으면 비대화형. */
  onPlacePress?: (marker: CourseMarker) => void;
  /** 요약 통계 바로 아래에 표시할 선택적 액션. */
  summaryAction?: React.ReactNode;
}) {
  const { t } = useI18n();
  const { days, placeCount, distanceKm } = courseSummary(course);

  return (
    <View className="gap-4">
      {course.treatment.length > 0 ? (
        <View className="flex-row flex-wrap gap-1.5">
          {course.treatment.map((t) => (
            <View
              key={`${t.name}-${t.date}`}
              className="rounded-full bg-surface-accent px-2.5 py-1"
            >
              <Text className="text-caption text-primary">{t.name}</Text>
            </View>
          ))}
        </View>
      ) : null}

      <View className="flex-row gap-2">
        <StatCard
          icon={<CalendarDays size={18} color={colors.primary} />}
          value={t("course.days", { count: days })}
          label={t("course.schedule")}
        />
        <StatCard
          icon={<MapPin size={18} color={colors.primary} />}
          value={t("course.places", { count: placeCount })}
          label={t("course.destinations")}
        />
        <StatCard
          icon={<Route size={18} color={colors.primary} />}
          value={`${distanceKm}km`}
          label={t("course.totalDistance")}
        />
      </View>

      {summaryAction}

      {course.daily_schedules.map((day, i) => (
        <DaySection
          key={day.date}
          day={day}
          index={i}
          treatments={course.treatment}
          onPlacePress={onPlacePress}
        />
      ))}
    </View>
  );
}
