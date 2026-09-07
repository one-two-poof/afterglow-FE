import { useToastStore } from "@afterglow/stores";
import { useEffect, useState } from "react";
import { Animated, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

/**
 * 앱 전역 토스트.
 *
 * RN엔 CSS transition이 없으므로
 * `Animated`로 페이드+슬라이드를 직접 구동한다. 스토어(@afterglow/stores)를 구독해 렌더만 담당한다.
 */
const VISIBLE_DURATION = 2500;
const ANIM_DURATION = 200;

export function Toast() {
  const message = useToastStore((s) => s.message);
  const clear = useToastStore((s) => s.clear);
  const insets = useSafeAreaInsets();
  // useRef(...).current를 렌더에서 읽으면 react-hooks/refs가 막으므로 useState 지연
  // 초기화로 안정적인 Animated.Value를 만든다.
  const [progress] = useState(() => new Animated.Value(0));

  useEffect(() => {
    if (!message) {
      return;
    }

    // 등장: 페이드 인 + 살짝 위로 슬라이드
    Animated.timing(progress, {
      toValue: 1,
      duration: ANIM_DURATION,
      useNativeDriver: true,
    }).start();

    // 일정 시간 뒤 퇴장 애니메이션 후 스토어 clear (clear되면 message=null로 언마운트)
    const timer = setTimeout(() => {
      Animated.timing(progress, {
        toValue: 0,
        duration: ANIM_DURATION,
        useNativeDriver: true,
      }).start(() => clear());
    }, VISIBLE_DURATION);

    return () => clearTimeout(timer);
  }, [message, clear, progress]);

  if (!message) {
    return null;
  }

  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        bottom: insets.bottom + 90,
        alignItems: "center",
        paddingHorizontal: 20,
        opacity: progress,
        transform: [
          {
            translateY: progress.interpolate({
              inputRange: [0, 1],
              outputRange: [8, 0],
            }),
          },
        ],
      }}
    >
      <View
        accessibilityRole="alert"
        className="rounded-full bg-neutral-900 px-4 py-2.5 shadow-md"
      >
        <Text className="text-label-md text-neutral-0">{message}</Text>
      </View>
    </Animated.View>
  );
}
