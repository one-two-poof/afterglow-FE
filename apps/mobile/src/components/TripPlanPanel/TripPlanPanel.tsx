import { useToastStore } from "@afterglow/stores";
import { Button } from "@afterglow/ui-native";
import { ArrowLeft, X } from "lucide-react-native";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Animated,
  BackHandler,
  KeyboardAvoidingView,
  type LayoutChangeEvent,
  PanResponder,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

import { Image } from "@/components/Image";
import { useCourseSelection } from "@/hooks/use-course-selection";
import { useMe } from "@/hooks/use-me";
import { useI18n } from "@/i18n/i18n-provider";
import { type RecommendedCourse } from "@/types/recommendation";

import { useRecommendCourses } from "./hooks/use-recommend-courses";
import { useTripPlanForm } from "./hooks/use-trip-plan-form";
import { ResultStep } from "./ResultStep";

// 접었을 때 화면에 남길 최소 노출 높이. 0이면 패널을 화면 밖으로 완전히 내린다
// (하단의 + 버튼이 가려지지 않도록). 다시 열기는 + 버튼이 담당한다.
const COLLAPSED_HEIGHT_RATIO = 0;
const MIN_COLLAPSED_HEIGHT = 0;
const DRAG_THRESHOLD = 48;

export interface TripPlanPanelProps {
  open: boolean;
  onClose: () => void;
  /** 결과 단계에서 현재 추천 코스 전체를 지도에서 본다. */
  onViewCourse?: (course: RecommendedCourse) => void;
}

/**
 * 여행 계획 폼 패널 (RN 바텀시트).
 *
 * 두 국면: 폼 작성(form) → 제출 후 추천 코스 브라우징(result). 폼 상태·단계는
 * useTripPlanForm 훅이 소유하고, 여기서는 단계 진행/제출/rank 브라우징만
 * 오케스트레이션한다.
 */
