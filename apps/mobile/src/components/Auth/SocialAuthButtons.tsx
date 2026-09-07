import { ActivityIndicator, Pressable, Text, View } from "react-native";

import { useI18n } from "@/i18n/i18n-provider";

import { AppleIcon, GoogleIcon } from "./icons";

/** 어떤 소셜 로그인이 진행 중인지(스피너 표시 대상). null이면 유휴. */
export type SocialProvider = "google" | "apple";

interface SocialAuthButtonsProps {
  onGoogle: () => void;
  onApple: () => void;
  /** 진행 중인 소셜 로그인. 해당 버튼에 스피너 표시. */
  loadingProvider: SocialProvider | null;
  /** 이메일 폼 제출 등 다른 작업 중이면 소셜 버튼도 비활성화. */
  disabled?: boolean;
}

/**
 * "또는" 구분선 + 소셜 로그인 버튼(Google · Apple).
 * 로그인·회원가입 화면이 공유한다. 버튼 스타일은 ui-native Button과 톤을 맞추되,
 * 아이콘+텍스트 조합이라 커스텀 Pressable로 구성한다.
 */
export function SocialAuthButtons({
  onGoogle,
  onApple,
  loadingProvider,
  disabled = false,
}: SocialAuthButtonsProps) {
  const { t } = useI18n();

  return (
    <View className="gap-4">
      {/* "또는" 구분선 */}
      <View className="gap-3 flex-row items-center" accessibilityElementsHidden>
        <View className="bg-border h-px flex-1" />
        <Text className="text-body-xs text-text-muted">{t("login.or")}</Text>
        <View className="bg-border h-px flex-1" />
      </View>

      <View className="gap-3">
        {/* Google: 흰 배경 + 테두리(secondary 톤) */}
        <Pressable
          accessibilityRole="button"
          accessibilityState={{
            disabled: disabled || loadingProvider !== null,
            busy: loadingProvider === "google",
          }}
          disabled={disabled || loadingProvider !== null}
          onPress={onGoogle}
          className="gap-2 border-border bg-surface active:bg-surface-muted h-[48px] w-full flex-row items-center justify-center rounded-[8px] border"
        >
          {loadingProvider === "google" ? (
            <ActivityIndicator size="small" />
          ) : (
            <>
              <GoogleIcon />
              <Text className="text-label-lg text-text">
                {t("login.google")}
              </Text>
            </>
          )}
        </Pressable>

        {/* Apple: 검은 배경 + 흰 글자(Apple HIG 권장 스타일) */}
        <Pressable
          accessibilityRole="button"
          accessibilityState={{
            disabled: disabled || loadingProvider !== null,
            busy: loadingProvider === "apple",
          }}
          disabled={disabled || loadingProvider !== null}
          onPress={onApple}
          style={{ backgroundColor: "#000000" }}
          className="gap-2 h-[48px] w-full flex-row items-center justify-center rounded-[8px] active:opacity-80"
        >
          {loadingProvider === "apple" ? (
            <ActivityIndicator size="small" color="#ffffff" />
          ) : (
            <>
              <AppleIcon color="#ffffff" />
              <Text style={{ color: "#ffffff" }} className="text-label-lg">
                {t("login.apple")}
              </Text>
            </>
          )}
        </Pressable>
      </View>
    </View>
  );
}
