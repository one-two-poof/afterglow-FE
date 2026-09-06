import { colors } from "@afterglow/tokens";
import { Copy, ExternalLink, Navigation, Phone, X } from "lucide-react-native";
import { useEffect, useMemo, useState } from "react";
import {
  Animated,
  PanResponder,
  Pressable,
  ScrollView,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import type { MarkerDetail } from "@/components/MapLibreMap/types";
import { PlaceThumbnail } from "@/components/PlaceThumbnail";
import { useI18n } from "@/i18n/i18n-provider";

interface PlaceDetailSheetProps {
  detail: MarkerDetail;
  expanded: boolean;
  onExpandedChange: (expanded: boolean) => void;
  onClose: () => void;
  onRoutePress: () => void;
  onCopyPress: () => void;
  onExternalMapPress: () => void;
}

const COLLAPSED_CONTENT_HEIGHT = 148;
const DRAG_THRESHOLD = 36;

export function PlaceDetailSheet({
  detail,
  expanded,
  onExpandedChange,
  onClose,
  onRoutePress,
  onCopyPress,
  onExternalMapPress,
}: PlaceDetailSheetProps) {
  const { t } = useI18n();
  const { height: windowHeight } = useWindowDimensions();
  const sheetHeight = Math.min(windowHeight * 0.58, 520);
  const collapsedOffset = Math.max(sheetHeight - COLLAPSED_CONTENT_HEIGHT, 0);
  const [translateY] = useState(
    () => new Animated.Value(expanded ? 0 : collapsedOffset),
  );

  const moveTo = (nextExpanded: boolean) => {
    const nextOffset = nextExpanded ? 0 : collapsedOffset;
    onExpandedChange(nextExpanded);
    Animated.spring(translateY, {
      toValue: nextOffset,
      damping: 24,
      stiffness: 240,
      mass: 0.8,
      useNativeDriver: true,
    }).start();
  };

  useEffect(() => {
    const nextOffset = expanded ? 0 : collapsedOffset;
    Animated.spring(translateY, {
      toValue: nextOffset,
      damping: 24,
      stiffness: 240,
      mass: 0.8,
      useNativeDriver: true,
    }).start();
  }, [collapsedOffset, expanded, translateY]);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponderCapture: (_, gesture) =>
          Math.abs(gesture.dy) > 4 &&
          Math.abs(gesture.dy) > Math.abs(gesture.dx),
        onPanResponderGrant: () => {
          translateY.stopAnimation();
        },
        onPanResponderMove: (_, gesture) => {
          const dragStartOffset = expanded ? 0 : collapsedOffset;
          translateY.setValue(
            Math.min(
              collapsedOffset,
              Math.max(0, dragStartOffset + gesture.dy),
            ),
          );
        },
        onPanResponderRelease: (_, gesture) => {
          if (gesture.dy <= -DRAG_THRESHOLD || gesture.vy <= -0.5) {
            moveTo(true);
          } else if (gesture.dy >= DRAG_THRESHOLD || gesture.vy >= 0.5) {
            moveTo(false);
          } else {
            moveTo(expanded);
          }
        },
        onPanResponderTerminate: () => moveTo(expanded),
      }),
    // moveTo uses the latest snap-point values captured by these dependencies.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [collapsedOffset, expanded, translateY],
  );

  const routeButton = (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t("route.guide")}
      onPress={onRoutePress}
      className="mx-5 mt-1 mb-2 h-11 flex-row items-center justify-center gap-2 rounded-[8px] bg-primary active:bg-action-primary-hover"
    >
      <Navigation size={16} color={colors["on-action-primary"]} />
      <Text className="text-label-lg text-on-action-primary">
        {t("route.guide")}
      </Text>
    </Pressable>
  );

  return (
    <Animated.View
      style={{ height: sheetHeight, transform: [{ translateY }] }}
      className="absolute inset-x-0 bottom-0 overflow-hidden rounded-t-[16px] bg-neutral-0 shadow-md"
    >
      <SafeAreaView edges={expanded ? ["bottom"] : []} className="flex-1">
        <View {...panResponder.panHandlers}>
          <View className="items-center pt-2 pb-1">
            <View className="h-1 w-10 rounded-full bg-border" />
          </View>

          <View className="flex-row items-start gap-3 px-5 pb-2">
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={
                expanded ? t("home.detail.collapse") : t("home.detail.expand")
              }
              accessibilityState={{ expanded }}
              onPress={() => moveTo(!expanded)}
              className="flex-1 flex-row items-start gap-3"
            >
              <PlaceThumbnail
                imageUrl={detail.image}
                placeType={detail.placeType}
                primaryTypeName={detail.primaryTypeName}
              />
              <View className="flex-1">
                <Text
                  numberOfLines={expanded ? undefined : 1}
                  className="text-heading-sm text-text"
                >
                  {detail.title}
                </Text>
                {detail.subtitle ? (
                  <Text
                    numberOfLines={expanded ? undefined : 1}
                    className="mt-1 text-body-sm text-text-secondary"
                  >
                    {detail.subtitle}
                  </Text>
                ) : null}
                {!expanded && detail.description ? (
                  <Text
                    numberOfLines={1}
                    className="mt-0.5 text-body-sm text-text-muted"
                  >
                    {detail.description}
                  </Text>
                ) : null}
              </View>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t("home.detail.close")}
              onPress={onClose}
              hitSlop={8}
              className="p-1"
            >
              <X size={20} color={colors["text-muted"]} />
            </Pressable>
          </View>
        </View>

        {expanded ? (
          <>
            <ScrollView
              className="flex-1 px-5"
              contentContainerClassName="gap-4 py-3"
            >
              {detail.description ? (
                <View>
                  <Text className="text-label-sm text-text-muted">
                    {t("home.detail.address")}
                  </Text>
                  <Text className="mt-1 text-body-md text-text">
                    {detail.description}
                  </Text>
                </View>
              ) : null}
              {detail.phone ? (
                <View className="flex-row items-center gap-2">
                  <Phone size={18} color={colors["text-secondary"]} />
                  <Text className="text-body-md text-text">{detail.phone}</Text>
                </View>
              ) : null}
            </ScrollView>
            <View className="mx-5 mb-2 flex-row gap-2">
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t("home.detail.copyPlace")}
                onPress={onCopyPress}
                className="h-11 flex-1 flex-row items-center justify-center gap-2 rounded-[8px] border border-border bg-surface active:bg-surface-muted"
              >
                <Copy size={16} color={colors["text-secondary"]} />
                <Text className="text-label-md text-text">
                  {t("home.detail.copyPlace")}
                </Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t("home.detail.openExternalMap")}
                onPress={onExternalMapPress}
                className="h-11 flex-1 flex-row items-center justify-center gap-2 rounded-[8px] border border-border bg-surface active:bg-surface-muted"
              >
                <ExternalLink size={16} color={colors["text-secondary"]} />
                <Text className="text-label-md text-text">
                  {t("home.detail.openExternalMap")}
                </Text>
              </Pressable>
            </View>
            {routeButton}
          </>
        ) : (
          routeButton
        )}
      </SafeAreaView>
    </Animated.View>
  );
}
