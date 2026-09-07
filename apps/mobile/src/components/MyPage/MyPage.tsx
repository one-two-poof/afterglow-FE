import { useToastStore } from "@afterglow/stores";
import { Button } from "@afterglow/ui-native";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { Alert, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useAccessToken } from "@/hooks/use-access-token";
import { useMe } from "@/hooks/use-me";
import { clearAccessToken, UnauthorizedError } from "@/lib/auth";
import { deleteMe } from "@/lib/me";
import { useI18n } from "@/i18n/i18n-provider";

import { LoginPrompt } from "./LoginPrompt";
import { MyPageSkeleton } from "./MyPageSkeleton";
import { ProfileHeader } from "./ProfileHeader";
import { SettingsList } from "./SettingsList";

/**
 * 내 정보 컨테이너.
 * 흐름: 토큰 확인 → 없으면 로그인 안내 / 있으면 내 정보 조회 후 렌더.
 * 토큰 만료(401/403)면 정리해 로그인 화면으로 전환.
 *
 * TODO(PR 18): 토큰 스텁(항상 null)이라 현재는 로그인 안내가 뜬다.
 */
export function MyPage() {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const showToast = useToastStore((state) => state.show);
  const token = useAccessToken();
  const isAuthed = typeof token === "string";

  const { data, isLoading, isError, error, refetch } = useMe(isAuthed);

  useEffect(() => {
    if (isError && error instanceof UnauthorizedError) {
      clearAccessToken();
    }
  }, [isError, error]);

  const handleLogout = () => {
    clearAccessToken();
    queryClient.removeQueries({ queryKey: ["me"] });
  };

  const deleteAccountMutation = useMutation({
    mutationFn: deleteMe,
    onSuccess: () => {
      clearAccessToken();
      showToast(t("account.deleted"));
    },
    onError: (mutationError) => {
      if (mutationError instanceof UnauthorizedError) {
        clearAccessToken();
        showToast(t("account.sessionExpired"));
        return;
      }
      showToast(t("account.deleteFailed"));
    },
  });

  const handleDeleteAccount = () => {
    if (deleteAccountMutation.isPending) return;

    Alert.alert(t("account.deleteTitle"), t("account.deleteMessage"), [
      { text: t("common.cancel"), style: "cancel" },
      {
        text: t("account.deleteConfirm"),
        style: "destructive",
        onPress: () => deleteAccountMutation.mutate(),
      },
    ]);
  };

  if (token === undefined) {
    return (
      <SafeAreaView edges={["top"]} className="flex-1 bg-bg">
        <MyPageSkeleton />
      </SafeAreaView>
    );
  }
  if (token === null) {
    return (
      <SafeAreaView edges={["top"]} className="flex-1 bg-bg">
        <LoginPrompt />
      </SafeAreaView>
    );
  }
  if (isLoading) {
    return (
      <SafeAreaView edges={["top"]} className="flex-1 bg-bg">
        <MyPageSkeleton />
      </SafeAreaView>
    );
  }

  // 네트워크/서버 오류 (인증 오류는 위 effect에서 로그인 화면으로 전환됨)
  if (isError || !data) {
    return (
      <SafeAreaView edges={["top"]} className="flex-1 bg-bg">
        <View className="flex-1 items-center justify-center gap-4 px-6">
          <View className="items-center gap-2">
            <Text className="text-heading-sm text-text">
              {t("profile.loadFailed")}
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
      <ScrollView>
        <ProfileHeader user={data} />
        <SettingsList
          onLogout={handleLogout}
          onDeleteAccount={handleDeleteAccount}
          isDeletingAccount={deleteAccountMutation.isPending}
        />
      </ScrollView>
    </SafeAreaView>
  );
}
