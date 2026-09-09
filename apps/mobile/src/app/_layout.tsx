import "../../global.css";

import * as Sentry from "@sentry/react-native";
import { Stack } from "expo-router";
import { View } from "react-native";

import { Toast } from "@/components/Toast";
import { initMonitoring } from "@/lib/monitoring";
import { AppProviders } from "@/providers/app-providers";

// 렌더 전에 초기화해야 부팅 중 발생한 에러도 잡힌다.
// DSN이 없으면 아무 일도 일어나지 않는다(로컬 개발 기본값).
initMonitoring(Sentry);

export default function RootLayout() {
  return (
    <AppProviders>
      {/* Toast가 화면 위에 겹치도록 flex 컨테이너로 감싼다(absolute 기준점) */}
      <View style={{ flex: 1 }}>
        <Stack screenOptions={{ headerShown: false }} />
        <Toast />
      </View>
    </AppProviders>
  );
}
