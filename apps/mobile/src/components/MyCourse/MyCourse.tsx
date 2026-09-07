import { Button } from "@afterglow/ui-native";
import { useEffect } from "react";
import { ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { LoginPrompt } from "@/components/MyPage/LoginPrompt";
import { useAccessToken } from "@/hooks/use-access-token";
import { useRecommendations } from "@/hooks/use-recommendations";
import { clearAccessToken, UnauthorizedError } from "@/lib/auth";
import { useI18n } from "@/i18n/i18n-provider";

import { MyCourseSkeleton } from "./MyCourseSkeleton";
import { SavedCourseCard } from "./SavedCourseCard";

/**
 * 내 코스 컨테이너.
 * 흐름: 토큰 확인 → 없으면 로그인 안내 / 있으면 저장 코스 조회 후 렌더.
 * 토큰이 만료(401/403)면 토큰을 정리해 자동으로 로그인 화면으로 전환한다.
 *
 * TODO(PR 18): 현재 토큰이 스텁(항상 null)이라 항상 로그인 안내가 뜬다.
 * 인증 도입 후 저장 코스 리스트가 실제로 렌더된다.
 */
export function MyCourse() {
  const { t } = useI18n();
  const token = useAccessToken();
  const isAuthed = typeof token === "string";

  const {
    data: courses = [],
    isLoading,
    isError,
    error,
    refetch,
  } = useRecommendations(isAuthed);

  useEffect(() => {
    if (isError && error instanceof UnauthorizedError) {
      clearAccessToken();
    }
  }, [isError, error]);

  if (token === undefined) {
    return <MyCourseSkeleton />;
  }
  if (token === null) {
    return (
      <SafeAreaView edges={["top"]} className="flex-1 bg-bg">
        <LoginPrompt />
      </SafeAreaView>
    );
  }
  if (isLoading) {
    return <MyCourseSkeleton />;
  }

  // 네트워크/서버 오류 (인증 오류는 위 effect에서 로그인 화면으로 전환됨)
  if (isError) {
    return (
      <SafeAreaView edges={["top"]} className="flex-1 bg-bg">
        <View className="flex-1 items-center justify-center gap-4 px-6">
          <View className="items-center gap-2">
            <Text className="text-heading-sm text-text">
              {t("courses.loadFailed")}
            </Text>
            <Text className="text-body-sm text-text-secondary">
              {t("common.tryAgainLater")}
            </Text>
          </View>
          <Button variant="secondary" size="md" onPress={() => refetch()}>
            {t("common.retry")}
          </Button>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-bg">
      <ScrollView contentContainerClassName="gap-4 px-5 py-6">
        <Text className="text-heading-sm text-text">{t("courses.title")}</Text>

        {courses.length === 0 ? (
          <View className="items-center justify-center gap-2 py-24">
            <Text className="text-body-md text-text">{t("courses.empty")}</Text>
            <Text className="text-center text-body-sm text-text-muted">
              {t("courses.emptyDescription")}
            </Text>
          </View>
        ) : (
          courses.map((course) => (
            <SavedCourseCard key={course.selectionId} course={course} />
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
