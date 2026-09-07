import { colors } from "@afterglow/tokens";
import { Tabs } from "expo-router";
import { Home, LineSquiggle, MapPinned, User } from "lucide-react-native";

import { useI18n } from "@/i18n/i18n-provider";

/**
 * 하단 탭 네비게이션(홈/내 코스/내 정보).
 *
 * expo-router의 파일 기반 라우팅: 이 `(tabs)` 그룹의 각 화면 파일(index/my-course/
 * my-page)이 탭 하나가 된다. `(tabs)` 괄호 그룹은 URL 경로에 포함되지 않으므로
 * 홈은 그대로 `/`가 된다.
 *
 * 탭 색은 토큰에서 가져온다(활성=action-primary, 비활성=text-muted).
 * 아이콘은 lucide 셋(react-native 버전).
 */
export default function TabsLayout() {
  const { t } = useI18n();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors["action-primary"],
        tabBarInactiveTintColor: colors["text-muted"],
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t("tabs.home"),
          tabBarIcon: ({ color, size }) => <Home color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="tourism-info"
        options={{
          title: t("tabs.tourism"),
          tabBarIcon: ({ color, size }) => (
            <MapPinned color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="my-course"
        options={{
          title: t("tabs.courses"),
          tabBarIcon: ({ color, size }) => (
            <LineSquiggle color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="my-page"
        options={{
          title: t("tabs.profile"),
          tabBarIcon: ({ color, size }) => <User color={color} size={size} />,
        }}
      />
    </Tabs>
  );
}
