import { colors } from "@afterglow/tokens";
import { Input } from "@afterglow/ui-native";
import { Lightbulb, Search, X } from "lucide-react-native";
import { useState } from "react";
import { Pressable, Text, View } from "react-native";

import { PlaceCard } from "@/components/PlaceCard";
import { useDebounce } from "@/hooks/use-debounce";
import { usePlaces } from "@/hooks/use-places";
import { useI18n } from "@/i18n/i18n-provider";
import { type Place } from "@/types/place";

export interface PlaceStepProps {
  /** 여행 일자들 */
  days: Date[];
  /** 일자별 선택 장소 (인덱스 = n번째 날, null이면 미선택) */
  selected: (Place | null)[];
  /** 특정 날짜의 장소 선택/취소. place가 null이면 취소 */
  onSelect: (dayIndex: number, place: Place | null) => void;
}

/**
 * 관광지 선택 단계 (모든 날짜를 한 화면에서).
 *
 * RN에서는 패널이 이미 ScrollView라
 * 오버레이/중첩 스크롤이 까다롭다. 그래서 결과를 검색창 아래 인라인으로 렌더한다
 * (선택하면 결과가 닫히고 날짜 슬롯이 갱신됨).
 */
export function PlaceStep({ days, selected, onSelect }: PlaceStepProps) {
  const { locale, t } = useI18n();
  const formatDay = (date: Date) =>
    new Intl.DateTimeFormat(locale, { month: "long", day: "numeric" }).format(
      date,
    );
  const [query, setQuery] = useState("");
  // 검색 결과가 채워질 대상 날짜 인덱스
  const [activeIndex, setActiveIndex] = useState(0);
  const debouncedQuery = useDebounce(query, 300);
  const hasQuery = debouncedQuery.trim() !== "";
  const { data: places = [], isFetching } = usePlaces(debouncedQuery, {
    enabled: hasQuery,
  });

  // 범위 축소 등으로 인덱스가 벗어나면 클램프
  const active = Math.min(activeIndex, days.length - 1);
  const activeDate = days[active];

  const showResults = query.trim() !== "";
  const isSearching = debouncedQuery !== query || isFetching;
  // 활성 날짜에 이미 고른 장소는 결과에서 제외
  const results = places.filter((place) => place.id !== selected[active]?.id);

  // 활성 날짜에 장소를 채우고, 검색어를 비운 뒤 다음 빈 날짜로 이동
  const handlePick = (place: Place) => {
    onSelect(active, place);
    setQuery("");
    const nextEmpty = days.findIndex((_, i) => i !== active && !selected[i]);
    if (nextEmpty !== -1) {
      setActiveIndex(nextEmpty);
    }
  };

  return (
    <View className="gap-3 pt-2">
      <View className="flex-row items-start gap-2 rounded-[12px] bg-surface-accent px-4 py-3">
        <Lightbulb size={18} color={colors.primary} style={{ marginTop: 2 }} />
        <Text className="flex-1 text-body-sm text-text-secondary">
          {t("plan.place.hint")}
        </Text>
      </View>

      <Input
        size="md"
        placeholder={
          activeDate
            ? t("plan.place.searchForDate", { date: formatDay(activeDate) })
            : t("plan.place.search")
        }
        accessibilityLabel={t("plan.place.search")}
        value={query}
        onChangeText={setQuery}
        leftIcon={<Search size={18} color={colors["text-muted"]} />}
        rightIcon={
          query ? (
            <Pressable
              accessibilityLabel={t("home.search.clear")}
              onPress={() => setQuery("")}
            >
              <X size={18} color={colors["text-muted"]} />
            </Pressable>
          ) : undefined
        }
      />

      {/* 검색 결과 — 인라인 */}
      {showResults && (
        <View className="gap-2 rounded-[12px] border border-border bg-bg p-2">
          {results.length > 0 ? (
            results.map((place) => (
              <PlaceCard
                key={place.id}
                category={place.categoryName}
                placeType={place.placeType}
                primaryTypeName={place.primaryTypeName}
                name={place.placeName}
                address={place.roadAddressName || place.addressName}
                imageUrl={place.image}
                onSelect={() => handlePick(place)}
              />
            ))
          ) : (
            <Text className="py-6 text-center text-body-sm text-text-muted">
              {isSearching ? t("plan.place.loading") : t("home.search.empty")}
            </Text>
          )}
        </View>
      )}

      {/* 날짜별 슬롯 */}
      <View className="gap-3">
        {days.map((day, i) => {
          const place = selected[i] ?? null;
          const isActive = i === active;
          return (
            <View key={formatDay(day)} className="gap-1.5">
              <Text
                className={
                  isActive
                    ? "text-label-sm text-primary"
                    : "text-label-sm text-text"
                }
              >
                {formatDay(day)}
                {isActive && ` · ${t("plan.place.searchTarget")}`}
              </Text>

              {place ? (
                // 체크 표시를 눌러 선택 해제
                <PlaceCard
                  category={place.categoryName}
                  placeType={place.placeType}
                  primaryTypeName={place.primaryTypeName}
                  name={place.placeName}
                  address={place.roadAddressName || place.addressName}
                  imageUrl={place.image}
                  selected
                  onToggleSelect={() => onSelect(i, null)}
                />
              ) : (
                // PlaceCard와 동일한 박스 구조(p-3 + size-16)로 높이를 맞춰
                // 선택 시 레이아웃 시프트를 없앤다.
                <Pressable
                  accessibilityRole="button"
                  onPress={() => setActiveIndex(i)}
                  className={
                    isActive
                      ? "flex-row items-center gap-3 rounded-[12px] border-2 border-dashed border-primary bg-surface-accent p-3"
                      : "flex-row items-center gap-3 rounded-[12px] border-2 border-dashed border-border p-3"
                  }
                >
                  <View className="size-16 items-center justify-center rounded-[10px] bg-surface-muted">
                    <Search size={22} color={colors["text-muted"]} />
                  </View>
                  <Text
                    className={
                      isActive
                        ? "flex-1 text-body-sm text-primary"
                        : "flex-1 text-body-sm text-text-muted"
                    }
                  >
                    {t("plan.place.select")}
                  </Text>
                </Pressable>
              )}
            </View>
          );
        })}
      </View>
    </View>
  );
}