export const TripPlanPanel = ({
  open,
  onClose,
  onViewCourse,
}: TripPlanPanelProps) => {
  const { t } = useI18n();
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  const [sheetHeight, setSheetHeight] = useState(0);
  const collapsedHeight = Math.min(
    Math.max(sheetHeight * COLLAPSED_HEIGHT_RATIO, MIN_COLLAPSED_HEIGHT),
    sheetHeight,
  );
  const collapsedOffset = Math.max(sheetHeight - collapsedHeight, 0);
  const [translateY] = useState(() => new Animated.Value(0));
  // 슬라이드 아웃 애니메이션이 끝난 뒤 언마운트하기 위한 상태. 애니메이션 완료
  // 콜백에서만 갱신한다(effect 본문에서 동기로 setState 하지 않도록).
  const [mounted, setMounted] = useState(open);
  // open=true 면 즉시 렌더(슬라이드 인), 닫힐 땐 아웃 애니메이션 동안 유지한다.
  const visible = open || mounted;
  const { steps, reset: resetForm, buildPayload } = useTripPlanForm();
  const [step, setStep] = useState(0);

  // 국면: 폼 작성 → 제출 후 결과(rank 브라우징)
  const [phase, setPhase] = useState<"form" | "result">("form");
  // 현재 보고 있는 rank 인덱스 (건너뛰기로 증가)
  const [rankIndex, setRankIndex] = useState(0);

  // 헤더 아바타용 로그인 사용자. 패널은 로그인 상태에서만 열리므로 open일 때만 조회.
  const { data: me } = useMe(open);

  const recommendMutation = useRecommendCourses();
  const recommendations = recommendMutation.data ?? [];
  const { reset: resetRecommend } = recommendMutation;

  const courseSelection = useCourseSelection();

  const showToast = useToastStore((s) => s.show);

  const springTo = useCallback(
    (toValue: number) =>
      Animated.spring(translateY, {
        toValue,
        damping: 26,
        stiffness: 220,
        mass: 0.9,
        useNativeDriver: true,
      }),
    [translateY],
  );

  // 위로 스프링(펼치기) 또는 닫기. 닫기는 open=false 를 유발하고, 아래 open 효과가
  // 슬라이드 아웃 애니메이션을 재생한 뒤 언마운트한다(하단 + 버튼으로 다시 열림).
  const moveTo = useCallback(
    (nextOpen: boolean) => {
      if (nextOpen) {
        springTo(0).start();
      } else {
        onClose();
      }
    },
    [onClose, springTo],
  );

  // open 전환에 맞춰 슬라이드 인/아웃.
  // 열기: 화면 밖(hiddenOffset) → 0. 닫기: 현재 위치 → 화면 밖 → 언마운트.
  // 숨김 위치는 창 높이(안정값)로 잡는다. sheetHeight(측정값)를 쓰면 최초 열기 때
  // onLayout 으로 값이 바뀌며 슬라이드 인 애니메이션이 중단된다. 창 높이면 패널
  // 높이보다 크므로 항상 화면 밖으로 완전히 내려간다.
  const prevOpenRef = useRef(open);
  useLayoutEffect(() => {
    const wasOpen = prevOpenRef.current;
    prevOpenRef.current = open;
    if (open === wasOpen) return;

    if (open) {
      // 페인트 전에 시작 위치를 화면 밖으로 잡아 첫 프레임 깜빡임을 막는다.
      translateY.setValue(windowHeight);
      const anim = springTo(0);
      anim.start(({ finished }) => {
        if (finished) setMounted(true);
      });
      return () => anim.stop();
    }
    const anim = springTo(windowHeight);
    anim.start(({ finished }) => {
      if (finished) setMounted(false);
    });
    return () => anim.stop();
  }, [open, windowHeight, springTo, translateY]);

  const handleLayout = useCallback((event: LayoutChangeEvent) => {
    setSheetHeight(event.nativeEvent.layout.height);
  }, []);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, gesture) =>
          Math.abs(gesture.dy) > 4 &&
          Math.abs(gesture.dy) > Math.abs(gesture.dx),
        onPanResponderGrant: () => translateY.stopAnimation(),
        onPanResponderMove: (_, gesture) => {
          // 열린 상태에서 시작하므로 항상 0(맨 위)에서부터 아래로만 따라간다.
          translateY.setValue(
            Math.min(collapsedOffset, Math.max(0, gesture.dy)),
          );
        },
        onPanResponderRelease: (_, gesture) => {
          if (gesture.dy <= -DRAG_THRESHOLD || gesture.vy <= -0.5) {
            moveTo(true);
          } else if (gesture.dy >= DRAG_THRESHOLD || gesture.vy >= 0.5) {
            moveTo(false);
          } else {
            moveTo(true);
          }
        },
        onPanResponderTerminate: () => moveTo(true),
      }),
    [collapsedOffset, moveTo, translateY],
  );

  // 닫아도 폼/추천/rank 상태는 보존한다(패널은 계속 마운트됨) → 다시 열면 이어서 진행.
  const handleClose = useCallback(() => {
    onClose();
  }, [onClose]);

  // 세션 종료(코스 채택 완료) 시에만 폼·추천 상태를 초기화한다.
  const resetPanel = useCallback(() => {
    setStep(0);
    setPhase("form");
    setRankIndex(0);
    resetForm();
    resetRecommend();
  }, [resetForm, resetRecommend]);

  const current = steps[step]!;
  const isFirst = step === 0;
  const isLast = step === steps.length - 1;

  // 현재 결과 단계에서 보고 있는 코스 (모두 건너뛰면 undefined)
  const currentCourse = recommendations[rankIndex];

  const handleBack = useCallback(() => {
    if (phase === "result") {
      // 결과 → 폼(마지막 단계)로 복귀
      setPhase("form");
      return;
    }
    if (isFirst) {
      handleClose();
    } else {
      setStep((prev) => prev - 1);
    }
  }, [handleClose, isFirst, phase]);

  useEffect(() => {
    if (!open) {
      return;
    }
    const subscription = BackHandler.addEventListener(
      "hardwareBackPress",
      () => {
        handleBack();
        return true;
      },
    );
    return () => subscription.remove();
  }, [handleBack, open]);

  const handleNext = () => {
    if (!isLast) {
      setStep((prev) => prev + 1);
      return;
    }
    if (recommendMutation.isPending) {
      return;
    }
    const payload = buildPayload();
    if (!payload) {
      return;
    }
    // ML ① 추천 API 호출 (POST /api/course → daily_recommendations)
    recommendMutation.mutate(payload, {
      onSuccess: () => {
        setRankIndex(0);
        setPhase("result");
      },
    });
  };

  // 결과 단계: 현재 코스 채택 → 서버에 저장(POST /api/course-selection).
  // 저장 성공 시 훅이 ["recommendations"] 쿼리를 무효화해 지도 태그·내 코스 목록이 최신화된다.
  const handleAdopt = () => {
    if (!currentCourse) {
      return;
    }
    courseSelection.mutate(Number(currentCourse.course_id), {
      onSuccess: () => showToast(t("plan.saved")),
      onError: () => showToast(t("plan.saveFailed")),
    });
    resetPanel();
    onClose();
  };

  // 추천을 모두 확인한 뒤 "닫기": 채택과 동일하게 세션을 종료(초기화)한다.
  // 다음에 열면 처음(폼)부터 새로 시작한다. (백드롭/뒤로가기는 저장 유지)
  const handleFinish = () => {
    resetPanel();
    onClose();
  };

  // 결과 단계: 건너뛰기 → 다음 rank
  const handleSkip = () => setRankIndex((prev) => prev + 1);
  // 결과 단계: 이전 → 앞서 건너뛴 rank로 되돌아간다(0에서 멈춤).
  const handlePrev = () => setRankIndex((prev) => Math.max(0, prev - 1));

  if (!visible) {
    return null;
  }

  return (
    <View
      pointerEvents="box-none"
      style={[styles.panelLayer, { top: insets.top }]}
      onLayout={handleLayout}
      accessibilityViewIsModal={false}
    >
      <Animated.View
        style={{
          height: sheetHeight,
          transform: [{ translateY }],
        }}
        className="absolute inset-x-0 bottom-0 overflow-hidden rounded-t-[20px] bg-bg shadow-md"
      >
        <View {...panResponder.panHandlers}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t("plan.collapse")}
            accessibilityState={{ expanded: true }}
            onPress={() => moveTo(false)}
            className="items-center pt-2 pb-1"
          >
            <View className="h-1 w-10 rounded-full bg-border" />
          </Pressable>

          <View className="flex-row items-center gap-2 px-4 py-3">
            {phase === "result" ? null : (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={
                  isFirst ? t("plan.closeHome") : t("plan.previousStep")
                }
                onPress={handleBack}
                className="-ml-1 rounded-full p-1 active:bg-surface-muted"
              >
                <ArrowLeft size={22} />
              </Pressable>
            )}
            <Text className="flex-1 text-heading-sm text-text">
              {phase === "result" ? t("plan.result.title") : current.title}
            </Text>
            {me?.profileImageUrl ? (
              <Image
                source={{ uri: me.profileImageUrl }}
                accessibilityIgnoresInvertColors
                cachePolicy="memory-disk"
                recyclingKey={me.profileImageUrl}
                transition={100}
                className="size-8 rounded-full border border-border"
              />
            ) : null}
            {phase === "result" ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t("plan.close")}
                onPress={handleClose}
                hitSlop={8}
                className="rounded-full p-1 active:bg-surface-muted"
              >
                <X size={20} />
              </Pressable>
            ) : null}
          </View>
        </View>

        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          className="flex-1"
        >
          <SafeAreaView edges={["bottom"]} className="flex-1">
            <ScrollView
              className="flex-1 px-4"
              contentContainerClassName="pb-4"
              keyboardShouldPersistTaps="handled"
            >
              {phase === "result" ? (
                currentCourse ? (
                  <ResultStep
                    course={currentCourse}
                    index={rankIndex}
                    total={recommendations.length}
                    onViewCourse={onViewCourse}
                  />
                ) : (
                  <View className="items-center justify-center gap-2 py-16">
                    <Text className="text-body-md text-text">
                      {t("plan.result.complete")}
                    </Text>
                    <Text className="text-center text-body-sm text-text-muted">
                      {t("plan.result.completeHint")}
                    </Text>
                  </View>
                )
              ) : (
                current.content
              )}
            </ScrollView>

            <View className="border-t border-border px-4 py-3">
              {phase === "result" ? (
                currentCourse ? (
                  <View className="gap-2">
                    {/* 이전/건너뛰기로 rank를 앞뒤로 브라우징. 이전은 첫 코스에서
                          비활성. 채택은 아래 전체폭 primary로 강조. */}
                    <View className="flex-row gap-2">
                      <Button
                        variant="secondary"
                        size="lg"
                        className="flex-1"
                        disabled={rankIndex === 0}
                        onPress={handlePrev}
                      >
                        {t("plan.previous")}
                      </Button>
                      <Button
                        variant="secondary"
                        size="lg"
                        className="flex-1"
                        onPress={handleSkip}
                      >
                        {t("plan.skip")}
                      </Button>
                    </View>
                    <Button
                      variant="primary"
                      size="lg"
                      className="w-full"
                      onPress={handleAdopt}
                    >
                      {t("plan.adopt")}
                    </Button>
                  </View>
                ) : (
                  // 모두 건너뛴 상태: 이전으로 되돌아가거나 닫는다.
                  // Button의 기본 너비를 직접 덮어쓰고 남은 영역을 정확히 반씩 나눈다.
                  <View className="flex-row gap-2">
                    {rankIndex > 0 ? (
                      <Button
                        variant="secondary"
                        size="lg"
                        style={styles.equalActionButton}
                        onPress={handlePrev}
                      >
                        {t("plan.previous")}
                      </Button>
                    ) : null}
                    <Button
                      variant="primary"
                      size="lg"
                      style={styles.equalActionButton}
                      onPress={handleFinish}
                    >
                      {t("plan.close")}
                    </Button>
                  </View>
                )
              ) : (
                <>
                  {recommendMutation.isError && (
                    <Text className="mb-2 text-center text-body-sm text-error">
                      {recommendMutation.error instanceof Error
                        ? recommendMutation.error.message
                        : t("plan.recommendFailed")}
                    </Text>
                  )}
                  <Button
                    variant="primary"
                    size="lg"
                    className="w-full"
                    disabled={!current.canNext || recommendMutation.isPending}
                    onPress={handleNext}
                  >
                    {isLast
                      ? recommendMutation.isPending
                        ? t("plan.recommending")
                        : t("plan.recommend")
                      : t("plan.next")}
                  </Button>
                </>
              )}
            </View>
          </SafeAreaView>
        </KeyboardAvoidingView>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  panelLayer: {
    position: "absolute",
    right: 0,
    bottom: 0,
    left: 0,
    overflow: "hidden",
  },
  equalActionButton: {
    flexBasis: 0,
    flexGrow: 1,
    width: 0,
  },
});
