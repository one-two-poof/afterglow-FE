import { cn } from "@afterglow/utils";
import { useState } from "react";
import { View } from "react-native";

import { Image } from "@/components/Image";
import { PlaceDefaultIcon } from "@/components/PlaceDefaultIcon";
import { normalizePlaceImageUrl } from "@/lib/place-detail";

export interface PlaceThumbnailProps {
  imageUrl?: string;
  placeType?: string;
  primaryTypeName?: string;
  className?: string;
}

/** DB 이미지 우선, 없거나 로딩 실패 시 장소 유형별 기본 SVG를 표시한다. */
export function PlaceThumbnail({
  imageUrl,
  placeType,
  primaryTypeName,
  className,
}: PlaceThumbnailProps) {
  const safeImageUrl = normalizePlaceImageUrl(imageUrl);
  const [failedImageUrl, setFailedImageUrl] = useState<string | null>(null);
  const thumbnailClass = cn(
    "size-16 shrink-0 rounded-[10px] bg-surface-muted",
    className,
  );

  if (safeImageUrl && failedImageUrl !== safeImageUrl) {
    return (
      <Image
        source={{ uri: safeImageUrl }}
        accessibilityIgnoresInvertColors
        contentFit="cover"
        cachePolicy="memory-disk"
        recyclingKey={safeImageUrl}
        transition={100}
        className={thumbnailClass}
        onError={() => setFailedImageUrl(safeImageUrl)}
      />
    );
  }

  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      className={cn(thumbnailClass, "items-center justify-center")}
    >
      <PlaceDefaultIcon
        placeType={placeType}
        primaryTypeName={primaryTypeName}
      />
    </View>
  );
}
