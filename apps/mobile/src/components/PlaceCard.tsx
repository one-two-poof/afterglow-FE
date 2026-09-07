import { colors } from "@afterglow/tokens";
import { cn } from "@afterglow/utils";
import { Check } from "lucide-react-native";
import { Pressable, Text, View } from "react-native";

import { PlaceThumbnail } from "@/components/PlaceThumbnail";
import { useI18n } from "@/i18n/i18n-provider";

/**
 * 장소 정보 카드 컴포넌트.
 *
 * 구현 메모:
 * - `<button>`/`<div>` → 상호작용 여부에 따라 `Pressable`/`View`, 문자열은 전부 `<Text>`.
 * - `<img>` → RN `Image`. `src`는 `source={{ uri }}`, `object-cover`는 `resizeMode="cover"`.
 *   이미지가 없으면 bg-surface-muted placeholder `View`를 그린다.
 * - lucide-react → `lucide-react-native`의 `Check`. 흰색 체크는 토큰 `colors["neutral-0"]`로 준다
 *   (Text가 아니라 SVG라 className 글자색이 먹지 않으므로 color prop 사용).
 * - `hover:` / `focus-visible:ring` / `transition`은 네이티브에 없어 제거했다.
 * - `truncate` → RN `Text`의 `numberOfLines={1}`.
 *
 * 상호작용 모드는 두 가지:
 * - onToggleSelect가 주어지면: 카드 전체는 비대화형(View), 체크만 Pressable(선택 해제).
 * - 없으면: 카드 전체가 Pressable(onSelect), 우측 인디케이터는 비대화형 표시용.
 */
export interface PlaceCardProps {
  name: string;
  address: string;
  /** 카테고리 태그 (예: "피부과") */
  category?: string;
  /** 이미지가 없을 때 표시할 기본 아이콘의 상위 장소 유형 */
  placeType?: string;
  /** 관광지 기본 아이콘을 고르는 세부 분류명 */
  primaryTypeName?: string;
  imageUrl?: string;
  selected?: boolean;
  onSelect?: () => void;
  /**
   * 선택 상태에서 체크 표시를 눌러 해제할 때 호출.
   * 주어지면 체크가 버튼이 되고, 카드 전체 클릭(onSelect)은 비활성화된다.
   */
  onToggleSelect?: () => void;
  className?: string;
}

export const PlaceCard = ({
  name,
  address,
  category,
  placeType,
  primaryTypeName,
  imageUrl,
  selected = false,
  onSelect,
  onToggleSelect,
  className,
}: PlaceCardProps) => {
  const { t } = useI18n();
  const cardClass = cn(
    "w-full flex-row items-center gap-3 rounded-[12px] border-2 bg-surface p-3 shadow-sm",
    selected ? "border-primary" : "border-transparent",
    className,
  );

  const thumb = (
    <PlaceThumbnail
      imageUrl={imageUrl}
      placeType={placeType}
      primaryTypeName={primaryTypeName}
    />
  );

  const info = (
    <View className="min-w-0 flex-1">
      {category && (
        <Text className="text-caption text-text-muted">{category}</Text>
      )}
      <Text numberOfLines={1} className="text-label-lg text-text">
        {name}
      </Text>
      <Text numberOfLines={1} className="text-body-sm text-text-muted">
        {address}
      </Text>
    </View>
  );

  // 체크로 해제하는 모드: 카드 전체는 비대화형(View), 체크만 Pressable
  if (onToggleSelect) {
    return (
      <View className={cardClass}>
        {thumb}
        {info}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t("place.deselect")}
          onPress={onToggleSelect}
          className="size-6 shrink-0 items-center justify-center rounded-full bg-primary active:opacity-80"
        >
          <Check size={14} strokeWidth={3} color={colors["neutral-0"]} />
        </Pressable>
      </View>
    );
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onSelect}
      className={cn(cardClass, "active:opacity-90")}
    >
      {thumb}
      {info}
      <View
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        className={cn(
          "size-6 shrink-0 items-center justify-center rounded-full",
          selected ? "bg-primary" : "border-2 border-neutral-300",
        )}
      >
        {selected && (
          <Check size={14} strokeWidth={3} color={colors["neutral-0"]} />
        )}
      </View>
    </Pressable>
  );
};
