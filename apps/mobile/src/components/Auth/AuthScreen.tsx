import { colors } from "@afterglow/tokens";
import { Logo } from "@afterglow/ui-native";
import { useRouter } from "expo-router";
import { ChevronLeft } from "lucide-react-native";
import { type ReactNode } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useI18n } from "@/i18n/i18n-provider";

interface AuthScreenProps {
  title: string;
  /** 줄바꿈(\n) 포함 가능한 안내 문구. */
  subtitle: string;
  /** 폼·소셜 버튼 등 화면 본문. */
  children: ReactNode;
  /** 하단 전환 링크(로그인 ↔ 회원가입) 영역. */
  footer?: ReactNode;
}

/**
 * 로그인·회원가입 화면 공용 스캐폴드.
 * 상단 뒤로가기 → 로고 → 제목/부제 → 본문(children) → 하단 링크(footer) 순으로 배치하고,
 * 키보드가 올라올 때 입력 필드가 가려지지 않도록 KeyboardAvoidingView + ScrollView로 감싼다.
 * 루트 Stack이 headerShown:false라 뒤로가기 버튼을 직접 렌더한다.
 */
export function AuthScreen({
  title,
  subtitle,
  children,
  footer,
}: AuthScreenProps) {
  const router = useRouter();
  const { t } = useI18n();

  return (
    <SafeAreaView edges={["top", "bottom"]} className="bg-bg flex-1">
      <View className="px-2 py-2 flex-row items-center">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t("common.back")}
          onPress={() => router.back()}
          hitSlop={8}
          className="size-10 active:bg-surface-muted items-center justify-center rounded-full"
        >
          <ChevronLeft size={24} color={colors.text} />
        </Pressable>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        className="flex-1"
      >
        <ScrollView
          contentContainerClassName="grow px-6 pb-8"
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          showsVerticalScrollIndicator={false}
        >
          <View className="mt-2 gap-3 items-center">
            <Logo />
            <View className="gap-1.5 items-center">
              <Text className="text-heading-sm text-text">{title}</Text>
              <Text className="text-body-sm text-text-secondary text-center">
                {subtitle}
              </Text>
            </View>
          </View>

          <View className="mt-8 gap-5">{children}</View>

          {footer && (
            <View className="mt-8 flex-row items-center justify-center">
              {footer}
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
