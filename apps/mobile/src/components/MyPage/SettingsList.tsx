import { colors } from "@afterglow/tokens";
import { cn } from "@afterglow/utils";
import { type Href, useRouter } from "expo-router";
import { ChevronRight } from "lucide-react-native";
import { Pressable, Text, View } from "react-native";

import { useI18n } from "@/i18n/i18n-provider";

interface SettingsItem {
  key: string;
  title: string;
  description: string;
  /** 이동할 라우트 (있으면 탭 시 push) */
  href?: Href;
  onPress?: () => void;
  destructive?: boolean;
  /** 강조(액션) 색으로 표시 — 로그인하기 등 */
  accent?: boolean;
  disabled?: boolean;
}

/** 아이템 톤에 따른 텍스트/아이콘 색 */
function toneColor(item: SettingsItem) {
  if (item.destructive) return colors.error;
  if (item.accent) return colors["action-primary"];
  return colors["text-muted"];
}

function SettingsRow({
  item,
  isLast,
}: {
  item: SettingsItem;
  isLast: boolean;
}) {
  const router = useRouter();
  const handlePress = item.href ? () => router.push(item.href!) : item.onPress;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: item.disabled || !handlePress }}
      disabled={item.disabled || !handlePress}
      onPress={handlePress}
      className={cn(
        "flex-row items-center gap-3 px-5 py-4 active:bg-surface-muted",
        !isLast && "border-b border-border",
        item.disabled && "opacity-50",
      )}
    >
      <View className="flex-1">
        <Text
          className={cn(
            "text-label-lg",
            item.destructive && "text-error",
            item.accent && "text-action-primary",
            !item.destructive && !item.accent && "text-text",
          )}
        >
          {item.title}
        </Text>
        <Text className="mt-0.5 text-body-sm text-text-muted">
          {item.description}
        </Text>
      </View>
      <ChevronRight size={20} color={toneColor(item)} />
    </Pressable>
  );
}

function Group({ items }: { items: SettingsItem[] }) {
  return (
    <View className="bg-surface">
      {items.map((item, i) => (
        <SettingsRow
          key={item.key}
          item={item}
          isLast={i === items.length - 1}
        />
      ))}
    </View>
  );
}

/**
 * 설정 목록.
 * - 로그인 상태: 하단에 로그아웃 / 회원 탈퇴
 * - 미로그인 상태: 하단에 "로그인하기"(로그아웃과 같은 행 디자인, 강조색)
 */
export function SettingsList({
  isAuthed,
  onLogin,
  onLogout,
  onDeleteAccount,
  isDeletingAccount,
}: {
  isAuthed: boolean;
  onLogin: () => void;
  onLogout: () => void;
  onDeleteAccount: () => void;
  isDeletingAccount: boolean;
}) {
  const { t } = useI18n();
  const menuGroups: SettingsItem[][] = [
    [
      {
        key: "language",
        title: t("language.title"),
        description: t("language.description"),
        href: "/language",
      },
      {
        key: "support",
        title: t("settings.support"),
        description: t("settings.supportDescription"),
        href: "/support",
      },
      {
        key: "terms",
        title: t("settings.terms"),
        description: t("settings.termsDescription"),
        href: "/terms",
      },
    ],
  ];

  return (
    <View className="gap-2 bg-bg pb-8">
      {menuGroups.map((group, i) => (
        <Group key={i} items={group} />
      ))}
      {isAuthed ? (
        <Group
          items={[
            {
              key: "logout",
              title: t("settings.logout"),
              description: t("settings.logoutDescription"),
              onPress: onLogout,
              destructive: true,
            },
            {
              key: "delete-account",
              title: t("settings.deleteAccount"),
              description: isDeletingAccount
                ? t("settings.deletingAccount")
                : t("settings.deleteAccountDescription"),
              onPress: onDeleteAccount,
              destructive: true,
              disabled: isDeletingAccount,
            },
          ]}
        />
      ) : (
        <Group
          items={[
            {
              key: "login",
              title: t("settings.login"),
              description: t("settings.loginDescription"),
              onPress: onLogin,
              accent: true,
            },
          ]}
        />
      )}
    </View>
  );
}
