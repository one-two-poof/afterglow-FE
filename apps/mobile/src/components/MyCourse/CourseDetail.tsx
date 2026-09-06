import { Button } from "@afterglow/ui-native";
import { useRouter } from "expo-router";
import { ScrollView, Text, View } from "react-native";

import { ScreenHeader } from "@/components/ScreenHeader";
import { useAccessToken } from "@/hooks/use-access-token";
import { useRecommendations } from "@/hooks/use-recommendations";
import { useI18n } from "@/i18n/i18n-provider";
import { type CourseMarker, courseTitle } from "@/types/recommendation";

import { CourseItinerary } from "./CourseItinerary";
import { MyCourseSkeleton } from "./MyCourseSkeleton";

/** 코스를 찾지 못했을 때(캐시 없음/삭제됨 등)의 안내 화면. */
function NotFound() {
  const { t } = useI18n();
  const router = useRouter();
  return (
    <View className="flex-1 bg-bg">
      <ScreenHeader title={t("course.detail")} />
      <View className="flex-1 items-center justify-center gap-4 px-6">
        <View className="items-center gap-2">
          <Text className="text-heading-sm text-text">
            {t("course.notFound")}
          </Text>
          <Text className="text-center text-body-sm text-text-muted">
            {t("course.notFoundHint")}
          </Text>
        </View>
        <Button variant="secondary" size="md" onPress={() => router.back()}>
          {t("course.backToList")}
        </Button>
      </View>
    </View>
  );
}

/**
 * 저장된 코스 상세 화면. 헤더 + 제목 + 공통 CourseItinerary(요약·시술·타임라인).
 * 데이터는 목록 화면에서 이미 채워진 useRecommendations 캐시에서 selectionId로 찾는다.
 */
export function CourseDetail({ selectionId }: { selectionId: number }) {
  const { t } = useI18n();
  const router = useRouter();
  const token = useAccessToken();
  const isAuthed = typeof token === "string";
  const { data: courses = [], isLoading } = useRecommendations(isAuthed);

  const course = courses.find((c) => c.selectionId === selectionId);

  if (token === undefined || (isAuthed && isLoading && !course)) {
    return (
      <View className="flex-1 bg-bg">
        <ScreenHeader title={t("course.detail")} />
        <MyCourseSkeleton />
      </View>
    );
  }

  if (!course) {
    return <NotFound />;
  }

  const title = courseTitle(course);
  const openCourseMap = (marker?: CourseMarker) => {
    router.push({
      pathname: "/",
      params: {
        savedCourseId: String(course.selectionId),
        ...(marker
          ? {
              markerLat: String(marker.lat),
              markerLng: String(marker.lng),
              markerLabel: marker.label,
            }
          : {}),
      },
    });
  };

  return (
    <View className="flex-1 bg-bg">
      <ScreenHeader title={title} />
      <ScrollView contentContainerClassName="gap-4 px-5 py-5 pb-10">
        <Text className="text-heading-sm text-text">{title}</Text>
        <CourseItinerary
          course={course}
          onPlacePress={openCourseMap}
          summaryAction={
            <Button
              variant="secondary"
              size="lg"
              className="w-full"
              onPress={() => openCourseMap()}
            >
              {t("course.viewCourseOnMap")}
            </Button>
          }
        />
      </ScrollView>
    </View>
  );
}
