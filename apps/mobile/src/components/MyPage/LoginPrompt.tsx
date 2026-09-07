import { Button, Logo } from "@afterglow/ui-native";
import { useRouter } from "expo-router";
import { Text, View } from "react-native";

import { useI18n } from "@/i18n/i18n-provider";

/**
 * 로그아웃 상태에서 보여줄 로그인 안내(게이트) 화면.
 * 마이페이지·내 코스 탭이 미로그인일 때 공유한다. 실제 로그인/회원가입은 전용
 * 라우트(/login, /sign-up)에서 처리하므로, 여기선 그 화면으로 유도만 한다.
 */
export function LoginPrompt() {
  const { t } = useI18n();
  const router = useRouter();

  return (
    <View className="gap-8 bg-bg px-6 flex-1 items-center justify-center">
      <View className="gap-4 items-center">
        <Logo />
        <View className="items-center">
          <Text className="text-heading-sm text-text">
            {t("login.required")}
          </Text>
          <Text className="mt-2 text-body-sm text-text-secondary text-center">
            {t("login.description")}
          </Text>
        </View>
      </View>

      <Button
        variant="primary"
        size="lg"
        className="w-full max-w-[320px]"
        onPress={() => router.push("/login")}
      >
        {t("login.gateCta")}
      </Button>
    </View>
  );
}
